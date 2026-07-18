import { NextResponse } from 'next/server';
import { computeSaju } from '@/lib/saju';
import { buildSystem, buildUser, normalizeTone } from '@/lib/saju/llmPrompt';
import { guardAI, clampInt } from '@/lib/apiGuard';
import type { BirthInput } from '@/lib/saju/types';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req: Request) {
  const blocked = await guardAI(req, 'reading');
  if (blocked) return blocked;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'AI 심층 풀이는 API 키 설정이 필요합니다. 프로젝트 루트 .env.local 에 ANTHROPIC_API_KEY 를 넣어주세요.', needsKey: true },
      { status: 503 },
    );
  }

  let body: Partial<BirthInput> & { tier?: string; tone?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: '잘못된 요청' }, { status: 400 }); }
  if (!body.year || !body.month || !body.day) {
    return NextResponse.json({ error: '생년월일은 필수입니다.' }, { status: 400 });
  }

  const input: BirthInput = {
    year: clampInt(body.year, 1900, 2200, 2000),
    month: clampInt(body.month, 1, 12, 1),
    day: clampInt(body.day, 1, 31, 1),
    hour: body.unknownTime ? null : (body.hour == null ? null : clampInt(body.hour, 0, 23, 0)),
    minute: clampInt(body.minute ?? 0, 0, 59, 0),
    longitude: body.longitude ? Number(body.longitude) : undefined,
    sex: body.sex, unknownTime: !!body.unknownTime,
    name: body.name ? String(body.name).slice(0, 20) : undefined,
  };

  // 비용 원칙: AI 실시간 호출은 프리미엄 전용. 무료 티어 요청(구버전 캐시 클라이언트 포함)은 거절 → 클라가 규칙 풀이로 폴백.
  if (body.tier !== 'premium') {
    return NextResponse.json({ error: 'AI 심층 풀이는 프리미엄 전용입니다. 기본 풀이를 이용해 주세요.' }, { status: 402 });
  }

  const saju = computeSaju(input);
  const nowYear = new Date().getFullYear();
  const age = nowYear - input.year;
  const model = process.env.SAJU_MODEL || 'claude-sonnet-4-6';
  const maxTokens = 3000;

  let upstream: Response;
  try {
  upstream = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      temperature: 0.85,
      stream: true,
      // 프롬프트 캐싱: 시스템 프롬프트(톤별 3종뿐)는 유저가 달라도 동일 → 입력 비용 ~90% 절감
      system: [{ type: 'text', text: buildSystem(normalizeTone(body.tone)), cache_control: { type: 'ephemeral' } }],
      messages: [{ role: 'user', content: buildUser(saju, age, nowYear) }],
    }),
  });
  } catch {
    return NextResponse.json({ error: 'AI 서버에 연결하지 못했어요. 잠시 후 다시 시도해 주세요.' }, { status: 502 });
  }

  if (!upstream.ok || !upstream.body) {
    const t = await upstream.text().catch(() => '');
    return NextResponse.json({ error: `LLM 호출 실패 (${upstream.status}). ${t.slice(0, 200)}` }, { status: 502 });
  }

  // Anthropic SSE → text_delta 만 추출해 plain text 스트림으로 전달
  const reader = upstream.body.getReader();
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let buf = '';
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });
          const lines = buf.split('\n');
          buf = lines.pop() ?? '';
          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith('data:')) continue;
            const payload = trimmed.slice(5).trim();
            if (!payload || payload === '[DONE]') continue;
            try {
              const j = JSON.parse(payload);
              if (j.type === 'content_block_delta' && j.delta?.type === 'text_delta') {
                controller.enqueue(encoder.encode(j.delta.text));
              }
            } catch { /* 부분 청크 무시 */ }
          }
        }
      } catch (e) {
        controller.enqueue(encoder.encode('\n\n(스트림이 중단되었어요. 다시 시도해 주세요.)'));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-cache, no-transform' },
  });
}

import { NextResponse } from 'next/server';
import { computeSaju } from '@/lib/saju';
import { buildSystem, buildUser } from '@/lib/saju/llmPrompt';
import type { BirthInput } from '@/lib/saju/types';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'AI 심층 풀이는 API 키 설정이 필요합니다. 프로젝트 루트 .env.local 에 ANTHROPIC_API_KEY 를 넣어주세요.', needsKey: true },
      { status: 503 },
    );
  }

  let body: Partial<BirthInput> & { tier?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: '잘못된 요청' }, { status: 400 }); }
  if (!body.year || !body.month || !body.day) {
    return NextResponse.json({ error: '생년월일은 필수입니다.' }, { status: 400 });
  }

  const input: BirthInput = {
    year: Number(body.year), month: Number(body.month), day: Number(body.day),
    hour: body.unknownTime ? null : (body.hour ?? null) as number | null,
    minute: Number(body.minute ?? 0),
    longitude: body.longitude ? Number(body.longitude) : undefined,
    sex: body.sex, unknownTime: !!body.unknownTime,
    name: body.name ? String(body.name).slice(0, 20) : undefined,
  };

  const saju = computeSaju(input);
  const nowYear = new Date().getFullYear();
  const age = nowYear - input.year;
  // 티어별 모델: 무료=Haiku(저비용·빠름), 프리미엄=Sonnet(심층). 환경변수로 오버라이드 가능.
  const tier = body.tier === 'premium' ? 'premium' : 'free';
  const model = tier === 'premium'
    ? (process.env.SAJU_MODEL || 'claude-sonnet-4-6')
    : (process.env.SAJU_MODEL_FREE || 'claude-haiku-4-5-20251001');
  const maxTokens = tier === 'premium' ? 3000 : 2600;

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
      system: buildSystem(),
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

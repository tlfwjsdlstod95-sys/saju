import { NextResponse } from 'next/server';
import { computeSaju } from '@/lib/saju';
import { computeYearlyFortune } from '@/lib/saju/yearly';
import { buildYearlySystem, buildYearlyUser } from '@/lib/saju/llmPrompt';
import { guardAI, clampInt } from '@/lib/apiGuard';
import type { BirthInput } from '@/lib/saju/types';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req: Request) {
  const blocked = await guardAI(req, 'yearly');
  if (blocked) return blocked;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'AI 총평은 API 키 설정이 필요합니다. 프로젝트 루트 .env.local 에 ANTHROPIC_API_KEY 를 넣어주세요.', needsKey: true },
      { status: 503 },
    );
  }

  let body: Partial<BirthInput> & { year?: number };
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
    jasiMode: body.jasiMode === 'jeongja' ? 'jeongja' : undefined,
    name: body.name ? String(body.name).slice(0, 20) : undefined,
  };

  // 분석 대상 연도(올해/내년). 미지정 시 올해.
  const nowYear = new Date().getFullYear();
  const targetYear = Number((body as any).targetYear ?? nowYear);
  const safeYear = targetYear >= 1900 && targetYear <= 2200 ? targetYear : nowYear;

  const saju = computeSaju(input);
  const yearly = computeYearlyFortune(saju, safeYear);
  const age = nowYear - input.year;
  const model = process.env.SAJU_MODEL || 'claude-sonnet-4-6';

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
      max_tokens: 900,
      temperature: 0.8,
      stream: true,
      system: [{ type: 'text', text: buildYearlySystem(), cache_control: { type: 'ephemeral' } }], // 프롬프트 캐싱
      messages: [{ role: 'user', content: buildYearlyUser(saju, yearly, age) }],
    }),
  });
  } catch {
    return NextResponse.json({ error: 'AI 서버에 연결하지 못했어요. 잠시 후 다시 시도해 주세요.' }, { status: 502 });
  }

  if (!upstream.ok || !upstream.body) {
    const t = await upstream.text().catch(() => '');
    return NextResponse.json({ error: `LLM 호출 실패 (${upstream.status}). ${t.slice(0, 200)}` }, { status: 502 });
  }

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
      } catch {
        controller.enqueue(encoder.encode('\n\n(총평 스트림이 중단됐어요. 다시 시도해 주세요.)'));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-cache, no-transform' },
  });
}

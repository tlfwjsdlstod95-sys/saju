import { NextResponse } from 'next/server';
import { computeSaju } from '@/lib/saju';
import { computeCompatibility } from '@/lib/saju/compatibility';
import { buildGunghapSystem, buildGunghapUser } from '@/lib/saju/llmPrompt';
import { guardAI, clampInt } from '@/lib/apiGuard';
import type { BirthInput } from '@/lib/saju/types';

export const runtime = 'nodejs';
export const maxDuration = 60;

function parse(b: any): BirthInput {
  return {
    year: clampInt(b.year, 1900, 2200, 2000),
    month: clampInt(b.month, 1, 12, 1),
    day: clampInt(b.day, 1, 31, 1),
    hour: b.unknownTime ? null : (b.hour == null ? null : clampInt(b.hour, 0, 23, 0)),
    minute: clampInt(b.minute ?? 0, 0, 59, 0),
    longitude: b.longitude ? Number(b.longitude) : undefined,
    sex: b.sex, unknownTime: !!b.unknownTime,
    name: b.name ? String(b.name).slice(0, 20) : undefined,
  };
}

export async function POST(req: Request) {
  const blocked = await guardAI(req, 'gunghap');
  if (blocked) return blocked;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'AI 궁합 풀이는 API 키 설정이 필요합니다. .env.local 에 ANTHROPIC_API_KEY 를 넣어주세요.', needsKey: true }, { status: 503 });
  }
  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: '잘못된 요청' }, { status: 400 }); }
  if (!body?.a?.year || !body?.b?.year) {
    return NextResponse.json({ error: '두 사람의 생년월일이 필요합니다.' }, { status: 400 });
  }

  const sajuA = computeSaju(parse(body.a));
  const sajuB = computeSaju(parse(body.b));
  const compat = computeCompatibility(sajuA, sajuB);
  const model = process.env.SAJU_MODEL || 'claude-sonnet-4-6';

  let upstream: Response;
  try {
    upstream = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model, max_tokens: 2600, temperature: 0.85, stream: true,
        system: buildGunghapSystem(),
        messages: [{ role: 'user', content: buildGunghapUser(sajuA, sajuB, compat) }],
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
            const t = line.trim();
            if (!t.startsWith('data:')) continue;
            const p = t.slice(5).trim();
            if (!p || p === '[DONE]') continue;
            try { const j = JSON.parse(p); if (j.type === 'content_block_delta' && j.delta?.type === 'text_delta') controller.enqueue(encoder.encode(j.delta.text)); } catch {}
          }
        }
      } catch { controller.enqueue(encoder.encode('\n\n(스트림 중단. 다시 시도해 주세요.)')); }
      finally { controller.close(); }
    },
  });
  return new Response(stream, { headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-cache, no-transform' } });
}

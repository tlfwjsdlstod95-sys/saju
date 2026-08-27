import { NextResponse } from 'next/server';
import { computeSaju } from '@/lib/saju';
import { computeCompatibility } from '@/lib/saju/compatibility';
import { buildGunghapSystem, buildGunghapUser } from '@/lib/saju/llmPrompt';
import { guardAI, clampInt } from '@/lib/apiGuard';
import { pairId } from '@/lib/chartId';
import { checkEntitled, currentUid } from '@/lib/entitlement';
import { saveReport } from '@/lib/reports';
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

  // 이용권 검증 — 궁합은 '두 명식의 쌍'이 판매 단위 1건.
  // 단, 초대 링크로 들어온 첫 1회는 프로모션으로 무료 제공한다(바이럴 인센티브).
  const pair = pairId(body.a, body.b);
  const invite = body.invite === true || body.invite === 1 || body.invite === '1';
  let uid: string | null;
  if (invite) {
    uid = await currentUid();
  } else {
    const chk = await checkEntitled(pair);
    if (!chk.entitled) {
      return NextResponse.json(
        { error: '이 궁합의 AI 심층 풀이를 아직 구매하지 않으셨어요.', needsPurchase: true },
        { status: 402 },
      );
    }
    uid = chk.uid;
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
        system: [{ type: 'text', text: buildGunghapSystem(), cache_control: { type: 'ephemeral' } }], // 프롬프트 캐싱
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
  const nameA = String(body?.a?.name ?? '').trim() || 'A';
  const nameB = String(body?.b?.name ?? '').trim() || 'B';

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let buf = '';
      let full = '';   // 계정 보관용 전체 텍스트
      let broken = false;
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
            try {
              const j = JSON.parse(p);
              if (j.type === 'content_block_delta' && j.delta?.type === 'text_delta') {
                full += j.delta.text;
                controller.enqueue(encoder.encode(j.delta.text));
              }
            } catch {}
          }
        }
      } catch { broken = true; controller.enqueue(encoder.encode('\n\n(스트림 중단. 다시 시도해 주세요.)')); }
      finally {
        // 계정 보관 — 초대 무료분도 남긴다(다시 볼 때 AI를 또 호출하지 않아도 되므로 비용도 준다).
        if (!broken) {
          await saveReport({
            uid, kind: 'gunghap', chart: pair, variant: 'v1',
            title: `${nameA} × ${nameB} · 궁합 리포트`,
            meta: { name: nameA, partner: nameB, free: invite },
            body: full,
          });
        }
        controller.close();
      }
    },
  });
  return new Response(stream, { headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-cache, no-transform' } });
}

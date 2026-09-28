// 전환 이벤트 수집 — Upstash 에 날짜별 해시 카운터로만 쌓는다(개별 사용자 기록 없음).
//   ev:YYYY-MM-DD (KST)  →  필드 "이벤트" · "이벤트|src=출처" · "이벤트|키=값" · "이벤트|src=출처|키=값"
import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';
import { EVENTS, PARAM_VALUES, SRC_RE, kstDay, type EventName } from '@/lib/trackSpec';
import { guardCompute } from '@/lib/apiGuard';

export const runtime = 'nodejs';
const redis = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN ? Redis.fromEnv() : null;
const TTL = 400 * 24 * 3600;

export async function POST(req: Request) {
  const blocked = await guardCompute(req, 'ev', { windowMs: 60_000, max: 60 });
  if (blocked) return new NextResponse(null, { status: 204 });
  if (!redis) return new NextResponse(null, { status: 204 });
  let j: any;
  try { j = JSON.parse(await req.text()); } catch { return new NextResponse(null, { status: 204 }); }
  const e = j?.e as EventName;
  if (!e || !(e in EVENTS)) return new NextResponse(null, { status: 204 });
  const src = typeof j?.src === 'string' && SRC_RE.test(j.src) ? j.src : 'direct';
  const fields = [e, `${e}|src=${src}`];
  for (const k of EVENTS[e] as readonly string[]) {
    const v = j?.p?.[k];
    if (typeof v === 'string' && PARAM_VALUES[k]?.includes(v)) { fields.push(`${e}|${k}=${v}`, `${e}|src=${src}|${k}=${v}`); }
  }
  const key = `ev:${kstDay()}`;
  try {
    const p = redis.pipeline();
    for (const f of fields) p.hincrby(key, f, 1);
    p.expire(key, TTL);
    await p.exec();
  } catch {}
  return new NextResponse(null, { status: 204 });
}

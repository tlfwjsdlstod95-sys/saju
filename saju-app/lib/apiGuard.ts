// API 보호 유틸 — Upstash Redis 기반 레이트리밋(+ 로컬 인메모리 폴백) + 입력 클램프.
//
// Vercel 서버리스는 요청마다 다른 인스턴스로 분산되어, 인메모리 카운터는 제대로 동작하지
// 않습니다(실측: 12요청→12인스턴스). 그래서 인스턴스 간 공유되는 Upstash Redis로 제한합니다.
//
// 동작:
//  - 환경변수 UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN 이 있으면 Redis 기반(전역 정확).
//  - 없으면(로컬 개발 등) 인메모리 폴백으로 자동 전환(완벽하진 않지만 동작은 함).
//  - guardAI / guardCompute 는 async → 라우트에서 await 필요.

import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const hasUpstash = !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
const redis = hasUpstash ? Redis.fromEnv() : null;

// 설정별 Ratelimit 인스턴스 캐시 (생성 비용 절감)
const limiters = new Map<string, Ratelimit>();
function getLimiter(prefix: string, max: number, windowSec: number): Ratelimit | null {
  if (!redis) return null;
  const key = `${prefix}:${max}:${windowSec}`;
  let l = limiters.get(key);
  if (!l) {
    l = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(max, `${windowSec} s`),
      prefix: `hr:${prefix}`,
      analytics: false,
    });
    limiters.set(key, l);
  }
  return l;
}

/** 프록시 헤더에서 클라이언트 IP 추출 (Vercel: x-forwarded-for) */
export function getClientIp(req: Request): string {
  const xff = req.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0].trim();
  return req.headers.get('x-real-ip') || 'unknown';
}

export interface RateOpts { windowMs: number; max: number }

// ── 응답 헬퍼 ──
function tooMany(retryAfter: number): Response {
  return new Response(JSON.stringify({ error: '요청이 너무 많아요. 잠시 후 다시 시도해 주세요.' }), {
    status: 429,
    headers: { 'content-type': 'application/json', 'retry-after': String(Math.max(1, retryAfter)) },
  });
}
function dailyFull(): Response {
  return new Response(JSON.stringify({ error: '오늘은 무료 이용이 많아 잠시 제한됐어요. 잠시 후 다시 시도해 주세요.' }), {
    status: 429,
    headers: { 'content-type': 'application/json', 'retry-after': '600' },
  });
}

// ── 인메모리 폴백 (Upstash 미설정 시) ──
interface Bucket { count: number; reset: number }
const store = new Map<string, Bucket>();
let lastSweep = Date.now();
function sweep(now: number) {
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [k, b] of store) if (b.reset < now) store.delete(k);
}
export function rateLimit(key: string, opts: RateOpts): { ok: boolean; retryAfter: number } {
  const now = Date.now();
  sweep(now);
  const b = store.get(key);
  if (!b || b.reset < now) {
    store.set(key, { count: 1, reset: now + opts.windowMs });
    return { ok: true, retryAfter: 0 };
  }
  if (b.count >= opts.max) return { ok: false, retryAfter: Math.max(1, Math.ceil((b.reset - now) / 1000)) };
  b.count++;
  return { ok: true, retryAfter: 0 };
}
let dayKey = '';
let dayCount = 0;
export function bumpDailyCap(): boolean {
  const cap = Number(process.env.AI_DAILY_CAP || 2000);
  const today = new Date().toISOString().slice(0, 10);
  if (today !== dayKey) { dayKey = today; dayCount = 0; }
  if (dayCount >= cap) return false;
  dayCount++;
  return true;
}

/** 정수 클램프 — 비정상/범위 밖 입력 방어 */
export function clampInt(v: unknown, min: number, max: number, dflt: number): number {
  const n = Number(v);
  if (!Number.isFinite(n)) return dflt;
  return Math.min(max, Math.max(min, Math.round(n)));
}

/**
 * AI 라우트 공통 가드 (async). 통과하면 null, 막히면 Response.
 * 사용: const blocked = await guardAI(req, 'reading'); if (blocked) return blocked;
 */
export async function guardAI(req: Request, tag: string, opts: RateOpts = { windowMs: 60_000, max: 8 }): Promise<Response | null> {
  const ip = getClientIp(req);
  const windowSec = Math.max(1, Math.round(opts.windowMs / 1000));
  if (redis) {
    const rl = getLimiter(`ai_${tag}`, opts.max, windowSec)!;
    const res = await rl.limit(ip);
    if (!res.success) return tooMany(Math.ceil((res.reset - Date.now()) / 1000));
    const cap = Number(process.env.AI_DAILY_CAP || 2000);
    const day = getLimiter('ai_daily', cap, 86_400)!;
    const d = await day.limit('global');
    if (!d.success) return dailyFull();
    return null;
  }
  // 폴백
  const rl = rateLimit(`${tag}:${ip}`, opts);
  if (!rl.ok) return tooMany(rl.retryAfter);
  if (!bumpDailyCap()) return dailyFull();
  return null;
}

/** 비-LLM(연산) 라우트용 가드 (async) — 일일 상한 없이 레이트리밋만, 한도 넉넉 */
export async function guardCompute(req: Request, tag: string, opts: RateOpts = { windowMs: 60_000, max: 30 }): Promise<Response | null> {
  const ip = getClientIp(req);
  const windowSec = Math.max(1, Math.round(opts.windowMs / 1000));
  if (redis) {
    const rl = getLimiter(`cp_${tag}`, opts.max, windowSec)!;
    const res = await rl.limit(ip);
    if (!res.success) return tooMany(Math.ceil((res.reset - Date.now()) / 1000));
    return null;
  }
  const rl = rateLimit(`${tag}:${ip}`, opts);
  if (!rl.ok) return tooMany(rl.retryAfter);
  return null;
}

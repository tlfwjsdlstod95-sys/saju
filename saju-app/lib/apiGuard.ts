// API 보호 유틸 — 외부 의존성 0의 순수 TS.
// (1) IP별 인메모리 레이트리밋  (2) 전역 일일 호출 상한(비용 서킷브레이커)  (3) 입력 클램프
//
// ⚠️ 한계: Vercel 서버리스는 요청마다 다른 인스턴스로 갈 수 있어, 인메모리 카운터는
//    "인스턴스별"로만 동작합니다(완벽한 전역 제한 아님). 그래도 단일 어뷰저의 폭주를
//    크게 줄여줍니다. 트래픽이 커지면 Upstash Redis / Vercel KV 로 교체하세요.
//    교체 지점: rateLimit() / bumpDailyCap() 내부만 바꾸면 됩니다.

interface Bucket { count: number; reset: number }
const store = new Map<string, Bucket>();

let lastSweep = Date.now();
function sweep(now: number) {
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [k, b] of store) if (b.reset < now) store.delete(k);
}

/** 프록시 헤더에서 클라이언트 IP 추출 (Vercel: x-forwarded-for) */
export function getClientIp(req: Request): string {
  const xff = req.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0].trim();
  return req.headers.get('x-real-ip') || 'unknown';
}

export interface RateOpts { windowMs: number; max: number }
export interface RateResult { ok: boolean; retryAfter: number }

/** 슬라이딩(고정창) 레이트리밋. key 예: `reading:1.2.3.4` */
export function rateLimit(key: string, opts: RateOpts): RateResult {
  const now = Date.now();
  sweep(now);
  const b = store.get(key);
  if (!b || b.reset < now) {
    store.set(key, { count: 1, reset: now + opts.windowMs });
    return { ok: true, retryAfter: 0 };
  }
  if (b.count >= opts.max) {
    return { ok: false, retryAfter: Math.max(1, Math.ceil((b.reset - now) / 1000)) };
  }
  b.count++;
  return { ok: true, retryAfter: 0 };
}

// ── 전역 일일 호출 상한 (LLM 비용 차단용) ──
let dayKey = '';
let dayCount = 0;
/** 하루 총 AI 호출 상한. 환경변수 AI_DAILY_CAP(기본 2000) 초과 시 차단 */
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

// 표준 429 응답 본문
export const TOO_MANY = { error: '요청이 너무 많아요. 잠시 후 다시 시도해 주세요.' };
export const DAILY_FULL = { error: '오늘은 무료 이용이 많아 잠시 제한됐어요. 잠시 후 다시 시도해 주세요.' };

/**
 * AI 라우트 공통 가드. 통과하면 null, 막히면 Response 반환.
 * 사용: const blocked = guardAI(req, 'reading'); if (blocked) return blocked;
 */
export function guardAI(req: Request, tag: string, opts: RateOpts = { windowMs: 60_000, max: 8 }): Response | null {
  const ip = getClientIp(req);
  const rl = rateLimit(`${tag}:${ip}`, opts);
  if (!rl.ok) {
    return new Response(JSON.stringify(TOO_MANY), {
      status: 429,
      headers: { 'content-type': 'application/json', 'retry-after': String(rl.retryAfter) },
    });
  }
  if (!bumpDailyCap()) {
    return new Response(JSON.stringify(DAILY_FULL), {
      status: 429,
      headers: { 'content-type': 'application/json', 'retry-after': '600' },
    });
  }
  return null;
}

/** 비-LLM(연산) 라우트용 가벼운 가드 — 일일 상한 없이 레이트리밋만, 한도 넉넉 */
export function guardCompute(req: Request, tag: string, opts: RateOpts = { windowMs: 60_000, max: 30 }): Response | null {
  const ip = getClientIp(req);
  const rl = rateLimit(`${tag}:${ip}`, opts);
  if (!rl.ok) {
    return new Response(JSON.stringify(TOO_MANY), {
      status: 429,
      headers: { 'content-type': 'application/json', 'retry-after': String(rl.retryAfter) },
    });
  }
  return null;
}

'use client';
// 전환 이벤트 보내기 — 실패해도 화면에 아무 영향이 없어야 한다(조용히 버린다).
import { EVENTS, PARAM_VALUES, SRC_RE, LAST_BOUNDARY_KEY, LAST_PRODUCT_KEY, type EventName } from './trackSpec';

const SRC_KEY = 'heaarim_src_v1';
const OWNER_KEY = 'saju_owner_v1';
const SRC_TTL = 30 * 24 * 3600 * 1000;

function classify(ref: string): string {
  if (!ref) return 'direct';
  let h = '';
  try { h = new URL(ref).hostname.toLowerCase(); } catch { return 'other'; }
  if (h === location.hostname) return '';
  const map: [RegExp, string][] = [
    [/instagram\.com$/, 'instagram'], [/threads\.(net|com)$/, 'threads'], [/naver\.com$/, 'naver'],
    [/google\./, 'google'], [/daum\.net$|kakao\.com$/, 'kakao'], [/youtube\.com$|youtu\.be$/, 'youtube'],
    [/(^|\.)t\.co$|x\.com$|twitter\.com$/, 'x'], [/facebook\.com$/, 'facebook'], [/bing\.com$/, 'bing'],
  ];
  for (const [re, name] of map) if (re.test(h)) return name;
  return 'other';
}

/** 첫 방문 출처를 기억한다(레이아웃에서 페이지 로드마다 호출). 이미 있으면 덮지 않는다. */
export function rememberSource() {
  try {
    const raw = localStorage.getItem(SRC_KEY);
    if (raw) { const s = JSON.parse(raw); if (s?.t && Date.now() - s.t < SRC_TTL) return; }
    const utm = new URLSearchParams(location.search).get('utm_source')?.toLowerCase().trim() ?? '';
    const src = SRC_RE.test(utm) ? utm : classify(document.referrer);
    if (!src) return;   // 사이트 안에서 이동한 경우
    localStorage.setItem(SRC_KEY, JSON.stringify({ s: src, t: Date.now() }));
  } catch {}
}

function source(): string {
  try { const s = JSON.parse(localStorage.getItem(SRC_KEY) || 'null'); if (s?.s && SRC_RE.test(s.s)) return s.s; } catch {}
  return 'direct';
}

export function track(e: EventName, params: Record<string, string> = {}) {
  try {
    if (typeof window === 'undefined') return;
    if (localStorage.getItem(OWNER_KEY) === '1') return;   // 운영자 본인 테스트는 세지 않는다
    const allowed = EVENTS[e] as readonly string[];
    params = { ...params };
    // 결제 이벤트는 직전 명식의 경계 상태·상품을 자동으로 붙인다(토스 왕복 뒤에도 남도록 localStorage).
    if (allowed.includes('boundary') && !params.boundary) params.boundary = localStorage.getItem(LAST_BOUNDARY_KEY) ?? '';
    if (allowed.includes('product')) {
      if (params.product) localStorage.setItem(LAST_PRODUCT_KEY, params.product);
      else params.product = localStorage.getItem(LAST_PRODUCT_KEY) ?? '';
    }
    if (e === 'saju_complete' && params.boundary) localStorage.setItem(LAST_BOUNDARY_KEY, params.boundary);
    const p: Record<string, string> = {};
    for (const k of allowed) { const v = params[k]; if (v && PARAM_VALUES[k]?.includes(v)) p[k] = v; }
    const body = JSON.stringify({ e, p, src: source() });
    if (navigator.sendBeacon) navigator.sendBeacon('/api/ev', new Blob([body], { type: 'application/json' }));
    else void fetch('/api/ev', { method: 'POST', body, headers: { 'content-type': 'application/json' }, keepalive: true });
  } catch {}
}

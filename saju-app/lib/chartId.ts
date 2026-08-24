// 명식 1건을 식별하는 안정적인 키.
//
// 판매 단위 = "이 명식의 정밀 리포트 1건" 이다. 따라서 이용권도 계정 전체가 아니라
// 이 chartId 단위로 발급된다. (1회 결제 → 평생 무제한 구조는 카드사/PG 정책상 불가)
//
// 설계 원칙
// - 이름·말투(tone)·티어는 키에서 제외한다. 같은 사람이 이름만 고쳐 넣었다고
//   다시 결제하게 만들면 안 되기 때문.
// - 주문번호(orderId)에 그대로 실어야 하므로 영숫자 16자로 고정한다.
//   (토스 orderId 규칙: 영문·숫자·'-'·'_' 6~64자)

export interface ChartIdInput {
  year: number | string;
  month: number | string;
  day: number | string;
  hour?: number | string | null;
  minute?: number | string | null;
  sex?: string;
  longitude?: number | null;
  unknownTime?: boolean;
  jasiMode?: string;
}

const DEFAULT_LON = 126.978; // 서울

/** 해시 이전의 정규화 문자열. 디버깅·검증용으로 export 한다. */
export function chartCanonical(b: ChartIdInput): string {
  const noTime = !!b.unknownTime || b.hour === null || b.hour === undefined || b.hour === '';
  const h = noTime ? 'x' : String(Number(b.hour));
  const mi = noTime ? '0' : String(Number(b.minute ?? 0));
  const lon = Math.round((b.longitude ?? DEFAULT_LON) * 100);
  const jasi = b.jasiMode === 'jeongja' ? 'j' : 'y';
  return [Number(b.year), Number(b.month), Number(b.day), h, mi, b.sex ?? '', lon, jasi].join('|');
}

/** FNV-1a 32bit (시드 지정 가능) */
function fnv1a(s: string, seed: number): number {
  let h = seed >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

/** 32bit 두 개를 이어붙여 64bit 상당(16 hex). 충돌로 남의 이용권이 열리면 안 되므로 32bit는 쓰지 않는다. */
function hash16(s: string): string {
  const a = fnv1a(s, 0x811c9dc5);
  const b = fnv1a(s + '#2', 0x9dc5811c);
  return a.toString(16).padStart(8, '0') + b.toString(16).padStart(8, '0');
}

/** 명식 1건의 식별자 (16 hex) */
export function chartId(b: ChartIdInput): string {
  return hash16(chartCanonical(b));
}

/** 궁합은 두 명식의 '쌍'이 1건. 입력 순서가 바뀌어도 같은 값이 나온다. */
export function pairId(a: ChartIdInput, b: ChartIdInput): string {
  const [x, y] = [chartId(a), chartId(b)].sort();
  return hash16(x + ':' + y);
}

// ── 주문번호 ↔ 명식 ─────────────────────────────────────────────
// 별도 DB 마이그레이션 없이 이용권을 조회하기 위해, 어떤 명식에 대한 결제인지를
// 주문번호 자체에 새긴다. 결제 기록(saju_receipts.order_id)이 곧 이용권 증빙이 된다.
//
// 형식: saju-<chartId 16자>-<랜덤>
// ⚠️ 구분자로 '_'를 쓰면 안 된다. SQL LIKE 에서 '_'가 와일드카드라 조회가 헐거워진다.

export const ORDER_PREFIX = 'saju';

export function makeOrderId(chart: string): string {
  const rand = Math.random().toString(36).slice(2, 8) + Date.now().toString(36);
  return `${ORDER_PREFIX}-${chart}-${rand}`;
}

/** 주문번호에서 명식 id를 뽑는다. 형식이 아니면 null. */
export function chartFromOrderId(orderId: string): string | null {
  const m = /^saju-([0-9a-f]{16})-[0-9a-z]+$/i.exec(orderId || '');
  return m ? m[1].toLowerCase() : null;
}

/** 외부 입력(쿼리스트링 등)에서 받은 chart 값 정규화. 아니면 null. */
export function safeChartId(v: unknown): string | null {
  const s = String(v ?? '').toLowerCase();
  return /^[0-9a-f]{16}$/.test(s) ? s : null;
}

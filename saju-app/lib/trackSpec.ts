// 전환 계측 — 이벤트 이름과 파라미터의 **허용 목록**. 클라이언트와 서버가 같은 표를 쓴다.
//
// 원칙
//  - 생년월일시·이름·명식 id 는 절대 보내지 않는다. 값은 불리언·범주값만.
//  - 표에 없는 이벤트·파라미터·값은 서버가 버린다(자유 문자열이 쌓이지 않게).
//  - 합격선(마케팅자료 4-B): 시주/경계가 갈린 사람의 결제율이 안 갈린 사람의 2배 이상인가.
export const EVENTS = {
  saju_complete: ['has_hour', 'boundary'],   // 명식 계산 완료
  gunghap_complete: [],                      // 궁합 계산 완료
  gunghap_share: [],                         // 궁합 초대 링크 복사
  paywall_open: ['product', 'boundary'],     // 결제 안내창 열림
  pay_click: ['product', 'boundary'],        // 결제하기 버튼
  pay_success: ['product', 'boundary'],      // 토스 승인 완료
  pay_fail: ['product', 'boundary'],         // 결제 실패·취소 복귀
} as const;

export type EventName = keyof typeof EVENTS;

export const PARAM_VALUES: Record<string, readonly string[]> = {
  has_hour: ['y', 'n'],
  boundary: ['stable', 'changed', 'unknown'],   // 경계 진단: 네 기둥 그대로 / 어느 기둥이 갈림 / 시간 모름
  product: ['report', 'gunghap'],
};

/** 유입 출처 — 첫 방문 기준(30일). utm_source 가 있으면 그것, 없으면 referrer 로 분류. */
export const SRC_RE = /^[a-z0-9_-]{1,24}$/;

/** 결제 이벤트에 붙일 「직전 명식의 경계 상태」 저장 키 — 명식 자체는 저장하지 않는다. */
export const LAST_BOUNDARY_KEY = 'heaarim_last_boundary_v1';
/** 결제 이벤트에 붙일 상품 종류(토스 왕복 동안 유지). */
export const LAST_PRODUCT_KEY = 'heaarim_last_product_v1';

/** 한국 날짜 YYYY-MM-DD */
export function kstDay(d = new Date()): string {
  return new Date(d.getTime() + 9 * 3600 * 1000).toISOString().slice(0, 10);
}

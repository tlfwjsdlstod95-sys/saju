// 행운 오행 — '부적' 같은 **무료 화면**이 쓰는 최소 정보만 담는다.
//
// 왜 분리했나 (2026-09-02)
//   개운법(gaeun.ts)은 결제자 전용 콘텐츠(음식·활동·직업·소품·주의사항)라 서버에서만 계산한다.
//   그런데 무료인 행운 부적 카드도 '어떤 오행이 필요한가 / 그 색은 무엇인가' 는 알아야 한다.
//   그 최소한만 여기 두면, 무료 화면은 그대로 동작하면서 유료 처방은 클라이언트 번들에 실리지 않는다.
//   판정 로직이 두 벌이 되지 않도록 gaeun.ts 도 이 파일을 쓴다(단일 출처).

import { SAENG, GEUK, type Ohaeng } from './constants';

/** 오행별 색·방위 — 무료로 공개해도 되는 상식 수준의 상징 정보 */
export const OHAENG_LOOK: Record<Ohaeng, { color: string; colorHex: string; direction: string }> = {
  목: { color: '청록·초록', colorHex: '#22c55e', direction: '동쪽' },
  화: { color: '빨강·분홍', colorHex: '#ef4444', direction: '남쪽' },
  토: { color: '노랑·베이지·황토', colorHex: '#eab308', direction: '중앙·남서' },
  금: { color: '흰색·은·금', colorHex: '#e2e8f0', direction: '서쪽' },
  수: { color: '검정·남색·파랑', colorHex: '#3b82f6', direction: '북쪽' },
};

/**
 * 생활 처방에서 쓰는 '보완 오행'.
 * ⚠️ 격국·용신 엔진의 용신(computeYongsin)과는 다른, 단순 강약 기준의 실용 배정이다.
 *    두 값이 다를 수 있고, 그건 의도된 것이다(부적·색 추천은 강약만 본다).
 */
export function luckyOhaeng(dayO: Ohaeng, strength: number): Ohaeng {
  const generator = (Object.keys(SAENG) as Ohaeng[]).find((o) => SAENG[o] === dayO)!; // 인성
  if (strength < 0.45) return generator;
  if (strength > 0.55) return SAENG[dayO];  // 식상
  return GEUK[dayO];                        // 재성
}

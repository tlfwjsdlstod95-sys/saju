// 대운·세운 곡선 점 색 경계 — 의존성 0 (클라이언트 번들용).
// ⚠️ 신년운세 등급과 **같은 선**이다: good = 신년 「길」(60)↑, bad = 신년 「주의」(42 미만).
//    환산 = (신년 등급 − FAVOR_RULE.base 50) ÷ FAVOR_RULE.slope 0.4.
//    luck.ts·yearly.ts 를 import 하면 유료 계산 코드(yearly)와 절기 테이블이 클라이언트 번들에 끌려 들어가서 값을 직접 적었다.
//    두 상수가 어긋나면 scripts/test-luckres.ts ⑤ 가 깨진다.
export const LUCK_TONE = { good: 25, bad: -20 } as const;
export function luckTone(score: number): 'good' | 'bad' | 'mid' {
  return score >= LUCK_TONE.good ? 'good' : score < LUCK_TONE.bad ? 'bad' : 'mid';
}

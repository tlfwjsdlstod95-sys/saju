// 오행 길흉값(favor) → 점수 — 신년운세(yearly)·택일(auspicious)이 같이 쓰는 결정론 식 (2026-09-11 분리)
//
// ⚠️ 무작위·시드·jitter 없음. 예전 mapScore 는 시드로 ±3을 섞었다(같은 명식의 같은 달이 식과 다른 점수).
//    오늘의 운세에서 없앤 것과 같은 이유로 여기서도 없앴다 — 식을 공개하려면 식대로 나와야 한다.
// 화면의 「계산」칸은 favorFormula() 가 **이 상수에서** 문장을 만든다(손으로 쓴 식이 코드와 어긋나지 않게).
import { SAENG, GAN_OHAENG, JI_OHAENG, type Ohaeng } from './constants';
import { STRENGTH_CUT, strengthTier } from './elements';

export const FAVOR_RULE = {
  weak: STRENGTH_CUT.weak,     // 강약 점수 이 이하 → 신약: 비겁·인성이 돕는 쪽 (화면 라벨과 같은 상수)
  strong: STRENGTH_CUT.strong, // 이 이상 → 신강: 식상·재·관이 돕는 쪽
  weakHelp: 0.9, weakOther: -0.55,
  strongHelp: -0.55, strongOther: 0.9,
  midHelp: 0.4, midOther: -0.1,
  ganW: 0.4, jiW: 0.6,   // 기둥 = 천간 0.4 + 지지 0.6
  base: 50, slope: 0.4, min: 8, max: 96,
} as const;

/** 오행 하나가 일간에게 돕는 쪽인지(-0.55~+0.9). 비겁(같은 오행)·인성(나를 생함)을 '돕는 오행'으로 본다 */
export function favor(o: Ohaeng, dayO: Ohaeng, strength: number): number {
  const R = FAVOR_RULE;
  const helpful = o === dayO || SAENG[o] === dayO;
  const t = strengthTier(strength);
  if (t === 'weak') return helpful ? R.weakHelp : R.weakOther;
  if (t === 'strong') return helpful ? R.strongHelp : R.strongOther;
  return helpful ? R.midHelp : R.midOther;
}

/** 간지 한 기둥의 원점수(-55~+90) */
export function pillarRaw(gan: number, ji: number, dayO: Ohaeng, strength: number): number {
  return (FAVOR_RULE.ganW * favor(GAN_OHAENG[gan], dayO, strength) + FAVOR_RULE.jiW * favor(JI_OHAENG[ji], dayO, strength)) * 100;
}

/** 원점수 → 0~100 점수. 같은 입력이면 같은 점수 */
export function favorToScore(raw: number): number {
  const R = FAVOR_RULE;
  return Math.max(R.min, Math.min(R.max, Math.round(R.base + raw * R.slope)));
}

/** 「계산」칸 공통 세 줄 */
export function favorFormula(): string[] {
  const R = FAVOR_RULE;
  const s = (n: number) => (n > 0 ? `+${n}` : `−${-n}`);
  return [
    `오행 길흉값 = 명식의 신강약 라벨대로 — 신약(강약 ${R.weak} 이하)이면 비겁·인성 ${s(R.weakHelp)} / 나머지 ${s(R.weakOther)}, ` +
      `신강(${R.strong} 이상)이면 비겁·인성 ${s(R.strongHelp)} / 나머지 ${s(R.strongOther)}, 중화면 ${s(R.midHelp)} / ${s(R.midOther)}`,
    `원점수 = (천간 ${R.ganW} × 길흉값 + 지지 ${R.jiW} × 길흉값) × 100`,
    `점수 = ${R.base} + 원점수 × ${R.slope} (${R.min}~${R.max}로 자름) — 무작위 보정 없음`,
  ];
}

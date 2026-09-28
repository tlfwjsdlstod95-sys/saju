// 대운 요약 한 줄 (§E-5) — 「이 명식 9칸 안에서 점수가 가장 높은 10년」
//
// 의존성 0(타입만) — 클라이언트 화면이 luck.ts(절기 테이블·favor·daily)를 끌고 오지 않게 따로 뒀다.
// 규칙 (2026-09-23 승혁 확정):
//   · 단정 금지 — 「전성기」「인생에서 가장 좋은 운」 금지. 말하는 건 **곡선 안의 상대 위치**뿐이다.
//   · 동점이면 임의로 하나를 고르지 않는다 — 최고점이 둘 이상이면 전부 적는다(실측 약 6%).
//   · 원점수(−55 같은 숫자)는 문장에 넣지 않는다. 연령 구간과 순위만.
//   · 0 은 길흉이 아니라 **가점과 감점이 상쇄된 지점**이다 — 곡선 아래 칸을 「흉운」이라 부르지 않는다.
import type { LuckPillar } from './types';

export interface DecadeSpan { from: number; to: number; yearFrom: number; yearTo: number }
export interface DaewoonSummary {
  /** 점수가 가장 높은 칸(동점이면 전부) */
  peaks: DecadeSpan[];
  /** 지금 몇 번째로 높은 칸인가(1=가장 높음, 동점은 같은 순위). 지금이 곡선 밖(첫 대운 전·마지막 뒤)이면 null */
  current: (DecadeSpan & { rank: number }) | null;
  total: number;
  /** 지금 칸이 최고점 칸인가 */
  currentIsPeak: boolean;
}

const span = (d: LuckPillar): DecadeSpan => ({ from: d.age, to: d.age + 9, yearFrom: d.year, yearTo: d.year + 9 });

export function daewoonSummary(daewoon: LuckPillar[], nowYear: number): DaewoonSummary | null {
  if (!daewoon.length) return null;
  const max = Math.max(...daewoon.map((d) => d.score));
  const peaks = daewoon.filter((d) => d.score === max).map(span);
  const cur = daewoon.find((d) => nowYear >= d.year && nowYear <= d.year + 9) ?? null;
  // 경쟁 순위(1224식) — 동점은 같은 순위
  const rank = cur ? 1 + daewoon.filter((d) => d.score > cur.score).length : 0;
  return {
    peaks,
    current: cur ? { ...span(cur), rank } : null,
    total: daewoon.length,
    currentIsPeak: !!cur && cur.score === max,
  };
}

/** 화면 한 줄 — 연령 구간만(곡선 아래 라벨과 같은 대운 나이). 무료 카드 길이 규칙(하드 36자) 안 */
export function peakSentence(s: DaewoonSummary): string {
  const f = (p: DecadeSpan) => `${p.from}–${p.to}세`;
  if (s.peaks.length === 1) return `곡선에서 가장 높은 10년은 ${f(s.peaks[0])}입니다.`;
  if (s.peaks.length === 2) return `가장 높은 칸이 2개입니다: ${s.peaks.map(f).join(', ')}.`;
  // 셋 이상은 한 줄에 안 들어간다(하드 36자) — 문장과 목록을 두 줄로
  return `가장 높은 칸이 ${s.peaks.length}개입니다.\n${s.peaks.map(f).join(' · ')}`;
}

/** 지금 칸 한 줄 */
export function nowSentence(s: DaewoonSummary): string | null {
  if (!s.current) return null;
  const c = s.current;
  return s.currentIsPeak
    ? `지금 10년(${c.from}–${c.to}세)이 가장 높은 칸이에요.`
    : `지금 10년(${c.from}–${c.to}세)은 ${s.total}칸 중 ${c.rank}번째예요.`;
}

export const ZERO_SENTENCE = '점선 0은 길흉이 아니라 가점·감점이 상쇄된 자리예요.';
export const APPROX_SENTENCE = '출생 시각을 몰라 나이 경계는 ±1년 흔들릴 수 있어요.';

/** 「계산」칸 — luck.ts 의 식을 문장으로. 상수는 favor.ts 와 같다(scripts/test-luckres.ts 가 대조) */
export const LUCK_FORMULA = [
  '대운·세운 점수 = 오행 원점수 + 원국과의 관계 가감 ÷ 0.4 (−100~+100으로 자름)',
  '오행 원점수와 관계 표(합·충·형·해·원진)는 신년운세·오늘의 운세와 같습니다. 신년운세 해 점수 = 50 + 0.4 × 세운 점수',
  '일간 강약 기준입니다. 용신 판정은 쓰지 않습니다. 무작위 보정 없음',
  '0은 길흉이 아니라 가점과 감점이 상쇄된 지점입니다. 점 색: 초록 = 신년 「길」 이상에 해당, 빨강 = 「주의」에 해당',
] as const;

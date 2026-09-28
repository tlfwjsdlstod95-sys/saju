// 대운(大運) · 세운(歲運) 계산 + 일간 강약 기준 길흉지수(신년운세와 같은 식, 2026-09-23)
import {
  CHEONGAN, CHEONGAN_HANJA, JIJI, JIJI_HANJA,
  GAN_OHAENG, JI_OHAENG, GAN_EUMYANG, SAENG, GEUK,
  type Ohaeng,
} from './constants';
import { sipsin, jisipsin } from './elements';
import { pillarRaw, FAVOR_RULE } from './favor';
import { pillarRelations, relationSum } from './daily';
import { JIJANGGAN } from './constants';
import { solarTermKSTjd, sunLongitudeAtKST } from './solarTerms';
import type { LuckPillar, LuckResult, SajuCore } from './types';

/** 60갑자 인덱스 찾기 */
function ganzhiIndex(gan: number, ji: number): number {
  for (let i = 0; i < 60; i++) if (i % 10 === gan && i % 12 === ji) return i;
  return 0;
}

/**
 * 대운·세운 한 기둥의 길흉지수(-100~+100) — 2026-09-23 재작성 (카드사심사후_수정대기목록.md §E-8 ①)
 *
 * 예전 식은 이 파일에만 있던 `elementFavor`(오행 1개 → 값 2개) 가중합이라 **강약 구간당 점수가 4개뿐**이었다.
 *   실측(2,000명식): 대운 9칸 중 서로 다른 점수 중앙값 4 · 최고점 단독 14.8% · 중화는 25~40 전부 양수(곡선이 평평)
 *   그리고 신년운세(favor.ts)와 **표가 달라서** 같은 해 세운을 두 화면이 다르게 말했다(불일치 96%).
 *
 * 지금 식 = 신년운세 해 점수와 **같은 식**을 ±100 눈금으로 편 것:
 *   원점수 = favor.ts pillarRaw(오행 길흉값, 신년·택일과 같은 상수)
 *   관계   = daily.ts pillarRelations × 원국 네 기둥(합·충·형·해·원진, 오늘의 운세·신년운세와 같은 표)
 *   점수   = 원점수 + 관계 ÷ 0.4(FAVOR_RULE.slope)  (신년 점수 = 50 + 0.4 × 이 점수 — 눈금만 다르다)
 * 무작위 0. 용신은 쓰지 않는다(무료 화면 지표라 잠긴 판정을 기준으로 삼지 않는다 — §E-8 ②).
 */
function pillarScore(gan: number, ji: number, dayGan: number, strength: number, natal: SajuCore['pillars']): number {
  const raw = pillarRaw(gan, ji, GAN_OHAENG[dayGan], strength);
  const rel = relationSum(pillarRelations(gan, ji, natal));
  return Math.max(-100, Math.min(100, Math.round(raw + rel / FAVOR_RULE.slope)));
}

export { LUCK_TONE, luckTone } from './luckTone';

// 화면 「계산」칸 문장은 luckSummary.ts LUCK_FORMULA (클라이언트용, 의존성 0). 상수 대조는 scripts/test-luckres.ts.

function buildLuckPillar(
  gan: number, ji: number, dayGan: number, strength: number, age: number, year: number, natal: SajuCore['pillars'],
): LuckPillar {
  const jjg = JIJANGGAN[ji];
  return {
    age, year, gan, ji,
    ganKor: CHEONGAN[gan], jiKor: JIJI[ji],
    ganHanja: CHEONGAN_HANJA[gan], jiHanja: JIJI_HANJA[ji],
    ganOhaeng: GAN_OHAENG[gan], jiOhaeng: JI_OHAENG[ji],
    ganSipsin: sipsin(dayGan, gan),
    jiSipsin: jisipsin(dayGan, jjg.jeonggi.gan),
    score: pillarScore(gan, ji, dayGan, strength, natal),
  };
}

export interface LuckParams {
  birthKSTjd: number;
  birthYear: number; birthMonth: number; birthDay: number;
  yearGan: number;
  monthGan: number; monthJi: number;
  dayGan: number;
  strength: number;
  sex: 'M' | 'F';
  nowYear: number;
  /** 출생 시각 모름 — 起運을 근사로 표시한다 */
  timeUnknown?: boolean;
  /** 원국 네 기둥 — 대운·세운 × 원국 합충(점수 해상도, 2026-09-23) */
  natal: SajuCore['pillars'];
}

export function computeLuck(p: LuckParams): LuckResult {
  // --- 방향: 양남음녀 순행, 음남양녀 역행 ---
  const yangYear = GAN_EUMYANG[p.yearGan] === '양';
  const forward = (yangYear && p.sex === 'M') || (!yangYear && p.sex === 'F');

  // --- 대운수: 출생~인접 절(節)까지 일수 / 3 ---
  const lon = sunLongitudeAtKST(p.birthKSTjd);
  const k = Math.floor((lon - 15) / 30);
  const prevLon = ((15 + 30 * k) % 360 + 360) % 360;
  const nextLon = (prevLon + 30) % 360;
  const nextJd = solarTermKSTjd(nextLon, p.birthYear, p.birthMonth, p.birthDay);
  const prevJd = solarTermKSTjd(prevLon, p.birthYear, p.birthMonth, p.birthDay);
  //   ⚠️ 출생 순간은 **절대 순간**(민시 → 자오선·서머타임 → KST 환산)이다. 진태양시(경도·균시차)를 넣지 않는다 — 이중 보정.
  //   절입 시각은 월주를 가르는 것과 같은 solarTermKSTjd 다(test-daewoon 22번이 월지 경계와 대조).
  const daysToBoundary = Math.max(0, forward ? (nextJd - p.birthKSTjd) : (p.birthKSTjd - prevJd));
  const rawAge = daysToBoundary / 3;                          // 3일 = 1년, 시분까지
  const daewoonAge = Math.round(rawAge * 10) / 10;            // 표시용 소수 1자리(기존 필드)
  // 대운수(정수) — 다른 만세력과 비교되는 숫자라 정수 관행을 유지한다(0이면 1).
  //   ⚠️ 원값에서 **한 번만** 반올림한다. 예전엔 0.1 단위로 반올림한 값을 다시 반올림해
  //   원값 4.457 → 4.5 → 5 처럼 한 살 밀렸다(무작위 명식 3,000건 중 4.3%, 2026-09-10 test-daewoon 19번).
  const startAge = Math.max(1, Math.round(rawAge));

  // 起運 정밀 표시 — 3일=1년 · 1일=4개월 · 1시간=5일. 내부 값은 yearsFloat 가 정본.
  let qy = Math.floor(rawAge);
  let qm = Math.floor((rawAge - qy) * 12);
  let qd = Math.round(((rawAge - qy) * 12 - qm) * 30);
  if (qd >= 30) { qd -= 30; qm += 1; }
  if (qm >= 12) { qm -= 12; qy += 1; }
  const qiyun = {
    yearsFloat: rawAge, years: qy, months: qm, days: qd,
    deltaDays: daysToBoundary,
    targetJeolKSTjd: forward ? nextJd : prevJd,
    // 시각 모름이면 정오로 가정해 잰 값이라 ±12시간(=±4개월)까지 흔들린다
    approx: !!p.timeUnknown,
  };

  // --- 대운 60갑자 배열 (월주 기준 순/역) ---
  const monthIdx = ganzhiIndex(p.monthGan, p.monthJi);
  const daewoon: LuckPillar[] = [];
  for (let i = 1; i <= 9; i++) {
    const idx = ((forward ? monthIdx + i : monthIdx - i) % 60 + 60) % 60;
    const age = startAge + (i - 1) * 10;
    daewoon.push(buildLuckPillar(idx % 10, idx % 12, p.dayGan, p.strength, age, p.birthYear + age, p.natal));
  }

  // --- 세운: 올해부터 10년 ---
  const sewoon: LuckPillar[] = [];
  for (let y = p.nowYear; y < p.nowYear + 10; y++) {
    const idx = ((y - 4) % 60 + 60) % 60;
    sewoon.push(buildLuckPillar(idx % 10, idx % 12, p.dayGan, p.strength, y - p.birthYear, y, p.natal));
  }

  return { direction: forward ? '순행' : '역행', daewoonAge, startAge, qiyun, daewoon, sewoon };
}

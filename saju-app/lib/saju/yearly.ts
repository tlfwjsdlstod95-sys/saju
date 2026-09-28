// 신년운세 + 월별 길흉 캘린더 — 규칙 기반 결정론 엔진 (외부 의존 0, 클라이언트 안전)
// 핵심: 각 월의 15일은 항상 절입(節入) 이후라 월지가 그레고리력 월로 고정된다.
//       → VSOP/절기 계산 없이 월두법 상수만으로 12개월 월운을 정확히 도출.
//       점수는 favor.ts 의 결정론 식(무작위 0). 식은 결과의 formula 로 화면 「계산」칸에 그대로 나간다.
import {
  CHEONGAN, CHEONGAN_HANJA, JIJI, JIJI_HANJA,
  type Sipsin, type Ohaeng,
} from './constants';
import { sipsin } from './elements';
import { pillarRaw, favorToScore, favorFormula, FAVOR_RULE } from './favor';
import { pillarRelations, relationSum, relationTags, DAILY_RULE } from './daily';
import type { SajuResult } from './types';

// 월두법(月頭法/五虎遁): 년간별 인월(寅) 천간 시작 — index.ts 와 동일
const MONTH_STEM_START = [2, 4, 6, 8, 0, 2, 4, 6, 8, 0];

// 그레고리력 월(1~12) → 절기 월지(15일 기준 고정). 1월=축, 2월=인 … 12월=자
const MONTH_BRANCH = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 0];

type Grade = '대길' | '길' | '평' | '주의';
/** 등급 경계·기회/주의 달 기준 — 화면 「계산」칸과 같은 상수 */
export const YEARLY_RULE = {
  grade: { 대길: 76, 길: 60, 평: 42 },
} as const;
function gradeOf(score: number): Grade {
  const G = YEARLY_RULE.grade;
  return score >= G.대길 ? '대길' : score >= G.길 ? '길' : score >= G.평 ? '평' : '주의';
}

/** 신년운세 「계산」칸 — favor 공통 식 + 원국 관계 + 연·월 적용 규칙 */
export function yearlyFormula(): string[] {
  const Y = YEARLY_RULE, R = DAILY_RULE.rel;
  const sgn = (n: number) => (n > 0 ? `+${n}` : `−${-n}`);
  return [
    ...favorFormula().map((l) => l.replace(/^점수 = /, '오행 점수 = ')),
    `관계 가감 = 그 달 월주(그해는 세운) × 원국 네 기둥 — 합 ${sgn(R.합)} · 충 ${sgn(R.충)} · 삼형 완성 ${sgn(R.삼형완성)} · 형 ${sgn(R.형)} · 해 ${sgn(R.해)} · 원진 ${sgn(R.원진)}, ` +
      `원국 한 자리에 겹치면 가장 센 마찰 하나와 합만, 일간·일지 자리면 ×${DAILY_RULE.selfMul} (오늘의 운세와 같은 표)`,
    `달·해 점수 = 오행 점수 + 관계 가감 (${FAVOR_RULE.min}~${FAVOR_RULE.max}로 자름). 달 간지는 월두법, 1월은 전년 천간`,
    `등급 ${Y.grade.대길}↑ 대길 · ${Y.grade.길}↑ 길 · ${Y.grade.평}↑ 평 · 그 아래 주의`,
    `기회의 달 = 그해 12달 중 최고점인 달 전부 · 조심할 달 = 최저점인 달 전부. 동점을 임의로 자르지 않습니다`,
  ];
}

/** 간지 한 기둥의 점수 = 오행 점수(favor) + 원국과의 관계 가감 */
function pillarScore(gan: number, ji: number, dayOhaeng: Ohaeng, strength: number, P: SajuResult['pillars']) {
  const oheng = favorToScore(pillarRaw(gan, ji, dayOhaeng, strength));
  const rel = pillarRelations(gan, ji, P);
  const relations = relationSum(rel);
  const score = Math.max(FAVOR_RULE.min, Math.min(FAVOR_RULE.max, Math.round(oheng + relations)));
  return { score, parts: { oheng, relations }, tags: relationTags(rel) };
}

// 십신 → 그 달/해의 테마 한 줄
const SIPSIN_THEME: Record<Sipsin, string> = {
  비견: '사람·독립', 겁재: '경쟁·지출주의', 식신: '표현·여유', 상관: '재능·구설주의',
  편재: '기회·활동재', 정재: '안정·재물', 편관: '도전·압박', 정관: '책임·명예',
  편인: '공부·재정비', 정인: '문서·귀인',
};

export interface MonthFortune {
  month: number;       // 1~12 (그레고리력)
  label: string;       // '2026.06'
  ganji: string;       // 갑자
  ganjiHanja: string;  // 甲子
  sipsin: Sipsin;      // 월간의 일간 기준 십신
  theme: string;
  score: number;       // 0~100
  grade: Grade;
  /** 점수 분해 — 오행 점수 + 관계 가감 */
  parts: { oheng: number; relations: number };
  /** 그 달 월주 × 원국 관계 태그 */
  relations: string[];
}

export interface YearlyFortune {
  year: number;            // 그레고리력 연도(= 세운 기준 해)
  yearGanji: string;       // 병오
  yearGanjiHanja: string;  // 丙午
  yearSipsin: Sipsin;
  yearScore: number;
  yearGrade: Grade;
  yearParts: { oheng: number; relations: number };
  yearRelations: string[];
  headline: string;
  summary: string;
  months: MonthFortune[];
  bestMonths: number[];     // 점수 높은 달(최대 3)
  cautionMonths: number[];  // 점수 낮은 달(최대 2)
  /** 화면 「계산」칸 — 이 점수를 만든 식(코드와 같은 상수) */
  formula: string[];
}

export function computeYearlyFortune(r: SajuResult, year: number): YearlyFortune {
  const dayGan = r.dayMaster.gan;
  const dayOhaeng = r.dayMaster.ohaeng;
  const strength = r.dayMasterStrength;

  // --- 세운(연간) 간지: 입춘 기준 해. 연도 그대로 사용 ---
  const yIdx = ((year - 4) % 60 + 60) % 60;
  const yGan = yIdx % 10, yJi = yIdx % 12;
  const Y0 = pillarScore(yGan, yJi, dayOhaeng, strength, r.pillars);
  const yearScore = Y0.score;
  const yearGrade = gradeOf(yearScore);
  const yearSipsin = sipsin(dayGan, yGan);

  // --- 12개월 월운 ---
  const months: MonthFortune[] = [];
  for (let m = 1; m <= 12; m++) {
    const branch = MONTH_BRANCH[m - 1];
    // 1월은 입춘 전이라 전년도 세운 천간 기준, 2~12월은 해당 연도
    const sajuYear = m === 1 ? year - 1 : year;
    const yearStem = ((sajuYear - 4) % 10 + 10) % 10;
    const monthOrder = (branch - 2 + 12) % 12;          // 인월=0
    const mGan = (MONTH_STEM_START[yearStem] + monthOrder) % 10;
    const M = pillarScore(mGan, branch, dayOhaeng, strength, r.pillars);
    const score = M.score;
    const ss = sipsin(dayGan, mGan);
    months.push({
      month: m,
      label: `${year}.${String(m).padStart(2, '0')}`,
      ganji: `${CHEONGAN[mGan]}${JIJI[branch]}`,
      ganjiHanja: `${CHEONGAN_HANJA[mGan]}${JIJI_HANJA[branch]}`,
      sipsin: ss,
      theme: SIPSIN_THEME[ss],
      score,
      grade: gradeOf(score),
      parts: M.parts,
      relations: M.tags,
    });
  }

  // 기회·조심 = 그 사람의 12달 안에서 최고점·최저점인 달 **전부**. 절대 점수 컷(예전 58/44)은 쓰지 않는다 —
  //   중화 명식은 최저가 46이라 조심 달이 늘 비고, 신약은 28만 조심이 되는 식이었다.
  //   「차이가 작으면 없음」 규칙은 뺐다(2026-09-11) — 합충을 넣은 뒤 최소 차이가 41점이라 한 번도 걸리지 않는 죽은 가지였다.
  //   남는 가드는 12달이 전부 같은 점수인 퇴화 경우뿐(그땐 기회=조심이 되므로 둘 다 비운다).
  const scores = months.map((m) => m.score);
  const maxS = Math.max(...scores), minS = Math.min(...scores);
  const distinct = maxS > minS;
  const bestMonths = distinct ? months.filter((m) => m.score === maxS).map((m) => m.month) : [];
  const cautionMonths = distinct ? months.filter((m) => m.score === minS).map((m) => m.month) : [];

  const headline = ({
    대길: `${year}년, 크게 펼쳐도 좋은 해입니다.`,
    길: `${year}년, 흐름이 당신을 돕는 해입니다.`,
    평: `${year}년, 지키며 다지면 무난한 해입니다.`,
    주의: `${year}년, 욕심보다 내실을 챙길 해입니다.`,
  } as Record<Grade, string>)[yearGrade];

  const bestTxt = bestMonths.length ? `${bestMonths.join('·')}월에 기회가 열리고` : '큰 굴곡 없이 흐르고';
  const cautionTxt = cautionMonths.length ? `${cautionMonths.join('·')}월엔 무리한 결정을 피하세요.` : '특별히 조심할 달은 두드러지지 않습니다.';
  const summary = `올해의 큰 기운은 '${yearSipsin}(${SIPSIN_THEME[yearSipsin]})'입니다. ${bestTxt}, ${cautionTxt}`;

  return {
    year, yearGanji: `${CHEONGAN[yGan]}${JIJI[yJi]}`, yearGanjiHanja: `${CHEONGAN_HANJA[yGan]}${JIJI_HANJA[yJi]}`,
    yearSipsin, yearScore, yearGrade, yearParts: Y0.parts, yearRelations: Y0.tags, headline, summary,
    months, bestMonths, cautionMonths,
    formula: yearlyFormula(),
  };
}

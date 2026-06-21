// 신년운세 + 월별 길흉 캘린더 — 규칙 기반 결정론 엔진 (외부 의존 0, 클라이언트 안전)
// 핵심: 각 월의 15일은 항상 절입(節入) 이후라 월지가 그레고리력 월로 고정된다.
//       → VSOP/절기 계산 없이 월두법 상수만으로 12개월 월운을 정확히 도출.
import {
  CHEONGAN, CHEONGAN_HANJA, JIJI, JIJI_HANJA,
  GAN_OHAENG, JI_OHAENG, type Sipsin, type Ohaeng,
} from './constants';
import { sipsin } from './elements';
import { favor, mapScore } from './daily';
import type { SajuResult } from './types';

// 월두법(月頭法/五虎遁): 년간별 인월(寅) 천간 시작 — index.ts 와 동일
const MONTH_STEM_START = [2, 4, 6, 8, 0, 2, 4, 6, 8, 0];

// 그레고리력 월(1~12) → 절기 월지(15일 기준 고정). 1월=축, 2월=인 … 12월=자
const MONTH_BRANCH = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 0];

type Grade = '대길' | '길' | '평' | '주의';
function gradeOf(score: number): Grade {
  return score >= 76 ? '대길' : score >= 60 ? '길' : score >= 42 ? '평' : '주의';
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
}

export interface YearlyFortune {
  year: number;            // 그레고리력 연도(= 세운 기준 해)
  yearGanji: string;       // 병오
  yearGanjiHanja: string;  // 丙午
  yearSipsin: Sipsin;
  yearScore: number;
  yearGrade: Grade;
  headline: string;
  summary: string;
  months: MonthFortune[];
  bestMonths: number[];     // 점수 높은 달(최대 3)
  cautionMonths: number[];  // 점수 낮은 달(최대 2)
}

function pillarFavorScore(gan: number, ji: number, dayOhaeng: Ohaeng, strength: number, seed: number): number {
  const raw = (0.4 * favor(GAN_OHAENG[gan], dayOhaeng, strength) + 0.6 * favor(JI_OHAENG[ji], dayOhaeng, strength)) * 100;
  return mapScore(raw, seed);
}

export function computeYearlyFortune(r: SajuResult, year: number): YearlyFortune {
  const dayGan = r.dayMaster.gan;
  const dayOhaeng = r.dayMaster.ohaeng;
  const strength = r.dayMasterStrength;

  // --- 세운(연간) 간지: 입춘 기준 해. 연도 그대로 사용 ---
  const yIdx = ((year - 4) % 60 + 60) % 60;
  const yGan = yIdx % 10, yJi = yIdx % 12;
  const yearSeed = (year * 31 + dayGan * 7) >>> 0;
  const yearScore = pillarFavorScore(yGan, yJi, dayOhaeng, strength, yearSeed);
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
    const seed = (year * 100 + m) * 13 + dayGan;
    const score = pillarFavorScore(mGan, branch, dayOhaeng, strength, seed);
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
    });
  }

  const byScore = [...months].sort((a, b) => b.score - a.score);
  const bestMonths = byScore.filter((m) => m.score >= 58).slice(0, 3).map((m) => m.month).sort((a, b) => a - b);
  const cautionMonths = byScore.filter((m) => m.score <= 44).slice(-2).map((m) => m.month).sort((a, b) => a - b);

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
    yearSipsin, yearScore, yearGrade, headline, summary,
    months, bestMonths, cautionMonths,
  };
}

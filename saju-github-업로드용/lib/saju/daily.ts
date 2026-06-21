// 오늘의 운세(일일운) — 규칙 기반 결정론 엔진
// 오늘 일진(日辰)을 사용자 일간·신강약에 대입해 총운/카테고리/행운을 즉시 계산한다. (외부 의존 0)
import {
  CHEONGAN, CHEONGAN_HANJA, JIJI, JIJI_HANJA, JIJI_ANIMAL,
  GAN_OHAENG, JI_OHAENG, SAENG, GEUK, type Ohaeng,
} from './constants';
import { sipsin } from './elements';
import { gregorianToJDN } from './astro';
import type { SajuResult } from './types';

type SipsinGroup = '비겁' | '식상' | '재성' | '관성' | '인성';

/** 어떤 오행 o가 일간 오행 dayO에 대해 어떤 십신 그룹인지 */
function group(o: Ohaeng, dayO: Ohaeng): SipsinGroup {
  if (o === dayO) return '비겁';
  if (SAENG[o] === dayO) return '인성';      // o가 나를 생함
  if (SAENG[dayO] === o) return '식상';      // 내가 o를 생함
  if (GEUK[dayO] === o) return '재성';       // 내가 o를 극함
  return '관성';                              // o가 나를 극함 (GEUK[o]===dayO)
}

/** 오행 하나가 오늘 일간에게 길한지(-0.55~+0.9). luck.ts 의 elementFavor 와 동일 철학. */
export function favor(o: Ohaeng, dayO: Ohaeng, strength: number): number {
  const helpful = o === dayO || SAENG[o] === dayO; // 비겁 or 인성
  if (strength < 0.45) return helpful ? 0.9 : -0.55;
  if (strength > 0.55) return helpful ? -0.55 : 0.9;
  return helpful ? 0.4 : -0.1; // 중화: 완만한 등락
}

const clamp = (n: number, lo = 5, hi = 99) => Math.max(lo, Math.min(hi, Math.round(n)));
/** 같은 날 같은 사주는 항상 같은 값이 되도록 결정론적 미세 변동(-3~+3) */
const jitter = (seed: number) => (seed % 7) - 3;
/** favor 점수공간(대략 -100~160)을 0~100 점수로 완만하게 매핑 */
export const mapScore = (fscore: number, seed: number) => clamp(50 + fscore * 0.4 + jitter(seed), 8, 96);

export interface DailyCategory {
  key: 'love' | 'money' | 'work' | 'health';
  label: string; emoji: string; score: number; msg: string;
}

export interface DailyFortune {
  dateLabel: string;        // 2026.06.21 (토)
  iljinKor: string;         // 병오
  iljinHanja: string;       // 丙午
  animal: string;           // 말
  todaySipsin: string;      // 오늘 천간의 일간 기준 십신
  total: number;            // 0~100
  grade: '대길' | '길' | '평' | '주의';
  headline: string;
  advice: string;
  categories: DailyCategory[];
  lucky: { element: Ohaeng; color: string; colorHex: string; number: number; direction: string };
}

const WEEKDAY = ['일', '월', '화', '수', '목', '금', '토'];

const ELEMENT_META: Record<Ohaeng, { color: string; hex: string; dir: string; nums: number[] }> = {
  목: { color: '청록색', hex: '#22c55e', dir: '동쪽', nums: [3, 8] },
  화: { color: '빨간색', hex: '#ef4444', dir: '남쪽', nums: [2, 7] },
  토: { color: '노란색', hex: '#eab308', dir: '중앙', nums: [5, 10] },
  금: { color: '흰색', hex: '#e2e8f0', dir: '서쪽', nums: [4, 9] },
  수: { color: '검정·파랑', hex: '#3b82f6', dir: '북쪽', nums: [1, 6] },
};

/** 신강약에 따른 '오늘 도움이 되는 오행'(용신 프록시) */
function luckyElement(dayO: Ohaeng, strength: number): Ohaeng {
  const generator = (Object.keys(SAENG) as Ohaeng[]).find((o) => SAENG[o] === dayO)!; // 인성
  const output = SAENG[dayO];   // 식상
  const wealth = GEUK[dayO];    // 재성
  if (strength < 0.45) return generator; // 신약 → 나를 돕는 인성
  if (strength > 0.55) return output;     // 신강 → 기운을 빼주는 식상
  return wealth;                          // 중화 → 재성
}

function pick<T>(arr: T[], seed: number): T { return arr[seed % arr.length]; }

function catMsg(key: DailyCategory['key'], score: number, seed: number): string {
  const band = score >= 75 ? 'hi' : score >= 50 ? 'mid' : 'lo';
  const M: Record<string, Record<string, string[]>> = {
    love: {
      hi: ['먼저 연락해도 좋은 날. 마음이 통합니다.', '오늘 만남엔 호감이 따라붙어요. 표현하세요.'],
      mid: ['욕심내기보단 가볍게. 자연스러운 흐름이 좋아요.', '들이대기보단 들어주는 게 점수 따는 날.'],
      lo: ['오늘은 한 박자 쉬어요. 말보다 침묵이 안전합니다.', '서운함은 내일 얘기하세요. 오늘은 오해 사기 쉬워요.'],
    },
    money: {
      hi: ['들어올 돈이 보이는 날. 받을 건 챙기세요.', '작은 기회가 돈으로 연결됩니다. 눈여겨보세요.'],
      mid: ['큰 지출은 미루고 현상 유지. 무난합니다.', '충동구매만 조심하면 평온한 재물운.'],
      lo: ['지갑 단속하는 날. 큰 결정·투자는 미루세요.', '오늘 빌려주는 돈은 돌아오기 어렵습니다.'],
    },
    work: {
      hi: ['집중력이 좋은 날. 미뤘던 일을 끝내기 딱.', '인정받을 일이 생깁니다. 한 발 더 나서세요.'],
      mid: ['평소 페이스 유지가 정답. 무리수는 자제.', '새 일보단 마무리에 힘쓰면 좋은 날.'],
      lo: ['실수 나오기 쉬운 날. 두 번 확인하세요.', '오늘은 벌이기보단 지키는 날. 천천히.'],
    },
    health: {
      hi: ['에너지가 넘칩니다. 미뤘던 운동 시작하기 좋아요.', '몸이 가벼운 날. 컨디션을 잘 활용하세요.'],
      mid: ['무난하지만 과로는 금물. 쉬엄쉬엄.', '평범한 컨디션. 수분과 끼니만 챙기세요.'],
      lo: ['무리하면 탈 나는 날. 일찍 자고 따뜻하게.', '피로가 쌓였어요. 오늘만큼은 나를 아끼세요.'],
    },
  };
  return pick(M[key][band], seed);
}

function headlineFor(grade: DailyFortune['grade'], seed: number): string {
  const H: Record<string, string[]> = {
    대길: ['오늘, 흐름이 당신 편입니다.', '망설였다면 오늘 움직이세요.'],
    길: ['나쁘지 않아요. 한 발 내디뎌도 좋은 날.', '잔잔하게 좋은 기운이 들어옵니다.'],
    평: ['튀지 않게, 평소처럼이 정답인 날.', '큰 욕심만 내려놓으면 무난합니다.'],
    주의: ['오늘은 지키는 날. 벌이지 마세요.', '한 박자 쉬어가면 손해 볼 일 없습니다.'],
  };
  return pick(H[grade], seed);
}

function adviceFor(lucky: DailyFortune['lucky'], grade: DailyFortune['grade']): string {
  const head = grade === '주의' ? '오늘은 욕심을 줄이고, ' : '오늘의 흐름을 살리려면, ';
  return `${head}행운의 색 ${lucky.color}을 가까이 두고 ${lucky.direction}을 활용해 보세요.`;
}

/**
 * 오늘의 운세 계산.
 * @param r  이미 계산된 사주 결과(일간·신강약·성별 사용)
 * @param date 기준 날짜(기본: 오늘). 로컬 달력일 기준 일진.
 */
export function computeDailyFortune(r: SajuResult, date: Date = new Date()): DailyFortune {
  const y = date.getFullYear(), mo = date.getMonth() + 1, d = date.getDate();
  const jdn = gregorianToJDN(y, mo, d);
  const idx = ((jdn + 49) % 60 + 60) % 60;
  const tGan = idx % 10, tJi = idx % 12;
  const ganO = GAN_OHAENG[tGan], jiO = JI_OHAENG[tJi];

  const dayGan = r.dayMaster.gan;
  const dayO = r.dayMaster.ohaeng;
  const strength = r.dayMasterStrength;
  const sex = r.input.sex ?? 'M';

  // 일자 고정 시드(같은 날 같은 사주는 항상 같은 문구)
  const seed = (jdn + dayGan * 7 + tJi * 13) >>> 0;

  // 천간 0.4 / 지지 0.6 가중 → 총운 favor 점수(-100~90) → 0~100
  const raw = (0.4 * favor(ganO, dayO, strength) + 0.6 * favor(jiO, dayO, strength)) * 100;
  const total = mapScore(raw, seed);
  const grade: DailyFortune['grade'] = total >= 78 ? '대길' : total >= 60 ? '길' : total >= 42 ? '평' : '주의';

  // 카테고리: 오늘 두 오행의 십신 그룹/길흉을 카테고리 타깃에 반영
  const elems: { o: Ohaeng; w: number }[] = [{ o: ganO, w: 0.4 }, { o: jiO, w: 0.6 }];
  function catScore(targets: SipsinGroup[], catSeed: number): number {
    let acc = raw;
    for (const e of elems) {
      if (targets.includes(group(e.o, dayO))) acc += favor(e.o, dayO, strength) * 110 * e.w;
    }
    return mapScore(acc, catSeed);
  }
  const loveTargets: SipsinGroup[] = sex === 'M' ? ['재성', '식상'] : ['관성', '식상'];
  const specs: { key: DailyCategory['key']; label: string; emoji: string; targets: SipsinGroup[] }[] = [
    { key: 'love', label: '애정', emoji: '❤', targets: loveTargets },
    { key: 'money', label: '재물', emoji: '🪙', targets: ['재성', '식상'] },
    { key: 'work', label: '일·공부', emoji: '📈', targets: ['관성', '인성'] },
    { key: 'health', label: '건강', emoji: '🌿', targets: ['비겁', '인성'] },
  ];
  const categories: DailyCategory[] = specs.map((s, i) => {
    const score = catScore(s.targets, seed + i + 1);
    return { key: s.key, label: s.label, emoji: s.emoji, score, msg: catMsg(s.key, score, seed + s.label.length) };
  });

  const le = luckyElement(dayO, strength);
  const meta = ELEMENT_META[le];
  const lucky = { element: le, color: meta.color, colorHex: meta.hex, number: pick(meta.nums, seed), direction: meta.dir };

  return {
    dateLabel: `${y}.${String(mo).padStart(2, '0')}.${String(d).padStart(2, '0')} (${WEEKDAY[date.getDay()]})`,
    iljinKor: `${CHEONGAN[tGan]}${JIJI[tJi]}`,
    iljinHanja: `${CHEONGAN_HANJA[tGan]}${JIJI_HANJA[tJi]}`,
    animal: JIJI_ANIMAL[tJi],
    todaySipsin: sipsin(dayGan, tGan),
    total, grade,
    headline: headlineFor(grade, seed),
    advice: adviceFor(lucky, grade),
    categories,
    lucky,
  };
}

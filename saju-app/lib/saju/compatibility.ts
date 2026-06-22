// 궁합(상성) 계산 — 천간합 · 지지 육합/삼합/충 · 오행 상호보완 · 강약 균형
import { GAN_OHAENG, JI_OHAENG, SAENG, GEUK, type Ohaeng } from './constants';
import type { SajuResult } from './types';

// 천간합: 갑기 을경 병신 정임 무계
const GAN_HAP: [number, number][] = [[0, 5], [1, 6], [2, 7], [3, 8], [4, 9]];
// 지지 육합: 자축 인해 묘술 진유 사신 오미
const YUKHAP: [number, number][] = [[0, 1], [2, 11], [3, 10], [4, 9], [5, 8], [6, 7]];
// 지지 삼합 그룹
const SAMHAP: number[][] = [[8, 0, 4], [11, 3, 7], [2, 6, 10], [5, 9, 1]];

const pairMatch = (pairs: [number, number][], a: number, b: number) =>
  pairs.some(([x, y]) => (a === x && b === y) || (a === y && b === x));
const inSamhap = (a: number, b: number) => a !== b && SAMHAP.some((g) => g.includes(a) && g.includes(b));
const isChung = (a: number, b: number) => Math.abs(a - b) === 6;

export interface CompatItem {
  label: string;
  score: number;   // 해당 항목 획득 점수
  max: number;
  comment: string;
}

export interface CompatResult {
  total: number;          // 0~100
  tier: string;           // 천생연분 / 좋은 인연 / 무난한 사이 / 노력이 필요한 인연
  headline: string;
  items: CompatItem[];
  strengths: string[];
  cautions: string[];
}

function relWord(o1: Ohaeng, o2: Ohaeng): 'same' | 'saeng' | 'geuk' {
  if (o1 === o2) return 'same';
  if (SAENG[o1] === o2 || SAENG[o2] === o1) return 'saeng';
  if (GEUK[o1] === o2 || GEUK[o2] === o1) return 'geuk';
  return 'saeng';
}

export function computeCompatibility(a: SajuResult, b: SajuResult): CompatResult {
  const ga = a.pillars.day.gan, gb = b.pillars.day.gan;
  const ja = a.pillars.day.ji, jb = b.pillars.day.ji;
  const oa = GAN_OHAENG[ga], ob = GAN_OHAENG[gb];
  const strengths: string[] = [];
  const cautions: string[] = [];

  // 1) 일간 관계 (30)
  let s1 = 20, c1 = '서로의 개성을 존중하면 무난한 관계예요.';
  if (pairMatch(GAN_HAP, ga, gb)) {
    s1 = 30; c1 = '두 일간이 천간합(天干合) — 본능적으로 끌리고 잘 맞는 짝이에요.';
    strengths.push('일간이 합(合)을 이뤄 자연스러운 끌림이 있어요');
  } else {
    const rel = relWord(oa, ob);
    if (rel === 'saeng') { s1 = 26; c1 = '오행이 상생(相生) — 서로를 키워주는 응원형 관계예요.'; strengths.push('서로의 기운을 북돋는 상생 관계'); }
    else if (rel === 'same') { s1 = 24; c1 = '같은 오행 — 가치관과 템포가 비슷해 편안해요.'; strengths.push('비슷한 성향으로 편안함'); }
    else { s1 = 15; c1 = '오행이 상극(相剋) — 자극과 긴장이 공존하니 대화가 핵심이에요.'; cautions.push('일간이 극(剋) 관계라 갈등 시 거리 조절 필요'); }
  }

  // 2) 일지 관계 (30)
  let s2 = 21, c2 = '큰 충돌 없이 무난한 지지 관계예요.';
  if (inSamhap(ja, jb)) { s2 = 30; c2 = '일지가 삼합(三合) — 함께하면 시너지가 큰 환상의 조합이에요.'; strengths.push('일지 삼합으로 팀워크가 좋음'); }
  else if (pairMatch(YUKHAP, ja, jb)) { s2 = 29; c2 = '일지가 육합(六合) — 둘만의 안정적인 합이 있어요.'; strengths.push('일지 육합으로 안정적'); }
  else if (isChung(ja, jb)) { s2 = 12; c2 = '일지가 충(沖) — 끌림이 강한 만큼 변동·다툼도 잦을 수 있어요.'; cautions.push('일지 충 — 권태기·변동에 유의'); }

  // 3) 오행 상호보완 (25)
  const elems: Ohaeng[] = ['목', '화', '토', '금', '수'];
  const weakOf = (r: SajuResult) => elems.filter((e) => (r.ohaeng as any)[e] <= 1);
  const richOf = (r: SajuResult) => elems.filter((e) => (r.ohaeng as any)[e] >= 2);
  const aWeak = weakOf(a), bRich = richOf(b), bWeak = weakOf(b), aRich = richOf(a);
  const coverA = aWeak.filter((e) => bRich.includes(e)).length;
  const coverB = bWeak.filter((e) => aRich.includes(e)).length;
  const need = Math.max(1, aWeak.length) + Math.max(1, bWeak.length);
  const cover = coverA + coverB;
  let s3 = aWeak.length + bWeak.length === 0 ? 18 : Math.round((cover / need) * 25);
  s3 = Math.max(8, Math.min(25, s3));
  const c3 = cover > 0
    ? `서로 부족한 오행(${[...new Set([...aWeak.filter(e=>bRich.includes(e)), ...bWeak.filter(e=>aRich.includes(e))])].join('·') || '기운'})을 채워줘요.`
    : '오행 보완은 약하지만 각자 독립적으로 균형이 잡혀 있어요.';
  if (cover > 0) strengths.push('부족한 오행을 서로 채워주는 보완 관계');

  // 4) 강약 균형 (15)
  const sa = a.dayMasterStrength, sb = b.dayMasterStrength;
  let s4 = 11, c4 = '비슷한 기운 세기로 템포가 맞아요.';
  if (Math.abs(sa - sb) >= 0.2) { s4 = 15; c4 = '한쪽은 추진형, 한쪽은 유연형 — 역할이 보완돼요.'; strengths.push('신강·신약이 균형을 이룸'); }
  else if (sa > 0.6 && sb > 0.6) { s4 = 8; c4 = '둘 다 주관이 강해 주도권 조율이 필요해요.'; cautions.push('둘 다 신강 — 주도권 다툼 주의'); }

  const total = s1 + s2 + s3 + s4;
  const tier = total >= 88 ? '천생연분' : total >= 75 ? '좋은 인연' : total >= 60 ? '무난한 사이' : '노력이 필요한 인연';
  const headline =
    total >= 88 ? '말이 필요 없는 환상의 짝 💞'
    : total >= 75 ? '서로를 키워주는 좋은 인연 ✨'
    : total >= 60 ? '대화로 다듬으면 충분히 좋은 사이 🙂'
    : '서로 다른 만큼 이해가 필요한 관계 🌱';

  return {
    total, tier, headline,
    items: [
      { label: '일간 관계 (끌림·성향)', score: s1, max: 30, comment: c1 },
      { label: '일지 관계 (안정·합충)', score: s2, max: 30, comment: c2 },
      { label: '오행 상호보완', score: s3, max: 25, comment: c3 },
      { label: '기운 강약 균형', score: s4, max: 15, comment: c4 },
    ],
    strengths: strengths.length ? strengths : ['서로의 차이를 존중하는 자세가 강점이에요'],
    cautions: cautions.length ? cautions : ['특별히 큰 충돌 요소는 보이지 않아요'],
  };
}

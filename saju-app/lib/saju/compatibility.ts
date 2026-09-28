// 궁합(상성) 계산 — 두 명식의 짝: 일간↔일간 · 일지↔일지 · 오행 상호보완 · 강약 라벨 조합 (결정론, 무작위 0)
//
// ⚠️ 궁합은 pillarRelations()(한 명식 × 들어오는 한 기둥)가 아니다. **두 명식의 같은 자리끼리**만 본다.
//    일진·월주를 한쪽 사주에 넣지 않는다. 년지(띠 궁합)·삼합 완성은 이번 범위 밖.
// 관계표는 전부 hapchung.ts 에서 가져온다(원국 분석·오늘의 운세·신년·택일과 같은 표). 이 파일에 표를 복사하지 않는다.
// 강약은 elements.ts STRENGTH_CUT(화면 라벨과 같은 값). 점수는 COMPAT_RULE 한 곳 → compatFormula() 가 화면 「계산」칸.
//
// 2026-09-11 정정
//   · 일지 두 글자가 삼합 세트의 2/3이면 「반합」이다(두 글자로 삼합은 완성되지 않는다). 예전엔 「삼합 — 환상의 조합」이라 불렀고
//     육합보다 높게 쳤다 → 반합 ≤ 육합.
//   · 원진·해·형을 보기 시작했다. 예전엔 자미(해+원진)가 「큰 충돌 없이 무난」으로 나갔다. 원진은 「주의」이지 궁합 불가가 아니다.
//   · 「둘 다 신강」은 0.6 이 아니라 라벨 신강(≥0.55). 「추진형+유연형」은 강약 차이 0.2 가 아니라 신강+신약 라벨 조합.
//   · 천간합은 가산이다 — 합은 두 일간의 극(剋)을 묶어 무관계로 돌리고 그 위에 +5(오늘의 운세 합 +5와 같은 층).
import { GAN_OHAENG, SAENG, CHEONGAN, JIJI, type Ohaeng } from './constants';
import { strengthTier } from './elements';
import { GAN_HAP, GAN_CHUNG, YUKHAP, SAMHAP, SAMHYEONG, SANGHYEONG, JAHYEONG, HAE, WONJIN } from './hapchung';
import type { SajuResult } from './types';

const pairHit = <T extends readonly [number, number, ...unknown[]]>(table: readonly T[], a: number, b: number): T | undefined =>
  table.find((t) => (t[0] === a && t[1] === b) || (t[0] === b && t[1] === a));

/** 점수 상수 — 화면 「계산」칸과 같은 값 */
export const COMPAT_RULE = {
  gan: { saeng: 26, same: 24, geuk: 15, hapBase: 20, hapAdd: 5, max: 30 },
  // 일지: 기본 + 합(하나) + 가장 센 마찰 하나 → 육합 30 > 반합 27 > 무관계 21 > 형·해 18 > 원진 16 > 충 12
  ji: { base: 21, yukhap: 9, banhap: 6, hyeong: -3, hae: -3, wonjin: -5, chung: -9, max: 30 },
  ohaeng: { max: 25, min: 8, none: 18 },
  balance: { opposite: 15, bothStrong: 8, other: 11, max: 15 },
  tier: { 천생연분: 88, '좋은 인연': 75, '무난한 사이': 60 },
} as const;

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
  /** 일지 관계 태그(점수에 안 들어간 겹친 관계까지 전부) — 예: ['해', '원진'] */
  jiRelations: string[];
  /** 화면 「계산」칸 — 이 점수를 만든 식 */
  formula: string[];
}

/** 궁합 「계산」칸 */
export function compatFormula(): string[] {
  const G = COMPAT_RULE.gan, J = COMPAT_RULE.ji, B = COMPAT_RULE.balance, T = COMPAT_RULE.tier;
  const s = (n: number) => (n > 0 ? `+${n}` : `−${-n}`);
  return [
    `일간 관계(최대 ${G.max}) = 상생 ${G.saeng} · 같은 오행 ${G.same} · 상극 ${G.geuk}. 천간합이면 극이 묶여 ${G.hapBase}에 합 ${s(G.hapAdd)}`,
    `일지 관계(최대 ${J.max}) = ${J.base} + 합(육합 ${s(J.yukhap)} · 반합 ${s(J.banhap)}) + 가장 센 마찰 하나(형 ${s(J.hyeong)} · 해 ${s(J.hae)} · 원진 ${s(J.wonjin)} · 충 ${s(J.chung)}). ` +
      `두 글자로는 삼합이 완성되지 않아 「반합」으로 부릅니다`,
    `오행 상호보완(최대 ${COMPAT_RULE.ohaeng.max}) = 한쪽에 1개 이하인 오행을 상대가 2개 이상 가진 수 ÷ 필요한 수 × ${COMPAT_RULE.ohaeng.max} (${COMPAT_RULE.ohaeng.min}~${COMPAT_RULE.ohaeng.max})`,
    `강약 균형(최대 ${B.max}) = 명식 라벨로 — 신강+신약 ${B.opposite} · 둘 다 신강 ${B.bothStrong} · 그 밖 ${B.other}`,
    `총점 = 네 항목 합 → ${T.천생연분}↑ 천생연분 · ${T['좋은 인연']}↑ 좋은 인연 · ${T['무난한 사이']}↑ 무난한 사이 · 그 아래 노력이 필요한 인연. 무작위 보정 없음`,
  ];
}

function relWord(o1: Ohaeng, o2: Ohaeng): 'same' | 'saeng' | 'geuk' {
  if (o1 === o2) return 'same';
  if (SAENG[o1] === o2 || SAENG[o2] === o1) return 'saeng';
  return 'geuk'; // 다섯 오행의 두 원소는 같음·상생·상극 중 하나다
}

/** 일지 두 글자의 관계 — 합(육합/반합)과 마찰(충·형·해·원진)을 전부 */
export function jiPairRelations(a: number, b: number): { hap: '육합' | '반합' | null; banhapOf?: string; frictions: ('충' | '형' | '해' | '원진')[] } {
  let hap: '육합' | '반합' | null = null, banhapOf: string | undefined;
  if (pairHit(YUKHAP, a, b)) hap = '육합';
  else if (a !== b) {
    const g = SAMHAP.find(([tri]) => tri.includes(a) && tri.includes(b));
    if (g) { hap = '반합'; banhapOf = g[0].map((x) => JIJI[x]).join(''); }
  }
  const frictions: ('충' | '형' | '해' | '원진')[] = [];
  if (Math.abs(a - b) === 6) frictions.push('충');
  if ((a !== b && SAMHYEONG.some((set) => set.includes(a) && set.includes(b))) || pairHit([SANGHYEONG], a, b) || (a === b && (JAHYEONG as readonly number[]).includes(a))) frictions.push('형');
  if (pairHit(HAE, a, b)) frictions.push('해');
  if (pairHit(WONJIN, a, b)) frictions.push('원진');
  return { hap, banhapOf, frictions };
}

const FRICTION_TXT: Record<'충' | '형' | '해' | '원진', { comment: string; caution: string }> = {
  충: { comment: '충(沖) — 끌림이 강한 만큼 변동·다툼도 잦을 수 있어요.', caution: '일지 충 — 권태기·변동에 유의' },
  원진: { comment: '원진(怨嗔) — 사소한 서운함이 쌓이기 쉬운 조합이에요. 주의할 점이지 궁합이 안 된다는 뜻은 아닙니다.', caution: '일지 원진 — 서운함이 쌓이지 않게 그때그때 풀기(주의)' },
  해: { comment: '해(害) — 가까울수록 서로 깎는 말이 나오기 쉬워요.', caution: '일지 해 — 가까운 사이일수록 말의 선 지키기' },
  형: { comment: '형(刑) — 서로 예민한 지점을 건드리기 쉬워요.', caution: '일지 형 — 말투·태도에서 마찰 주의' },
};

export function computeCompatibility(a: SajuResult, b: SajuResult): CompatResult {
  const G = COMPAT_RULE.gan, J = COMPAT_RULE.ji, B = COMPAT_RULE.balance, T = COMPAT_RULE.tier;
  const ga = a.pillars.day.gan, gb = b.pillars.day.gan;
  const ja = a.pillars.day.ji, jb = b.pillars.day.ji;
  const oa = GAN_OHAENG[ga], ob = GAN_OHAENG[gb];
  const strengths: string[] = [];
  const cautions: string[] = [];

  // 1) 일간 관계
  let s1: number, c1: string;
  const ganHap = pairHit(GAN_HAP, ga, gb);
  if (ganHap) {
    s1 = G.hapBase + G.hapAdd;
    c1 = `두 일간이 천간합(${CHEONGAN[ganHap[0]]}${CHEONGAN[ganHap[1]]}합) — 서로를 묶는 끌림이 있어요. 합이 극을 묶어 부딪힘이 줄어듭니다.`;
    strengths.push('일간이 천간합 — 서로를 묶는 끌림');
  } else {
    const rel = relWord(oa, ob);
    if (rel === 'saeng') { s1 = G.saeng; c1 = '오행이 상생(相生) — 서로를 키워주는 응원형 관계예요.'; strengths.push('서로의 기운을 북돋는 상생 관계'); }
    else if (rel === 'same') { s1 = G.same; c1 = '같은 오행 — 가치관과 템포가 비슷해 편안해요.'; strengths.push('비슷한 성향으로 편안함'); }
    else if (pairHit(GAN_CHUNG, ga, gb)) { s1 = G.geuk; c1 = '두 일간이 충(沖) — 자극과 긴장이 공존하니 대화가 핵심이에요.'; cautions.push('일간이 충 관계라 갈등 시 거리 조절 필요'); }
    else { s1 = G.geuk; c1 = '오행이 상극(相剋) — 자극과 긴장이 공존하니 대화가 핵심이에요.'; cautions.push('일간이 극(剋) 관계라 갈등 시 거리 조절 필요'); }
  }

  // 2) 일지 관계 — 합 하나 + 가장 센 마찰 하나. 겹친 관계는 문구·태그에 전부
  const jr = jiPairRelations(ja, jb);
  const hapPts = jr.hap === '육합' ? J.yukhap : jr.hap === '반합' ? J.banhap : 0;
  const fPts: Record<string, number> = { 충: J.chung, 형: J.hyeong, 해: J.hae, 원진: J.wonjin };
  const worst = jr.frictions.length ? Math.min(...jr.frictions.map((f) => fPts[f])) : 0;
  const s2 = J.base + hapPts + worst;
  const parts: string[] = [];
  if (jr.hap === '육합') { parts.push('일지가 육합(六合) — 생활 리듬이 잘 맞물리는 합이 있어요.'); strengths.push('일지 육합으로 안정적'); }
  if (jr.hap === '반합') { parts.push(`일지가 반합(半合, ${jr.banhapOf} 중 두 글자) — 같은 방향으로 힘을 모으기 쉬워요.`); strengths.push('일지 반합으로 방향이 같음'); }
  for (const f of jr.frictions) { parts.push(`일지 ${FRICTION_TXT[f].comment}`); cautions.push(FRICTION_TXT[f].caution); }
  const c2 = parts.length ? parts.join(' ') : '일지 사이에 합·충·형·해·원진이 없어 무난해요.';

  // 3) 오행 상호보완 (기존 식 유지)
  const elems: Ohaeng[] = ['목', '화', '토', '금', '수'];
  const weakOf = (r: SajuResult) => elems.filter((e) => (r.ohaeng as any)[e] <= 1);
  const richOf = (r: SajuResult) => elems.filter((e) => (r.ohaeng as any)[e] >= 2);
  const aWeak = weakOf(a), bRich = richOf(b), bWeak = weakOf(b), aRich = richOf(a);
  const coverA = aWeak.filter((e) => bRich.includes(e)).length;
  const coverB = bWeak.filter((e) => aRich.includes(e)).length;
  const need = Math.max(1, aWeak.length) + Math.max(1, bWeak.length);
  const cover = coverA + coverB;
  let s3 = aWeak.length + bWeak.length === 0 ? COMPAT_RULE.ohaeng.none : Math.round((cover / need) * COMPAT_RULE.ohaeng.max);
  s3 = Math.max(COMPAT_RULE.ohaeng.min, Math.min(COMPAT_RULE.ohaeng.max, s3));
  const c3 = cover > 0
    ? `서로 부족한 오행(${[...new Set([...aWeak.filter(e=>bRich.includes(e)), ...bWeak.filter(e=>aRich.includes(e))])].join('·') || '기운'})을 채워줘요.`
    : '오행 보완은 약하지만 각자 독립적으로 균형이 잡혀 있어요.';
  if (cover > 0) strengths.push('부족한 오행을 서로 채워주는 보완 관계');

  // 4) 강약 균형 — 명식 라벨 조합으로만
  const ta = strengthTier(a.dayMasterStrength), tb = strengthTier(b.dayMasterStrength);
  let s4: number = B.other, c4: string;
  if ((ta === 'strong' && tb === 'weak') || (ta === 'weak' && tb === 'strong')) {
    s4 = B.opposite; c4 = '한쪽은 신강(추진형), 한쪽은 신약(유연형) — 역할이 보완돼요.'; strengths.push('신강·신약 조합으로 역할이 보완됨');
  } else if (ta === 'strong' && tb === 'strong') {
    s4 = B.bothStrong; c4 = '둘 다 신강 — 주관이 강해 주도권 조율이 필요해요.'; cautions.push('둘 다 신강 — 주도권 다툼 주의');
  } else if (ta === 'weak' && tb === 'weak') {
    c4 = '둘 다 신약 — 서로 기대는 편이라 큰 결정은 나눠서 정하면 좋아요.';
  } else if (ta === 'mid' && tb === 'mid') {
    c4 = '둘 다 중화 — 기운 세기가 비슷해 템포가 맞아요.';
  } else {
    c4 = '한쪽이 중화라 템포를 맞추기 어렵지 않아요.';
  }

  const total = s1 + s2 + s3 + s4;
  const tier = total >= T.천생연분 ? '천생연분' : total >= T['좋은 인연'] ? '좋은 인연' : total >= T['무난한 사이'] ? '무난한 사이' : '노력이 필요한 인연';
  const headline =
    tier === '천생연분' ? '합이 많고 부딪힘이 적은 짝이에요 💞'
    : tier === '좋은 인연' ? '서로를 키워주는 좋은 인연 ✨'
    : tier === '무난한 사이' ? '대화로 다듬으면 충분히 좋은 사이 🙂'
    : '서로 다른 만큼 이해가 필요한 관계 🌱';

  return {
    total, tier, headline,
    items: [
      { label: '일간 관계 (끌림·성향)', score: s1, max: G.max, comment: c1 },
      { label: '일지 관계 (안정·합충)', score: s2, max: J.max, comment: c2 },
      { label: '오행 상호보완', score: s3, max: COMPAT_RULE.ohaeng.max, comment: c3 },
      { label: '기운 강약 균형', score: s4, max: B.max, comment: c4 },
    ],
    strengths: strengths.length ? strengths : ['서로의 차이를 존중하는 자세가 강점이에요'],
    cautions: cautions.length ? cautions : ['특별히 큰 충돌 요소는 보이지 않아요'],
    jiRelations: [...(jr.hap ? [jr.hap] : []), ...jr.frictions],
    formula: compatFormula(),
  };
}

// 사주 유형 — 일간 물상(物象). 정통 명리에서 일간(나의 본질)을 자연 상징으로 표현.
import { CHEONGAN, GAN_OHAENG, type Ohaeng, type Sipsin } from './constants';

export interface Archetype {
  title: string;      // 예: "타오르는 크리에이터" (오행+십신)
  symbol: string;     // 오행 이모지
  element: Ohaeng;
  role: string;       // 우세 십신 역할
  tagline: string;
  hashtags: string[];
  motif: { emoji: string; name: string; desc: string }; // 일간 물상(공유용 캐릭터)
  traits: string[];
}

const ELEMENT_WORD: Record<Ohaeng, string> = {
  목: '푸른 숲의', 화: '타오르는', 토: '굳건한 대지의', 금: '빛나는 강철의', 수: '깊은 물의',
};
const ELEMENT_SYMBOL: Record<Ohaeng, string> = {
  목: '🌳', 화: '🔥', 토: '⛰️', 금: '⚔️', 수: '🌊',
};
const ROLE: Record<Sipsin, string> = {
  비견: '개척자', 겁재: '승부사', 식신: '크리에이터', 상관: '이야기꾼',
  편재: '사업가', 정재: '관리자', 편관: '리더', 정관: '책임자', 편인: '탐구자', 정인: '현자',
};
const ROLE_TAG: Record<Sipsin, string> = {
  비견: '#독립심 #마이웨이', 겁재: '#승부욕 #추진력', 식신: '#창작 #꾸준함', 상관: '#재능 #표현력',
  편재: '#기회포착 #스케일', 정재: '#현실감각 #관리력', 편관: '#카리스마 #위기대응', 정관: '#책임감 #신뢰',
  편인: '#직관 #전문성', 정인: '#학습력 #안정',
};

// 10천간 일간 물상 (갑0 ~ 계9)
const MOTIF: { emoji: string; name: string; desc: string }[] = [
  { emoji: '🌲', name: '아름드리 큰 나무', desc: '곧고 우직하게 위로 뻗는, 한번 정 주면 끝까지 가는 기둥 같은 사람이에요.' },        // 갑목
  { emoji: '🌿', name: '바람에 흔들리는 화초', desc: '어디서든 살아남는 유연함과 생활력, 사람을 부드럽게 끌어당기는 매력이 있어요.' },   // 을목
  { emoji: '☀️', name: '온 세상을 비추는 태양', desc: '숨기지 못하는 열정과 화려함, 어디서든 빛나고 사람을 끌어모으는 사람이에요.' },     // 병화
  { emoji: '🕯️', name: '어둠을 밝히는 촛불', desc: '은근하고 따뜻한 온기로 가까운 사람을 끝까지 챙기는 섬세한 사람이에요.' },          // 정화
  { emoji: '⛰️', name: '묵직한 큰 산', desc: '쉽게 흔들리지 않는 듬직함으로 모두가 기대고 싶어 하는 중심 같은 사람이에요.' },         // 무토
  { emoji: '🌾', name: '만물을 기르는 옥토', desc: '조용히 다 품고 길러내는, 실속 있고 자상한 사람이에요.' },                          // 기토
  { emoji: '🗡️', name: '벼려지는 무쇠', desc: '결단력과 의리가 분명한, 한번 마음먹으면 끝을 보는 강직한 사람이에요.' },               // 경금
  { emoji: '💎', name: '세공된 보석', desc: '예민하고 자존심 강하지만, 갈고닦을수록 빛나는 세련된 사람이에요.' },                       // 신금
  { emoji: '🌊', name: '흐르는 강과 바다', desc: '큰 그림을 그리는 포부와 지혜로, 자유롭게 흐르는 사람이에요.' },                       // 임수
  { emoji: '💧', name: '촉촉한 비와 이슬', desc: '영민하고 감수성 깊은, 조용히 스며들어 마음을 적시는 사람이에요.' },                    // 계수
];

const TIER_ADJ = {
  strong: ['거침없는', '우뚝 선', '기세 넘치는'],
  mid: ['한결같은', '균형 잡힌', '단단한'],
  weak: ['은은한', '잔잔한', '섬세한'],
};
const ELEM_TAG: Record<Ohaeng, string> = { 목: '#성장형', 화: '#인싸력', 토: '#든든함', 금: '#시크美', 수: '#두뇌파' };
const SIPSIN_TAG: Record<string, string> = {
  비견: '#마이웨이', 겁재: '#승부욕', 식신: '#재능러', 상관: '#표현력',
  편재: '#기회포착', 정재: '#현실감각', 편관: '#카리스마', 정관: '#책임감', 편인: '#직관파', 정인: '#꾸준러',
};

export function generateArchetype(
  dayGan: number,
  sipsinSummary: Record<string, number>,
  strength: number,
): Archetype {
  const dayOhaeng = GAN_OHAENG[dayGan];
  const dominant = (Object.entries(sipsinSummary).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '비견') as Sipsin;
  const role = ROLE[dominant] ?? '개척자';
  const title = `${ELEMENT_WORD[dayOhaeng]} ${role}`;

  const tier = strength >= 0.55 ? 'strong' : strength <= 0.38 ? 'weak' : 'mid';
  const strengthWord = tier === 'strong' ? '주관 뚜렷한 추진형'
    : tier === 'weak' ? '관계와 환경을 살리는 유연형' : '강약을 조절하는 균형형';

  const m = MOTIF[dayGan];
  const sipsinSum = Object.values(sipsinSummary).reduce((s, v) => s + v, 0);
  const seed = dayGan * 7 + Math.round(strength * 37) + (dominant?.charCodeAt(1) ?? 0) + sipsinSum * 3;
  const adjPool = TIER_ADJ[tier as keyof typeof TIER_ADJ];
  const adj = adjPool[seed % adjPool.length];
  const motif = { emoji: m.emoji, name: `${adj} ${m.name}`, desc: m.desc };
  const traits = [ELEM_TAG[dayOhaeng], tier === 'strong' ? '#주관뚜렷' : tier === 'weak' ? '#적응력갑' : '#밸런스', SIPSIN_TAG[dominant] ?? '#마이웨이'];

  const hj = { 목: '木', 화: '火', 토: '土', 금: '金', 수: '水' }[dayOhaeng];
  return {
    title,
    symbol: ELEMENT_SYMBOL[dayOhaeng],
    element: dayOhaeng,
    role,
    tagline: `${strengthWord}, ${CHEONGAN[dayGan]}(${dayOhaeng}·${hj}) 기운의 사람`,
    hashtags: ['#정통사주', `#${role}`, ...(ROLE_TAG[dominant]?.split(' ') ?? [])],
    motif,
    traits,
  };
}

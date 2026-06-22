// 개운법(改運法) — 용신/부족·과다 오행 기반 맞춤 생활 처방. 규칙 기반, 외부 의존 0.
import { SAENG, GEUK, type Ohaeng } from './constants';
import type { SajuResult } from './types';

interface OhaengReco {
  color: string; colorHex: string; direction: string;
  foods: string; activities: string; careers: string; items: string;
}

const RECO: Record<Ohaeng, OhaengReco> = {
  목: {
    color: '청록·초록', colorHex: '#22c55e', direction: '동쪽',
    foods: '신맛 나는 음식, 푸른 잎채소·나물, 보리·밀, 신 과일(레몬·매실)',
    activities: '산책·등산, 식물 가꾸기, 독서·기획, 새벽 활동',
    careers: '교육·출판·기획·디자인·환경·콘텐츠',
    items: '나무 소품·원목 가구, 화분·식물, 초록 계열 지갑',
  },
  화: {
    color: '빨강·분홍', colorHex: '#ef4444', direction: '남쪽',
    foods: '쓴맛 음식, 붉은 식재료(토마토·고추·대추), 잡곡, 커피',
    activities: '운동·댄스, 발표·공연, SNS·표현 활동, 사람 만나기',
    careers: '미디어·방송·마케팅·요식·예술·뷰티',
    items: '붉은 액세서리, 캔들·따뜻한 조명, 밝은 색 의류',
  },
  토: {
    color: '노랑·베이지·황토', colorHex: '#eab308', direction: '중앙·남서',
    foods: '단맛 음식, 노란 곡물(기장·옥수수), 단호박·고구마, 꿀',
    activities: '요리·정원, 부동산·살림 정비, 중재·봉사, 명상',
    careers: '부동산·중개·농업·공공·상담·요식',
    items: '도자기·황색 천연석(황옥·호박), 흙·세라믹 소품',
  },
  금: {
    color: '흰색·은·금', colorHex: '#e2e8f0', direction: '서쪽',
    foods: '매운맛 음식, 흰 식재료(무·양파·마늘·도라지), 견과, 율무',
    activities: '악기·금속공예, 정리정돈, 근력운동, 투자·재무 공부',
    careers: '금융·법률·기계·의료·IT·회계',
    items: '금속 액세서리, 백수정·은제품, 흰색 소품',
  },
  수: {
    color: '검정·남색·파랑', colorHex: '#3b82f6', direction: '북쪽',
    foods: '짠맛(과하지 않게), 검은 식재료(검은콩·미역·김), 해산물, 충분한 물',
    activities: '수영·반신욕, 여행·이동, 글쓰기·연구, 명상',
    careers: '무역·유통·연구·물류·콘텐츠·수산',
    items: '검정·남색 소품, 블랙토르말린, 어항·물 가까이',
  },
};

export interface GaeunResult {
  yongsin: Ohaeng;          // 핵심 보완 오행
  secondary: Ohaeng;        // 차선(부족 오행)
  excess: Ohaeng | null;    // 과다 오행(주의)
  reason: string;
  primary: OhaengReco;
  secondaryReco: OhaengReco;
  cautionText: string | null;
}

function yongsinElement(dayO: Ohaeng, strength: number): Ohaeng {
  const generator = (Object.keys(SAENG) as Ohaeng[]).find((o) => SAENG[o] === dayO)!; // 인성
  const output = SAENG[dayO];   // 식상
  const wealth = GEUK[dayO];    // 재성
  if (strength < 0.45) return generator;
  if (strength > 0.55) return output;
  return wealth;
}

export function computeGaeun(r: SajuResult): GaeunResult {
  const dayO = r.dayMaster.ohaeng;
  const strength = r.dayMasterStrength;
  const counts = r.ohaeng;

  const yongsin = yongsinElement(dayO, strength);
  const order = (['목', '화', '토', '금', '수'] as Ohaeng[]).sort((a, b) => (counts as any)[a] - (counts as any)[b]);
  const secondary = order.find((o) => o !== yongsin) ?? order[0];

  // 과다 오행(status '과다')
  let excess: Ohaeng | null = null;
  for (const o of ['목', '화', '토', '금', '수'] as Ohaeng[]) {
    if ((counts.status as any)[o] === '과다') { excess = o; break; }
  }

  const reason = strength >= 0.55
    ? `기운이 강한 사주(신강)예요. 넘치는 힘을 자연스럽게 흘려보내는 '${yongsin}'의 기운을 생활에 들이면 균형이 잡히고 운이 풀립니다.`
    : strength <= 0.38
      ? `기운이 여린 사주(신약)예요. 나를 받쳐주는 '${yongsin}'의 기운을 가까이 두면 힘이 생기고 일이 수월해집니다.`
      : `균형 잡힌 사주예요. 활동과 결실을 돕는 '${yongsin}'의 기운을 더하면 운을 한층 키울 수 있어요.`;

  const cautionText = excess
    ? `'${excess}' 기운이 이미 과다해요(${(counts as any)[excess]}개). ${RECO[excess].color} 계열과 ${RECO[excess].direction} 방위, ${excess}에 치우친 환경은 살짝 줄이는 게 균형에 좋아요.`
    : null;

  return { yongsin, secondary, excess, reason, primary: RECO[yongsin], secondaryReco: RECO[secondary], cautionText };
}

// 작명/개명 도움말 — 소리오행(발음오행) 기반 규칙 엔진 (외부 의존 0, 클라이언트 안전)
// 원리: 한글 초성을 오음(아·설·순·치·후)으로 분류 → 오행에 대응. 사주에 보완할 오행을 소리로 채운다.
import { SAENG, GEUK, type Ohaeng } from './constants';
import type { SajuResult } from './types';

// 한글 초성 19개 순서 (유니코드 조합 순)
const CHOSEONG = ['ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'] as const;

// 발음오행: 아음(어금니)=목, 설음(혀)=화, 순음(입술)=수, 치음(이)=금, 후음(목구멍)=토
const SOUND_OHAENG: Record<string, Ohaeng> = {
  ㄱ: '목', ㄲ: '목', ㅋ: '목',
  ㄴ: '화', ㄷ: '화', ㄸ: '화', ㄹ: '화', ㅌ: '화',
  ㅁ: '수', ㅂ: '수', ㅃ: '수', ㅍ: '수',
  ㅅ: '금', ㅆ: '금', ㅈ: '금', ㅉ: '금', ㅊ: '금',
  ㅇ: '토', ㅎ: '토',
};

// 오행별 대표 초성(추천 안내용)
export const OHAENG_CHOSEONG: Record<Ohaeng, string[]> = {
  목: ['ㄱ', 'ㅋ'], 화: ['ㄴ', 'ㄷ', 'ㄹ', 'ㅌ'], 토: ['ㅇ', 'ㅎ'], 금: ['ㅅ', 'ㅈ', 'ㅊ'], 수: ['ㅁ', 'ㅂ', 'ㅍ'],
};

// 오행별 추천 이름 음절(한글 이름에 흔히 쓰는 글자/이름)
const SYLLABLES: Record<Ohaeng, string[]> = {
  목: ['가람', '건우', '결', '규현', '경', '권', '겸', '강'],
  화: ['나윤', '다온', '단', '도윤', '라온', '리원', '태리', '린', '늘', '도현'],
  토: ['아인', '온유', '우주', '윤', '은', '하늘', '한결', '해든', '현', '호'],
  금: ['서준', '선', '솔', '수아', '시우', '신', '주원', '준', '지호', '찬'],
  수: ['민', '무', '미르', '보름', '별', '봄', '빈', '평', '푸름', '백'],
};
// 혹시 모를 비한글 정리
const cleanSyll = (arr: string[]) => arr.filter((s) => /^[가-힣]+$/.test(s));

/** 한 글자(또는 문자열)의 초성 오행 목록 */
function syllableOhaeng(ch: string): Ohaeng | null {
  const code = ch.charCodeAt(0);
  if (code < 0xac00 || code > 0xd7a3) return null; // 완성형 한글 아님
  const cho = Math.floor((code - 0xac00) / 588);
  const o = SOUND_OHAENG[CHOSEONG[cho]];
  return o ?? null;
}

export interface NameCharAnalysis { char: string; choseong: string; ohaeng: Ohaeng | null; }

export interface NamingResult {
  needPrimary: Ohaeng;        // 가장 보완하면 좋은 오행(용신 프록시)
  needSecondary: Ohaeng;      // 차선(수량상 가장 부족한 오행)
  reason: string;             // 신강약 기반 한 줄 근거
  recommendChoseong: string[];// 추천 초성(소리)
  suggestSyllables: string[]; // 추천 음절
  nameAnalysis: NameCharAnalysis[] | null; // 입력 이름 분석(성 제외 권장이나 전체 분석)
  nameVerdict: string | null; // 입력 이름 총평
}

/** 신강약 기준 용신 프록시 오행 (daily.luckyElement 와 동일 철학) */
function yongsinElement(dayO: Ohaeng, strength: number): Ohaeng {
  const generator = (Object.keys(SAENG) as Ohaeng[]).find((o) => SAENG[o] === dayO)!; // 인성
  const output = SAENG[dayO];   // 식상
  const wealth = GEUK[dayO];    // 재성
  if (strength < 0.45) return generator; // 신약 → 도와주는 인성
  if (strength > 0.55) return output;     // 신강 → 빼주는 식상
  return wealth;                          // 중화 → 재성
}

export function computeNaming(r: SajuResult): NamingResult {
  const dayO = r.dayMaster.ohaeng;
  const strength = r.dayMasterStrength;
  const counts = r.ohaeng;

  const needPrimary = yongsinElement(dayO, strength);
  // 수량상 가장 부족한 오행(동률이면 needPrimary 와 다른 것 우선)
  const order = (['목', '화', '토', '금', '수'] as Ohaeng[])
    .sort((a, b) => (counts as any)[a] - (counts as any)[b]);
  const needSecondary = order.find((o) => o !== needPrimary) ?? order[0];

  const reason = strength >= 0.55
    ? `기운이 강한 사주(신강)라, 넘치는 힘을 흘려보내는 '${needPrimary}'의 소리가 이름에 들어가면 균형이 잡힙니다.`
    : strength <= 0.38
      ? `기운이 여린 사주(신약)라, 나를 받쳐주는 '${needPrimary}'의 소리가 이름에 들어가면 힘이 생깁니다.`
      : `균형 잡힌 사주라, 활동과 결실을 돕는 '${needPrimary}'의 소리가 이름에 들어가면 운을 키웁니다.`;

  const recommendChoseong = [...OHAENG_CHOSEONG[needPrimary], ...OHAENG_CHOSEONG[needSecondary]];
  const suggestSyllables = [...cleanSyll(SYLLABLES[needPrimary]), ...cleanSyll(SYLLABLES[needSecondary])].slice(0, 10);

  // 입력 이름 분석 (있으면)
  let nameAnalysis: NameCharAnalysis[] | null = null;
  let nameVerdict: string | null = null;
  const nm = (r.input.name ?? '').replace(/\s/g, '');
  if (nm && /[가-힣]/.test(nm)) {
    nameAnalysis = [...nm].map((ch) => {
      const code = ch.charCodeAt(0);
      const cho = code >= 0xac00 && code <= 0xd7a3 ? CHOSEONG[Math.floor((code - 0xac00) / 588)] : '-';
      return { char: ch, choseong: cho, ohaeng: syllableOhaeng(ch) };
    });
    const has = new Set(nameAnalysis.map((c) => c.ohaeng).filter(Boolean) as Ohaeng[]);
    if (has.has(needPrimary)) {
      nameVerdict = `좋습니다. 이름에 이미 보완 오행 '${needPrimary}'의 소리(${OHAENG_CHOSEONG[needPrimary].join('·')})가 들어 있어, 사주의 부족함을 소리로 채워주고 있어요.`;
    } else {
      nameVerdict = `이름의 소리는 '${[...has].join('·') || '—'}' 기운이에요. 사주에 필요한 '${needPrimary}'의 소리(${OHAENG_CHOSEONG[needPrimary].join('·')})는 빠져 있으니, 개명까지는 아니어도 자녀·반려·예명 등 새 이름을 지을 땐 이 소리를 넣어보세요.`;
    }
  }

  return { needPrimary, needSecondary, reason, recommendChoseong, suggestSyllables, nameAnalysis, nameVerdict };
}

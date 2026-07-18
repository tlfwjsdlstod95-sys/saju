// 격국(格局) · 용신(用神) · 조후(調候) — 정통 명리의 '구조 + 균형' 핵심.
// 월지 지장간 투출로 격을 잡고, 억부 + 조후를 결합해 용신을 도출한다. 결정론, 외부 의존 0.
import { GAN_OHAENG, JI_OHAENG, JIJANGGAN, SAENG, GEUK, JIJI, type Ohaeng, type Sipsin } from './constants';
import { sipsin } from './elements';
import type { Pillar } from './types';

// ── 격국 ──
export interface Gyeokguk {
  name: string;     // 예: '정관격'
  key: Sipsin | '건록격' | '양인격';
  via: string;      // 어떻게 잡혔는지 (예: '월지 정기 투출')
  desc: string;     // 그릇 한 줄
}

const GYEOK_DESC: Record<string, { name: string; desc: string }> = {
  정관: { name: '정관격', desc: '명예와 질서의 그릇입니다. 규범과 조직 안에서 신뢰를 쌓아 반듯하게 올라가는 타입이에요. 원칙을 지킬수록 커집니다.' },
  편관: { name: '편관격(칠살격)', desc: '카리스마와 통솔의 그릇입니다. 위기에 강하고 압박을 견디는 힘이 세, 무·법·의·경쟁 분야에서 리더가 되는 타입이에요.' },
  정인: { name: '정인격', desc: '학문과 인덕의 그릇입니다. 배움·자격·전문성을 차곡차곡 쌓아 안정적으로 커가는 타입이에요. 시간이 곧 실력입니다.' },
  편인: { name: '편인격', desc: '직관과 전문의 그릇입니다. 남다른 관점으로 한 분야를 깊게 파는, 특수·기술·예술·연구에 강한 타입이에요.' },
  정재: { name: '정재격', desc: '성실과 실속의 그릇입니다. 차근차근 현실의 자산을 쌓는, 관리와 신용이 무기인 타입이에요. 한 방보다 누적이 답입니다.' },
  편재: { name: '편재격', desc: '사업과 수완의 그릇입니다. 큰돈과 기회의 흐름을 읽고 굴리는, 스케일 크게 벌이는 타입이에요. 사람·자원을 쓰는 자리에서 빛납니다.' },
  식신: { name: '식신격', desc: '재능과 결실의 그릇입니다. 좋아하는 걸 깊게 파 꾸준히 결과를 내는, 여유와 표현이 강점인 타입이에요.' },
  상관: { name: '상관격', desc: '재주와 자유의 그릇입니다. 틀을 깨고 자기 색으로 두각을 내는, 표현·기획·전문기술에서 빛나는 타입이에요. 말과 끼가 무기입니다.' },
  건록: { name: '건록격', desc: '자수성가의 그릇입니다. 내 힘으로 일군 내 자리에서 강한, 독립·전문직 체질이에요. 남 밑보다 내 이름으로 설 때 폭발합니다.' },
  양인: { name: '양인격', desc: '강한 추진의 그릇입니다. 칼 같은 결단과 에너지로 전문·기술·생사 다루는 분야에서 빛나는 타입이에요. 그 힘을 다스리는 게 평생 과제입니다.' },
};

/** 월지 지장간 투출 기반 격국 판정 */
export function computeGyeokguk(
  pillars: { year: Pillar; month: Pillar; day: Pillar; hour: Pillar | null },
  dayGan: number,
): Gyeokguk {
  const monthJi = pillars.month.ji;
  const jjg = JIJANGGAN[monthJi];
  // 월지 지장간 후보(정기>중기>여기 우선순위)
  const candidates: number[] = [jjg.jeonggi.gan, ...(jjg.junggi ? [jjg.junggi.gan] : []), jjg.yeogi.gan];
  // 천간 투출 체크(년·월·시간. 일간 본인 제외)
  const stems = [pillars.year.gan, pillars.month.gan, ...(pillars.hour ? [pillars.hour.gan] : [])];

  let chosen = jjg.jeonggi.gan;  // 기본: 월지 정기
  let via = '월지 정기(본기)';
  for (const cand of candidates) {
    if (cand === dayGan) continue; // 일간과 같으면 비겁(건록/양인) → 아래서 처리
    if (stems.includes(cand)) { chosen = cand; via = '월지 지장간 투출(透出)'; break; }
  }

  const ss = sipsin(dayGan, chosen);
  // 비견/겁재로 잡히면 건록격/양인격
  if (ss === '비견') return { name: GYEOK_DESC.건록.name, key: '건록격', via: '월지=일간 오행(건록)', desc: GYEOK_DESC.건록.desc };
  if (ss === '겁재') return { name: GYEOK_DESC.양인.name, key: '양인격', via: '월지 겁재(양인)', desc: GYEOK_DESC.양인.desc };
  const d = GYEOK_DESC[ss];
  return { name: d.name, key: ss, via, desc: d.desc };
}

// ── 조후(調候) — 계절 한난조습 ──
export type Climate = '한습' | '조열' | '서늘' | '온화';
export interface Johu { climate: Climate; need: Ohaeng | null; desc: string; urgent: boolean; }

const WINTER = [11, 0, 1]; // 亥子丑
const SUMMER = [5, 6, 7];  // 巳午未
const AUTUMN = [8, 9, 10]; // 申酉戌 — 금왕절, 한기가 돌기 시작

export function computeJohu(dayGan: number, monthJi: number): Johu {
  const dayO = GAN_OHAENG[dayGan];
  if (WINTER.includes(monthJi)) {
    const urgent = dayO === '금' || dayO === '수'; // 금수 일간 겨울생 = 강한 한습
    return { climate: '한습', need: '화', urgent,
      desc: `겨울에 난 ${urgent ? '금·수' : ''} 사주라 기운이 차고 습합니다. 따뜻한 불(火) 기운 — 열정·활동·양지·사람의 온기가 당신을 녹여 풀어줍니다.${urgent ? ' 조후가 시급한 구조예요.' : ''}` };
  }
  if (SUMMER.includes(monthJi)) {
    const urgent = dayO === '목' || dayO === '화'; // 목화 일간 여름생 = 강한 조열
    return { climate: '조열', need: '수', urgent,
      desc: `여름에 난 ${urgent ? '목·화' : ''} 사주라 기운이 뜨겁고 메마릅니다. 시원한 물(水) 기운 — 휴식·지혜·차분함·물가가 당신을 식혀 균형을 줍니다.${urgent ? ' 조후가 시급한 구조예요.' : ''}` };
  }
  // 가을 금·수 일간: 조후론에선 서늘한 금왕절에 정화(丁火) 등 불 기운을 먼저 보는 견해가 있음 → 보조 처방으로 연결
  if (AUTUMN.includes(monthJi) && (dayO === '금' || dayO === '수')) {
    return { climate: '서늘', need: '화', urgent: false,
      desc: '가을 금왕절에 난 금·수 사주라 서서히 한기가 돕니다. 강약 균형(억부)이 우선이지만, 조후 관점에선 따뜻한 불(火) — 표현·활동·양지의 기운이 결실을 돕는 보조 처방이에요.' };
  }
  return { climate: '온화', need: null, urgent: false,
    desc: '계절의 기운이 치우치지 않아, 한난조습보다 강약 균형(억부)이 더 중요한 사주입니다.' };
}

// ── 용신(用神) — 억부 + 조후 결합 ──
export interface Yongsin {
  primary: Ohaeng;     // 핵심 용신
  eokbu: Ohaeng;       // 억부용신
  johu: Ohaeng | null; // 조후용신
  huisin: Ohaeng;      // 희신(용신을 생하는 오행)
  gisin: Ohaeng;       // 기신(용신을 극하는 오행)
  method: '조후우선' | '억부';
  desc: string;
}

// 생아자(인성 오행): X where SAENG[X]=dayO
function inseongOhaeng(dayO: Ohaeng): Ohaeng {
  return (Object.keys(SAENG) as Ohaeng[]).find((x) => SAENG[x] === dayO)!;
}
// 극아자(관성 오행): X where GEUK[X]=dayO
function gwanOhaeng(dayO: Ohaeng): Ohaeng {
  return (Object.keys(GEUK) as Ohaeng[]).find((x) => GEUK[x] === dayO)!;
}

export function computeYongsin(dayGan: number, strength: number, monthJi: number): Yongsin {
  const dayO = GAN_OHAENG[dayGan];
  // 억부용신: 신약→인성(생조), 신강→식상(설기), 중화→재성(균형)
  const eokbu: Ohaeng =
    strength <= 0.38 ? inseongOhaeng(dayO)
    : strength >= 0.55 ? SAENG[dayO]          // 식상 = 일간이 생하는 오행
    : GEUK[dayO];                              // 재성 = 일간이 극하는 오행
  const johuRes = computeJohu(dayGan, monthJi);
  const johu = johuRes.need;

  // 조후가 시급하면 조후 우선, 아니면 억부 우선
  const method: Yongsin['method'] = johuRes.urgent && johu ? '조후우선' : '억부';
  const primary = method === '조후우선' && johu ? johu : eokbu;
  const huisin = inseongOhaeng(primary);     // 용신을 생하는 오행
  const gisin = gwanOhaeng(primary);         // 용신을 극하는 오행

  const label = strength <= 0.38 ? '신약(돕는 기운 필요)' : strength >= 0.55 ? '신강(덜어내는 기운 필요)' : '중화(흐르게 하는 기운 필요)';
  const desc =
    `당신에게 약이 되는 핵심 기운(용신)은 ${primary}(五行)입니다. ` +
    (method === '조후우선'
      ? `계절(조후)이 너무 치우쳐, 억부용신 ${eokbu}보다 조후용신 ${johu}을(를) 먼저 씁니다. `
      : `${label} 구조라 ${eokbu} 기운이 당신을 풀어줍니다. ${johu ? `보조로 조후의 ${johu} 기운도 도움이 돼요. ` : ''}`) +
    `${primary} 기운이 들어오는 시기·환경·사람·색·방위가 당신에게 길합니다. 반대로 ${gisin} 기운이 과하면 답답해집니다.`;

  return { primary, eokbu, johu, huisin, gisin, method, desc };
}

/** 격국·용신·조후 한 묶음 + AI/풀이용 요약 문자열 */
export interface GyeokYong {
  gyeokguk: Gyeokguk;
  yongsin: Yongsin;
  johu: Johu;
}

export function computeGyeokYong(
  pillars: { year: Pillar; month: Pillar; day: Pillar; hour: Pillar | null },
  dayGan: number,
  strength: number,
): GyeokYong {
  return {
    gyeokguk: computeGyeokguk(pillars, dayGan),
    yongsin: computeYongsin(dayGan, strength, pillars.month.ji),
    johu: computeJohu(dayGan, pillars.month.ji),
  };
}

/** AI 프롬프트/요약용 한 줄 표기 */
export function gyeokYongBrief(gy: GyeokYong): string {
  return `${gy.gyeokguk.name} · 용신 ${gy.yongsin.primary}(${gy.yongsin.method}) · 조후 ${gy.johu.climate}${gy.johu.need ? `(${gy.johu.need} 필요)` : ''}`;
}

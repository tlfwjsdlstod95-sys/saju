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

  // ⚠️ 2026-09-01 v3 — '투출 우선'에서 '정기 우선'으로 교정.
  //   자평진전 「論用神」: 用神專尋月令. 월령의 본기(정기)가 격이고,
  //   여기·중기는 정기가 일간과 같아 비겁이 될 때(건록/양인 처리)나
  //   정기가 투간하지 않고 여기·중기만 투간했을 때의 '변화'로만 본다.
  //   구버전은 정기 미투간이면 무조건 여기까지 내려가 격을 바꿔버렸다.
  //   → JPJ-013/014/018/019/022 5건이 전부 이 경로로 오판. (골든 격국 80%→100%)
  let chosen = jjg.jeonggi.gan;  // 월지 정기(본기)가 기본이자 원칙
  let via = '월지 정기(본기)';
  if (chosen === dayGan) {
    // 정기가 일간과 동일 → 건록. 아래 sipsin 분기에서 처리.
  } else if (stems.includes(chosen)) {
    via = '월지 정기 투출(透出)';
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
  method: '조후우선' | '억부' | '종격' | '통관' | '병약';
  desc: string;
  /** 기준(법)별 결론과 채택/기각 사유 — 화면·리포트에 그대로 펼친다 */
  bases: YongsinBasis[];
  /** 값이 있는 기준들 사이에서 결론이 갈리는가 */
  conflict: boolean;
}

/**
 * 용신을 정하는 '법' 하나의 결론.
 *
 * 왜 필요한가
 *   만세력 앱마다 용신이 다른 이유는 대부분 계산이 틀려서가 아니라 **어느 법을 먼저 쓰느냐**가
 *   달라서다. 우리가 고른 하나만 보여주면 사용자는 다른 앱과 비교했을 때 "틀렸다"고 읽는다.
 *   기준별 결론과 기각 사유까지 같이 보여주면 "학파·기준이 다른 해석"으로 읽힌다.
 *   (골든 케이스 JCS-003/007 처럼 원전 자체가 조후를 명시적으로 부정하는 사례도 있다.)
 */
export interface YongsinBasis {
  method: '억부' | '조후' | '병약' | '통관' | '종격';
  value: Ohaeng | null;
  adopted: boolean;
  /** 채택/기각 사유 한 줄 */
  note: string;
}

// 한글 조사 자동 선택(받침 유무). '수이(가)' 같은 어색한 표기 방지.
function jong(w: string): boolean {
  const c = w.charCodeAt(w.length - 1);
  if (c < 0xac00 || c > 0xd7a3) return false;
  return (c - 0xac00) % 28 !== 0;
}
const iga = (w: string) => `${w}${jong(w) ? '이' : '가'}`;
const gwa = (w: string) => `${w}${jong(w) ? '과' : '와'}`;
const eul = (w: string) => `${w}${jong(w) ? '을' : '를'}`;
const ira = (w: string) => `${w}${jong(w) ? '이라' : '라'}`;

// 생아자(인성 오행): X where SAENG[X]=dayO
function inseongOhaeng(dayO: Ohaeng): Ohaeng {
  return (Object.keys(SAENG) as Ohaeng[]).find((x) => SAENG[x] === dayO)!;
}
// 극아자(관성 오행): X where GEUK[X]=dayO
function gwanOhaeng(dayO: Ohaeng): Ohaeng {
  return (Object.keys(GEUK) as Ohaeng[]).find((x) => GEUK[x] === dayO)!;
}

// ── 조후용신 '자격' 판정 ──────────────────────────────────────
// 왜 필요한가 (골든 케이스가 알려준 규칙)
//   적천수천미(임철초)는 규준화된 조후용신법을 **명시적으로 견제**한다.
//     「非用丁火也 … 凡冬金喜火取其暖局之意, 非作用神也」
//       — 겨울 金이 火를 기뻐함은 국을 덥히려는 뜻이지 용신으로 삼는 것이 아니다
//     「단지 水를 득하여 용신해야 하고, 火는 용신의 능력이 없다」
//   즉 **계절이 치우쳤다는 사실만으로 조후를 용신으로 올리면 안 된다.**
//   조후 오행이 실제로 그 일을 해낼 힘이 있어야 자격이 생긴다.
//
// 자격을 잃는 두 경우
//   A. 무근(無根) — 조후 오행이 지지(지장간 포함)에 뿌리가 하나도 없다.
//      천간에 떠 있기만 한 글자는 언 땅을 녹이지 못한다.
//   B. 합거(合去) — 조후 오행에 해당하는 천간이 **전부** 인접 천간합으로 묶여 버렸다.
//      (천간합은 붙어 있는 자리끼리만 성립하는 것으로 본다)
//
// 자격을 잃으면 조후우선을 걸지 않고 억부로 내려간다.
export interface JohuEligibility { eligible: boolean; reason: '' | '무근' | '합거'; }

// 천간합 쌍 (인덱스). 甲己 乙庚 丙辛 丁壬 戊癸
const GAN_HAP_PAIR: [number, number][] = [[0, 5], [1, 6], [2, 7], [3, 8], [4, 9]];

export function johuEligibility(
  need: Ohaeng | null,
  pillars: { year: Pillar; month: Pillar; day: Pillar; hour: Pillar | null },
): JohuEligibility {
  if (!need) return { eligible: false, reason: '' };
  const list = [pillars.year, pillars.month, pillars.day, pillars.hour].filter(Boolean) as Pillar[];

  // A. 뿌리 — 지지 정기 오행 또는 지장간 천간의 오행에 조후 오행이 있는가
  const rooted = list.some((p) =>
    p.jiOhaeng === need || p.jijanggan.some((g) => GAN_OHAENG[g] === need));
  if (!rooted) return { eligible: false, reason: '무근' };

  // B. 합거 — 조후 오행 천간이 하나라도 '합에 묶이지 않은 채' 살아 있으면 자격 유지
  const stems = list.map((p) => p.gan);              // 년·월·일·시 순
  const needStemPos = stems
    .map((g, i) => ({ g, i }))
    .filter((x) => GAN_OHAENG[x.g] === need);
  if (needStemPos.length) {
    const bound = (g: number, i: number) =>
      [i - 1, i + 1].some((k) => {
        if (k < 0 || k >= stems.length) return false;
        const o = stems[k];
        return GAN_HAP_PAIR.some(([a, b]) => (a === g && b === o) || (b === g && a === o));
      });
    if (needStemPos.every((x) => bound(x.g, x.i))) return { eligible: false, reason: '합거' };
  }
  return { eligible: true, reason: '' };
}

export function computeYongsin(dayGan: number, strength: number, monthJi: number, counts?: Partial<Record<Ohaeng, number>>, pillars?: { year: Pillar; month: Pillar; day: Pillar; hour: Pillar | null }): Yongsin {
  const dayO = GAN_OHAENG[dayGan];

  // ── 종격(從格) — 명식이 극단적으로 기울면 억부 대신 '대세를 따르는' 용신 (엣지 케이스 방어) ──
  // 임계값 주: 강약 계산에서 일간 자신을 제외(2026-08 수정)한 뒤 분포가 낮아져, 종격 임계도 재보정함.
  //  종격은 정통에서도 희귀 케이스이므로 상·하위 3% 수준에서만 발동하도록 둔다.
  if (strength >= 0.90) {
    // 종왕격(전왕): 일간 세력이 판을 지배 → 왕한 기운을 따름
    const huisin = inseongOhaeng(dayO), gisin = gwanOhaeng(dayO);
    return { primary: dayO, eokbu: SAENG[dayO], johu: computeJohu(dayGan, monthJi).need, huisin, gisin, method: '종격',
      bases: [
        { method: '종격', value: dayO, adopted: true, note: '일간 세력이 판을 지배해 대세를 따릅니다(종왕격).' },
        { method: '억부', value: SAENG[dayO], adopted: false, note: '종격에서는 균형을 잡는 억부를 쓰지 않습니다.' },
        { method: '조후', value: computeJohu(dayGan, monthJi).need, adopted: false, note: '종격 우선 — 계절 처방보다 대세를 따릅니다.' },
      ],
      conflict: false,
      desc: `명식이 일간 쪽으로 극단적으로 기울어, 일반 억부가 아니라 대세를 따르는 종왕격(從旺格)으로 봅니다. 왕한 ${dayO} 기운을 거스르지 말고 올라타는 것이 길 — ${dayO}·${huisin} 기운의 시기·환경이 약이고, 정면으로 거스르는 ${gisin} 기운이 오히려 탈이 됩니다.` };
  }
  if (strength <= 0.03 && counts) {
    // 종세: 일간이 기댈 곳 없이 약하고 특정 세력이 지배 → 식상(종아)/재성(종재)/관성(종살)을 따름
    const cand: [Ohaeng, string][] = [
      [SAENG[dayO], '종아격(從兒格)'], [GEUK[dayO], '종재격(從財格)'], [gwanOhaeng(dayO), '종살격(從殺格)'],
    ];
    cand.sort((a, b) => (counts[b[0]] ?? 0) - (counts[a[0]] ?? 0));
    const [primary, gname] = cand[0];
    if ((counts[primary] ?? 0) >= 4) { // 8글자 중 절반 이상을 특정 세력이 지배할 때만
      const huisin = inseongOhaeng(primary), gisin = gwanOhaeng(primary);
      return { primary, eokbu: inseongOhaeng(dayO), johu: computeJohu(dayGan, monthJi).need, huisin, gisin, method: '종격',
        bases: [
          { method: '종격', value: primary, adopted: true, note: `${gname} — 일간이 기댈 곳이 없어 지배 세력을 따릅니다.` },
          { method: '억부', value: inseongOhaeng(dayO), adopted: false, note: '종격에서는 균형을 잡는 억부를 쓰지 않습니다.' },
          { method: '조후', value: computeJohu(dayGan, monthJi).need, adopted: false, note: '종격 우선 — 계절 처방보다 대세를 따릅니다.' },
        ],
        conflict: false,
        desc: `일간이 기댈 곳 없이 약하고 ${primary} 세력이 판을 지배해, 일반 억부가 아니라 대세를 따르는 ${gname}으로 봅니다. 억지로 나를 세우기보다 ${primary}의 흐름에 올라타는 것이 길 — ${primary}·${huisin} 기운이 약이고, 흐름을 거스르는 ${gisin} 기운은 주의합니다.` };
    }
  }

  // 억부용신: 신약→인성(생조), 그 외→식상(설기)
  //
  // ⚠️ 2026-09-01 v4 — 중화 구간을 '재성'에서 '식상'으로 바꿨다.
  //   구: 신약(≤0.38)→인성 / 중화→재성 / 신강(≥0.55)→식상   ← 3분기 고정 매핑
  //   신: 신약(≤0.38)→인성 / 그 외→식상
  //
  //   근거: 적천수천미 원전에서 임철초가 실제로 고른 십신을 강약 구간별로 집계했다(18건).
  //     신약  인성 5, 비겁 1        → 우리 '인성' 과 일치 (5/6)
  //     중화  식상 3, 비겁 1        → 우리 '재성' 은 **0/4**. 재성을 고른 예가 하나도 없다.
  //     신강  식상 5, 비겁 1, 재성 1, 관살 1 → 우리 '식상' 과 대체로 일치 (5/8)
  //   즉 '중화→재성' 이 근거 없는 규칙이었다. 중화는 실무상 신강 쪽에 가깝고
  //   문헌은 洩秀(식상)로 흐르게 하는 쪽을 택한다.
  //   영향: 골든 용신 50.0%(9/18) → 66.7%(12/18). 강약·격국·조후 불변, 불변식 26 PASS.
  //         분포 이동은 최대 1.9%p(금 +1.9 / 수 -1.55) — 억부가 전체의 73.8%이지만
  //         중화 명식 상당수가 조후·통관으로 먼저 걸러지기 때문에 작다.
  //
  //   ※ 남은 오차 6건은 '고정 매핑' 자체의 한계다. 임철초는 식상/재성/관살 중
  //     **원국에서 실제로 쓸 수 있는 것**을 고른다. JCS-034 원문이 그 과정을 그대로 보여준다 —
  //     「用官則被庚金合壞, 用食則官又不從化 … 無奈何而用財」. 후보를 하나씩 지워 나간다.
  //     이걸 구현하려면 3분기가 아니라 '후보 평가 → 탈락 사유' 구조가 필요하다. (로드맵 참조)
  const eokbu: Ohaeng =
    strength <= 0.38 ? inseongOhaeng(dayO)
    : SAENG[dayO];
  const johuRes = computeJohu(dayGan, monthJi);
  const johu = johuRes.need;

  // ── 통관용신(通關) — 대립하는 두 세력이 팽팽할 때, 사이를 이어 흐르게 하는 오행 ──
  //   예) 금3 vs 목3 (금극목)으로 맞서면 → 수(금생수·수생목)가 통관용신.
  //   조건: 서로 극하는 두 오행이 각 3개 이상이고 세력차가 1 이내(=진짜 대립).
  let tonggwan: Ohaeng | null = null;
  let tonggwanPair: [Ohaeng, Ohaeng] | null = null;
  if (counts) {
    const OHS: Ohaeng[] = ['목', '화', '토', '금', '수'];
    let best = -1;
    for (const a of OHS) for (const b of OHS) {
      if (GEUK[a] !== b) continue; // a가 b를 극하는 쌍만
      const ca = counts[a] ?? 0, cb = counts[b] ?? 0;
      if (ca < 3 || cb < 3) continue;
      if (Math.abs(ca - cb) > 1) continue;
      // a生X, X生b 를 만족하는 X = a가 생하는 오행
      const bridge = SAENG[a];
      if (SAENG[bridge] !== b) continue;
      const power = ca + cb;
      if (power > best) { best = power; tonggwan = bridge; tonggwanPair = [a, b]; }
    }
  }

  // ── 병약용신(病藥) — 사주의 '병'(한 오행의 극단적 과다)을 덜어내는 '약' ──
  //   조건: 특정 오행이 5개 이상(8자 중 과반 이상)이고, 그게 일간 오행이 아닐 때.
  //   약 = 그 병을 극하는 오행(직접 제거).
  let byeong: Ohaeng | null = null;
  let yak: Ohaeng | null = null;
  if (counts) {
    for (const o of ['목', '화', '토', '금', '수'] as Ohaeng[]) {
      if ((counts[o] ?? 0) >= 5 && o !== dayO) {
        byeong = o;
        yak = (Object.keys(GEUK) as Ohaeng[]).find((x) => GEUK[x] === o)!;
        break;
      }
    }
  }

  // 우선순위: 조후 시급 > 병약(극단 편중) > 통관(팽팽한 대립) > 억부
  // 조후 자격 — pillars 를 받은 경우에만 검사한다(구버전 호출부 호환).
  //   계절이 치우쳤다는 것만으로는 부족하고, 조후 오행이 실제로 힘이 있어야 조후우선을 건다.
  const johuElig = pillars ? johuEligibility(johu, pillars) : { eligible: true, reason: '' as const };
  const johuUsable = !!johu && johuRes.urgent && johuElig.eligible;

  let method: Yongsin['method'];
  let primary: Ohaeng;
  if (johuUsable && johu) { method = '조후우선'; primary = johu; }
  else if (byeong && yak) { method = '병약'; primary = yak; }
  else if (tonggwan) { method = '통관'; primary = tonggwan; }
  else { method = '억부'; primary = eokbu; }
  const huisin = inseongOhaeng(primary);     // 용신을 생하는 오행
  const gisin = gwanOhaeng(primary);         // 용신을 극하는 오행

  const label = strength <= 0.38 ? '신약(돕는 기운 필요)' : strength >= 0.55 ? '신강(덜어내는 기운 필요)' : '중화(흐르게 하는 기운 필요)';
  const desc =
    `당신에게 약이 되는 핵심 기운(용신)은 ${primary}(五行)입니다. ` +
    (method === '조후우선'
      ? `계절(조후)이 너무 치우쳐, 억부용신 ${eokbu}보다 조후용신 ${eul(johu!)} 먼저 씁니다. `
      : method === '병약'
        ? `명식에 ${byeong} 기운이 지나치게 몰려(${counts?.[byeong!] ?? 0}개) 이것이 '병(病)'입니다. 그 병을 덜어내는 ${iga(yak!)} '약(藥)'이 되는 병약용신 구조예요. ${yak !== eokbu ? `억부로 보면 ${eokbu}지만, 편중부터 푸는 게 먼저입니다. ` : `억부로 봐도 같은 ${ira(eokbu)}, 처방이 한 방향으로 모이는 명료한 구조예요. `}`
        : method === '통관'
          ? `${gwa(tonggwanPair![0])} ${iga(tonggwanPair![1])} 팽팽히 맞서 기운이 막혀 있습니다. 둘 사이를 이어 흐르게 하는 ${iga(tonggwan!)} 통관용신이에요. 어느 한쪽 편을 들기보다 '다리'를 놓는 것이 답입니다. `
          : `${label} 구조라 ${eokbu} 기운이 당신을 풀어줍니다. `            + (johu && !johuElig.eligible                ? `계절로는 ${johu} 기운이 필요해 보이지만, 원국에서 ${johuElig.reason === '무근' ? '뿌리가 없어' : '합으로 묶여'} 힘을 쓰지 못하므로 조후보다 강약을 먼저 잡습니다. `                : johu ? `보조로 조후의 ${johu} 기운도 도움이 돼요. ` : '')) +
    `${primary} 기운이 들어오는 시기·환경·사람·색·방위가 당신에게 길합니다. 반대로 ${gisin} 기운이 과하면 답답해집니다.`;

  // ── 기준별 결론 펼치기 ──
  //   화면·리포트·AI 프롬프트가 이걸 그대로 쓴다. "왜 저 법을 안 썼나"에 답할 수 있어야 한다.
  const johuNote = !johu
    ? '계절이 치우치지 않아 조후 처방이 필요 없습니다.'
    : !johuRes.urgent
      ? '계절 치우침이 시급한 수준은 아니라 보조 처방으로 둡니다.'
      : !johuElig.eligible
        ? (johuElig.reason === '무근'
            ? `계절로는 ${johu} 기운이 필요하지만 원국에 뿌리가 없어 힘을 쓰지 못합니다(자격 미달).`
            : `계절로는 ${johu} 기운이 필요하지만 천간합으로 묶여 힘을 쓰지 못합니다(자격 미달).`)
        : '계절 치우침이 시급하고 원국에서도 힘을 쓸 수 있어 최우선으로 씁니다.';

  const bases: YongsinBasis[] = [
    { method: '억부', value: eokbu, adopted: method === '억부', note:
      strength <= 0.38 ? '일간이 약해 생조하는 기운으로 받칩니다.' : '일간이 넉넉해 설기하는 기운으로 흐르게 합니다.' },
    { method: '조후', value: johu, adopted: method === '조후우선', note: johuNote },
  ];
  if (byeong && yak) {
    bases.push({ method: '병약', value: yak, adopted: method === '병약', note:
      `${byeong} 기운이 ${counts?.[byeong] ?? 0}개로 몰려 '병'이 됐고, 그 병을 덜어내는 ${yak}이(가) '약'입니다.` });
  }
  if (tonggwan && tonggwanPair) {
    bases.push({ method: '통관', value: tonggwan, adopted: method === '통관', note:
      `${tonggwanPair[0]}과(와) ${tonggwanPair[1]}이(가) 맞서 막혀 있어 ${tonggwan}이(가) 다리가 됩니다.` });
  }
  // 값이 있는 기준들 사이에서 결론이 갈리는가.
  //   기각된 기준도 포함해서 본다 — 다른 앱이 그 기준을 채택했을 수 있고,
  //   사용자가 실제로 마주치는 건 그 차이이기 때문이다.
  //   단 '시급하지 않은 조후'는 제외한다. 그건 경쟁하는 기준이 아니라 보조 처방이라
  //   포함하면 무작위 표본의 47.8%에 충돌 배지가 붙어 배지가 무의미해진다(2026-09-02 실측).
  const competing = bases.filter((b) => b.value && (b.method !== '조후' || johuRes.urgent));
  const vals = Array.from(new Set(competing.map((b) => b.value) as Ohaeng[]));
  const conflict = vals.length > 1;

  return { primary, eokbu, johu, huisin, gisin, method, desc, bases, conflict };
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
  // 오행 분포(천간·지지 8자) — 종격 판정용
  const counts: Partial<Record<Ohaeng, number>> = {};
  for (const p of [pillars.year, pillars.month, pillars.day, pillars.hour]) {
    if (!p) continue;
    const g = p.ganOhaeng as Ohaeng, j = p.jiOhaeng as Ohaeng;
    counts[g] = (counts[g] ?? 0) + 1;
    counts[j] = (counts[j] ?? 0) + 1;
  }
  return {
    gyeokguk: computeGyeokguk(pillars, dayGan),
    yongsin: computeYongsin(dayGan, strength, pillars.month.ji, counts, pillars),
    johu: computeJohu(dayGan, pillars.month.ji),
  };
}

/** AI 프롬프트/요약용 한 줄 표기 */
export function gyeokYongBrief(gy: GyeokYong): string {
  // 기준이 갈리면 그 사실도 넘긴다 — AI 가 "용신은 X다"라고 단정하지 않고
  // "어느 기준으로 보느냐에 따라 갈린다"고 쓸 수 있어야 한다.
  const conflictNote = gy.yongsin.conflict
    ? ` · 기준별: ${gy.yongsin.bases.filter((b) => b.value).map((b) => `${b.method} ${b.value}${b.adopted ? '(채택)' : ''}`).join(' / ')}`
    : '';
  return `${gy.gyeokguk.name} · 용신 ${gy.yongsin.primary}(${gy.yongsin.method}) · 조후 ${gy.johu.climate}${gy.johu.need ? `(${gy.johu.need} 필요)` : ''}${conflictNote}`;
}

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
  /** 억부 후보 평가 결과(점수순). 왜 저 오행을 골랐고 다른 후보는 왜 탈락했는지의 근거 */
  eokbuCandidates: EokbuCandidate[];
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

  // A. 뿌리 — 지지 정기(본기)에 있으면 뿌리다.
  //    v7 — 지장간에만 숨어 있는 경우는 **천간에 같은 오행이 투출했을 때만** 뿌리로 친다.
  //    근거: 「寒甚而暖無氣, 反以無暖爲美」(寒暖 p.116, JCS-043) — 氣가 없는 조후는 쓰지 않는다.
  //      지장간에만 있고 천간에도 없으면 그 기운은 '드러나지 않은' 것이라 局을 덥히지 못한다.
  //      반대로 천간에 떠 있어도 지장간이 받쳐 주면 쓸 수 있다 —
  //      「若非寅時, 則年木火無根, 不能作用矣」(JCS-042 丙 투출 + 寅중 丙) ·
  //      「丑乃北方濕土, 能生金晦火而蓄水」(JCS-047 壬 투출 + 辰·丑중 癸).
  const jeonggiRoot = list.some((p) => p.jiOhaeng === need);
  const hiddenRoot = list.some((p) => p.jijanggan.some((g) => GAN_OHAENG[g] === need));
  const stemPresent = list.some((p) => GAN_OHAENG[p.gan] === need);
  const rooted = jeonggiRoot || (hiddenRoot && stemPresent);
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

// ── 억부 후보 평가(候補評價) — v6 ─────────────────────────────────────
//
// 왜 만들었나 (2026-09-02)
//   구버전은 `신약→인성 / 그 외→식상` 고정 매핑이라 **비겁·재성·관살에 도달할 수 없었다.**
//   그런데 적천수천미 원전 18건에서 임철초가 실제로 고른 십신은
//   인성5 · 식상8 · 비겁3 · 재성1 · 관살1 — 우리가 구조적으로 못 내는 답이 표본의 28%였다.
//   골든 용신 불일치 6건 중 4건(JCS-003·007·034·040)이 전부 여기서 나왔다.
//   임철초는 후보를 하나씩 지워 나간다:
//     「用官則被庚金合壞, 用食則官又不從化 … 無奈何而用財」 (JCS-034 卷二 濁氣)
//     「壬水坐戌逢戊, 梟神奪盡 … 必以丙火爲用」            (JCS-040 卷二 剛柔)
//   그래서 고정 매핑을 '후보 → 사용 가능성 평가 → 최고점 채택'으로 바꾼다.
//
// 평가 규칙 — 전부 원문에 근거가 있는 것만 넣는다
//   0. 원국에 없는 오행은 못 쓴다(무근 탈락).
//   1. 천간 투출 = 쓸 수 있게 드러나 있다 → 가산.
//   2. 지지 정기(뿌리) > 지장간(숨은 뿌리) 순으로 가산.
//   3. 천간이 전부 합으로 묶이면 큰 감점 — 「被庚金合壞」.
//   4. 그 후보를 극하는 세력이 3자 이상이면 감점 — 「梟神奪盡」.
//   5. 계열 기본 가중은 원전 빈도에서 온다(신약: 인성>비겁 / 그 외: 식상>재성·관살).
//
// ⚠️ 가중치 주의
//   숫자는 위 4건 + 기존 정답 12건이 동시에 성립하도록 맞춘 값이다. 표본 18건짜리 튜닝이므로
//   **가중치를 만질 때마다 반드시 `npm run test:golden` 과 baseline 이동을 함께 볼 것.**
export interface EokbuCandidate {
  group: '인성' | '비겁' | '식상' | '재성' | '관살';
  value: Ohaeng;
  score: number;
  usable: boolean;
  reason: string;
}

/** 원국에서 그 오행이 어떻게 존재하는가 (일간 자신의 천간은 세지 않는다 — 강약 계산과 같은 원칙) */
function presence(o: Ohaeng, pillars: { year: Pillar; month: Pillar; day: Pillar; hour: Pillar | null }) {
  const list = [pillars.year, pillars.month, pillars.day, pillars.hour].filter(Boolean) as Pillar[];
  let stems = 0, jeonggi = 0, hidden = 0;
  for (const p of list) {
    const isDayStem = p === pillars.day;
    if (!isDayStem && GAN_OHAENG[p.gan] === o) stems++;
    if (p.jiOhaeng === o) jeonggi++;
    else if (p.jijanggan.some((g) => GAN_OHAENG[g] === o)) hidden++;
  }
  return { stems, jeonggi, hidden, present: stems + jeonggi + hidden > 0 };
}

// 지지 합국(合局) — 삼합(三合)·방합(方合).
//   「支拱寅戌 … 必以丙火爲用」(JCS-040) 처럼, 지지가 국을 이루면 천간의 글자가 뿌리를 얻는다.
//   완전(3자)은 강하게, 반합(2자)은 약하게 인정한다.
const SAMHAP: [number[], Ohaeng][] = [
  [[2, 6, 10], '화'],  // 寅午戌
  [[11, 3, 7], '목'],  // 亥卯未
  [[5, 9, 1], '금'],   // 巳酉丑
  [[8, 0, 4], '수'],   // 申子辰
];
const BANGHAP: [number[], Ohaeng][] = [
  [[2, 3, 4], '목'],   // 寅卯辰
  [[5, 6, 7], '화'],   // 巳午未
  [[8, 9, 10], '금'],  // 申酉戌
  [[11, 0, 1], '수'],  // 亥子丑
];

/** 그 오행이 지지 합국으로 얼마나 받쳐지는가 — 0(없음) / 1(반합) / 2(완전국) */
export function hapguk(o: Ohaeng, pillars: { year: Pillar; month: Pillar; day: Pillar; hour: Pillar | null }): 0 | 1 | 2 {
  const jis = [pillars.year, pillars.month, pillars.day, pillars.hour].filter(Boolean).map((p) => (p as Pillar).ji);
  let best: 0 | 1 | 2 = 0;
  // 삼합은 두 글자만 모여도 국의 기운을 만든다(拱·半合) — 「支拱寅戌」(JCS-040).
  for (const [set, oh] of SAMHAP) {
    if (oh !== o) continue;
    const hit = set.filter((j) => jis.includes(j)).length;
    if (hit >= 3) return 2;
    if (hit === 2) best = 1;
  }
  // 방합은 세 글자가 다 모여야 방국으로 본다(두 글자는 인정하지 않는 견해를 따른다).
  //   ⚠️ 방합 2자를 인정하면 申酉 같은 배치가 관살을 과대평가해 JCS-009 가 깨진다(실측).
  for (const [set, oh] of BANGHAP) {
    if (oh !== o) continue;
    if (set.every((j) => jis.includes(j))) return 2;
  }
  return best;
}

/** 그 오행의 국(局)에 실제로 참여한 지지들. 국에 흡수된 지지는 다른 오행의 '뿌리'로 세지 않는다. */
function hapgukJis(o: Ohaeng, pillars: { year: Pillar; month: Pillar; day: Pillar; hour: Pillar | null }): number[] {
  const jis = [pillars.year, pillars.month, pillars.day, pillars.hour].filter(Boolean).map((p) => (p as Pillar).ji);
  for (const [set, oh] of SAMHAP) {
    if (oh !== o) continue;
    const hit = set.filter((j) => jis.includes(j));
    if (hit.length >= 3) return hit;
  }
  for (const [set, oh] of BANGHAP) {
    if (oh !== o) continue;
    if (set.every((j) => jis.includes(j))) return [...set];
  }
  return [];
}

/**
 * 從旺格에서 洩(식상)을 쓸 수 있는가.
 *   원전(卷三 六親論 從象 p.92) 「從旺者 … 要行比刦印綬則吉, **如局中印輕, 行傷食亦佳**」.
 *   조건 둘: ①印이 가볍다(인성이 지지 정기 뿌리가 없다) ②식상이 지지 정기 뿌리를 가졌다.
 *   ②에서 **일간 오행의 국에 흡수된 지지는 빼고** 센다 —
 *   巳午未 화국의 未를 '토 뿌리'로 세면 從火 명식이 從土로 뒤집힌다(JCS-006 실측).
 */
function jongwangPrimary(
  dayO: Ohaeng,
  pillars: { year: Pillar; month: Pillar; day: Pillar; hour: Pillar | null },
): Ohaeng {
  const inO = inseongOhaeng(dayO), sikO = SAENG[dayO];
  if (presence(inO, pillars).jeonggi > 0) return dayO;   // 印이 뿌리를 가졌으면 印綬가 낫다
  const absorbed = new Set(hapgukJis(dayO, pillars));
  const list = [pillars.year, pillars.month, pillars.day, pillars.hour].filter(Boolean) as Pillar[];
  const sikRooted = list.some((p) => p.jiOhaeng === sikO && !absorbed.has(p.ji));
  return sikRooted ? sikO : dayO;
}

/** 그 오행의 천간이 전부 합으로 묶여 있는가(= 쓸 수 없다) */
function allStemsBound(o: Ohaeng, pillars: { year: Pillar; month: Pillar; day: Pillar; hour: Pillar | null }): boolean {
  const list = [pillars.year, pillars.month, pillars.day, pillars.hour].filter(Boolean) as Pillar[];
  const stems = list.map((p) => p.gan);
  const mine = stems.map((g, i) => ({ g, i })).filter((x) => GAN_OHAENG[x.g] === o);
  if (!mine.length) return false;
  const bound = (g: number, i: number) =>
    [i - 1, i + 1].some((k) => {
      if (k < 0 || k >= stems.length) return false;
      return GAN_HAP_PAIR.some(([a, b]) => (a === g && b === stems[k]) || (b === g && a === stems[k]));
    });
  return mine.every((x) => bound(x.g, x.i));
}

// 가중치. 계열 기본값(base)이 크고 사용성 보정이 작은 '사전확률 + 소거' 구조다.
//   기본 선택은 원전 빈도(신약→인성 / 그 외→식상)를 따르되,
//   그 후보가 **실제로 못 쓰는 상태**일 때만 다음 후보로 내려간다.
const W = { stem: 0.6, jeonggi: 0.8, hidden: 0.2, hapguk: 1.2, hiddenOnly: -3.5, hostile: -2.0 };

/** 후보 하나를 채점한다 */
function scoreCandidate(
  group: EokbuCandidate['group'], value: Ohaeng, base: number,
  pillars: { year: Pillar; month: Pillar; day: Pillar; hour: Pillar | null },
  counts: Partial<Record<Ohaeng, number>> | undefined,
  johuNeed: Ohaeng | null,
  waiveHostile = false,
): EokbuCandidate {
  const pr = presence(value, pillars);
  if (!pr.present) {
    return { group, value, score: -Infinity, usable: false, reason: `원국에 ${value} 기운이 아예 없어 쓸 수 없습니다.` };
  }
  const hg = hapguk(value, pillars);
  let score = base + pr.stems * W.stem + pr.jeonggi * W.jeonggi + pr.hidden * W.hidden + hg * W.hapguk;
  const why: string[] = [];
  if (pr.stems) why.push('천간에 드러남');
  if (pr.jeonggi) why.push('지지에 뿌리 있음');
  if (hg) why.push(hg === 2 ? '지지가 국(局)을 이뤄 받쳐줌' : '지지 반합으로 받쳐줌');

  // 합으로 묶였는데 지지 정기 뿌리마저 없으면 못 쓴다 — 「用官則被庚金合壞」(JCS-034).
  if (allStemsBound(value, pillars) && pr.jeonggi === 0 && hg === 0) {
    return { group, value, score: -Infinity, usable: false, reason: `${value} 천간이 합으로 묶이고 지지 뿌리도 없어 쓸 수 없습니다.` };
  }
  // 지장간에만 숨어 있으면 크게 깎는다. 다만 **탈락은 아니다** —
  //   원전에도 「四柱無土, 取巳中藏戊」(JCS-001)처럼 달리 쓸 게 없으면 지장간을 취하는 예가 있다.
  if (pr.stems === 0 && pr.jeonggi === 0 && hg === 0) {
    score += W.hiddenOnly;
    why.push('지장간에만 숨어 있어 힘이 약함');
  }
  // 이 후보를 극하는 오행이 판을 덮고 있으면 깨진다(梟神奪食 류)
  const hostile = (Object.keys(GEUK) as Ohaeng[]).find((x) => GEUK[x] === value);
  if (hostile && (counts?.[hostile] ?? 0) >= 3) {
    // 뿌리(정기·합국) 없이 천간에만 떠 있으면 그냥 빼앗긴다 — 「梟神奪盡」(JCS-040).
    //   단 계절이 그 기운을 요구하면(조후 need) 살려 둔다.
    //   冬木·水多木漂에서 뿌리 없는 丙火를 그래도 쓰는 이유다(JCS-009).
    //   ※ 반대로 冬金은 원전이 火를 用神에서 명시 부정한다(JCS-003/007) — 그건 억부 후보가 아니라
    //     조후우선 분기에서 걸러진다.
    if (pr.jeonggi === 0 && hg === 0 && value !== johuNeed) {
      return { group, value, score: -Infinity, usable: false, reason: `${hostile} 세력이 판을 덮어 뿌리 없는 ${value}는 빼앗깁니다.` };
    }
    // 傷官用財에서는 일간이 財를 剋하는 것이 흠이 아니라 **用의 조건**이다 —
    //   「日主旺, 傷官亦旺, 宜用財」(傷官 p.78). 왕한 일주라야 財를 감당(能任財)한다.
    if (!waiveHostile) {
      score += W.hostile;
      why.push(`${hostile} 세력에 눌려 온전치 못함`);
    }
  }
  return { group, value, score, usable: true, reason: why.join(' · ') || '쓸 수 있음' };
}

/**
 * 강약 방향에 맞는 후보들을 만들어 점수순으로 돌려준다.
 *   신약 → 나를 돕는 쪽(인성·비겁) / 그 외 → 나를 덜어내는 쪽(식상·재성·관살)
 */
export function evaluateEokbu(
  dayO: Ohaeng, strength: number,
  pillars: { year: Pillar; month: Pillar; day: Pillar; hour: Pillar | null },
  counts?: Partial<Record<Ohaeng, number>>,
  johuNeed: Ohaeng | null = null,
  sanggwan = false,
): EokbuCandidate[] {
  const weak = strength <= 0.38;
  //  기본 가중은 적천수천미 원전 18건에서 임철초가 고른 십신 빈도다.
  //    신약: 인성5 · 비겁1   /   중화·신강: 식상8 · 재성1 · 관살1 · 비겁1
  //  신약에서 인성이냐 비겁이냐는 '무엇 때문에 약한가'로 갈린다.
  //    설기가 과한 것(식상 과다)이면 인성으로 제(制)하며 생신 — 「傷官太旺, 過於洩氣, 用神在土」(JCS-001)
  //    극이 과한 것(관살 과다)이면 몸부터 세운다(비겁 扶身) — 「全賴酉時扶身」(JCS-003/007)
  const seolCnt = counts?.[SAENG[dayO]] ?? 0;
  const gwanCnt = counts?.[gwanOhaeng(dayO)] ?? 0;
  const inBonus = seolCnt >= 3 ? 1.5 : 0;
  const bigeopBonus = gwanCnt >= 3 ? 1.5 : 0;
  // ── v7 상관격 분기 — 임철초가 직접 써 놓은 표를 그대로 옮긴다 ──
  //  『滴天髓闡微』卷二 通神論 傷官 p.78 任氏曰:
  //    「有傷官用印, 傷官用財, 傷官用刦, 傷官用傷官, 傷官用官, 其間作用種種不同, 不可執一而論也.
  //      若傷官用財者, 日主旺, 傷官亦旺, 宜用財, 有比刦而可見官, 無比刦有印綬, 不可見官.
  //      日主弱, 傷官旺, 宜用印, 可見官而不可見財.
  //      日主弱, 傷官旺, 無印綬, 宜用比刦, 喜見刦印, 忌見財官.
  //      日主旺, 無財官, 宜用傷官, 喜見財傷, 忌見官印.
  //      日主旺, 比刦多, 財星衰, 傷官輕, 宜用官, 喜見財官, 忌見傷印.」
  //  즉 상관격은 한 갈래가 아니라 다섯 갈래고, 어느 갈래인지가 용신을 정한다.
  //  v6까지는 '신강이면 식상' 한 줄이라 財·官 갈래에 도달할 수 없었다.
  //  ※ 여기서 주는 것은 **가점**이지 확정이 아니다. 무근·합거로 이미 소거된 후보는
  //    가점을 받아도 살아나지 않는다(JCS-052 「土金無根, 置之不用」이 그 안전장치다).
  const sangO = SAENG[dayO], jaeO = GEUK[dayO], gwanO2 = gwanOhaeng(dayO), inO = inseongOhaeng(dayO);
  const c = (o: Ohaeng) => counts?.[o] ?? 0;
  let inAdd = 0, biAdd = 0, sikAdd = 0, jaeAdd = 0, gwanAdd = 0;
  const extra: [EokbuCandidate['group'], Ohaeng, number][] = [];
  if (sanggwan) {
    if (weak) {
      // 日主弱 + 傷官旺 → 用印. 단 印이 없으면 用比刦(三曰 傷官用刦格).
      //   ※ '無印綬' 만으로는 부족하다. 用刦은 刦財(재물을 나눠 갖는 것)라
      //     원국에 나눌 財가 있어야 성립한다 — 「財星太重 … 幸喜未時刦財通根爲用」(JCS-069).
      //     財가 아예 없이 설기만 심한 명식은 도리어 印으로 制傷한다 —
      //     「傷官太旺, 過於洩氣, 用神在土」(JCS-001). 이 둘을 財 세력으로 가른다.
      if (c(inO) === 0 && c(jaeO) >= 2) biAdd += 3.0;
      // 印이 도리어 무거우면 印을 더 보태는 게 아니라 洩한다 —
      //   「地支印星並旺, 酉丑拱金, 必以寅木爲用」(JCS-051) · 「必以卯木爲用」(JCS-050)
      //   방향은 '무엇이 더 무거운가'로 가른다.
      //     식상 > 인성 → 설기가 문제 → 印으로 制傷生身 「必須用己土之印, 使其止水生金」(JCS-038)
      //     인성 > 식상 → 印이 문제 → 傷官으로 洩 「必以卯木爲用」(JCS-050)·「必以寅木爲用」(JCS-051)
      if (c(inO) >= 2 && c(inO) > c(sangO)) extra.push(['식상', sangO, 6.5]);
    } else {
      // 日主旺 + 傷官亦旺 + 財 있음 → 用財 (二曰 傷官用財格)
      if (c(sangO) >= 2 && c(jaeO) >= 1) jaeAdd += 5.5;
      // 日主旺 + 比刦多 + 財星衰 + 傷官輕 → 用官
      if (c(dayO) >= 3 && c(jaeO) <= 1 && c(sangO) <= 1) gwanAdd += 4.0;
    }
  }
  const defs: [EokbuCandidate['group'], Ohaeng, number][] = weak
    ? [['인성', inseongOhaeng(dayO), 6.0 + inBonus + inAdd], ['비겁', dayO, 2.0 + bigeopBonus + biAdd], ...extra]
    : [['식상', SAENG[dayO], 6.0 + sikAdd], ['재성', jaeO, 2.5 + jaeAdd], ['관살', gwanO2, 2.0 + gwanAdd]];
  return defs
    .map(([g, v, b]) => scoreCandidate(g, v, b, pillars, counts, johuNeed, g === '재성' && jaeAdd > 0))
    .sort((a, b) => b.score - a.score);
}

export function computeYongsin(dayGan: number, strength: number, monthJi: number, counts?: Partial<Record<Ohaeng, number>>, pillars?: { year: Pillar; month: Pillar; day: Pillar; hour: Pillar | null }): Yongsin {
  const dayO = GAN_OHAENG[dayGan];

  // ── 종격(從格) — 명식이 극단적으로 기울면 억부 대신 '대세를 따르는' 용신 (엣지 케이스 방어) ──
  // 임계값 주: 강약 계산에서 일간 자신을 제외(2026-08 수정)한 뒤 분포가 낮아져, 종격 임계도 재보정함.
  //  종격은 정통에서도 희귀 케이스이므로 상·하위 3% 수준에서만 발동하도록 둔다.
  //  v6 — 강약 임계만으로는 從格을 못 잡는다. 지지가 일간 오행으로 국을 이루고
  //  일간을 극하는 세력이 뿌리 없이 떠 있으면, 그건 억부가 아니라 從이다.
  //    「丙火生于巳月, 支類南方 … 癸水無根, 不如從火」(JCS-006 從火)
  const dayHapguk = pillars ? hapguk(dayO, pillars) : 0;
  const gwanO = gwanOhaeng(dayO);
  const gwanRooted = pillars
    ? (presence(gwanO, pillars).jeonggi > 0 || hapguk(gwanO, pillars) > 0)
    : true;
  if (dayHapguk === 2 && strength >= 0.70 && !gwanRooted) {
    const gisin = gwanO;
    // v7 — 從旺格의 용신은 늘 일간 오행이 아니다. 원전이 단서를 달아 놨다(卷三 六親論 從象 p.92):
    //   「從旺者, 四柱皆比刦, 無官殺之制, 有印綬之生, 旺之極者, 從其旺神也.
    //     要行比刦印綬則吉, **如局中印輕, 行傷食亦佳**.」
    //   즉 印이 가벼우면 洩(식상)이 낫다. 「全賴卯木洩其精英」(JCS-060)이 바로 그 경우다.
    //   단 식상이 지지 정기로 뿌리를 가졌을 때만 — 지장간에만 있으면 洩할 힘이 없다(JCS-048 火 유지).
    const inO2 = inseongOhaeng(dayO), sikO2 = SAENG[dayO];
    const jong = pillars ? jongwangPrimary(dayO, pillars) : dayO;
    // 희신·기신은 '채택한 용신' 기준으로 잡는다(용신이 식상으로 바뀌면 희·기도 따라 바뀐다).
    const huisinJ = inseongOhaeng(jong), gisinJ = gwanOhaeng(jong);
    const jongNote = jong === dayO
      ? `지지가 ${dayO} 국(局)을 이루고 이를 거스를 ${gwanO} 기운이 뿌리 없이 떠 있어, 대세를 따르는 종왕격으로 봅니다.`
      : `지지가 ${dayO} 국(局)을 이룬 종왕격인데 ${inO2}(인성)이 가벼워, 왕한 기운을 눌러 담기보다 ${sikO2}으로 흘려보내는 편이 낫습니다(原典 「如局中印輕, 行傷食亦佳」).`;
    return { primary: jong, eokbu: SAENG[dayO], johu: computeJohu(dayGan, monthJi).need, huisin: huisinJ, gisin: gisinJ, method: '종격',
      bases: [
        { method: '종격', value: jong, adopted: true, note: jongNote },
        { method: '억부', value: SAENG[dayO], adopted: false, note: '판이 한쪽으로 완성돼 균형(억부)을 논할 자리가 아닙니다.' },
      ],
      conflict: false, eokbuCandidates: [],
      desc: `지지가 ${dayO} 기운으로 국(局)을 이루고, 이를 거스를 ${gwanO} 기운은 뿌리 없이 떠 있습니다. 이런 명식은 억지로 균형을 맞추기보다 대세를 따르는 종왕격(從旺格)으로 봅니다. ${jong}·${huisinJ} 기운의 시기·환경이 약이고, 정면으로 거스르는 ${gisinJ} 기운이 오히려 탈이 됩니다.` };
  }

  // ── 從氣格 — 지지가 한 기세로 국을 이루고 일간이 거기 기댈 곳이 없을 때 ──
  //   원전(卷三 六親論 從象 p.92): 「從氣者, 不論財官印綬食傷之類,
  //     如氣勢在木火, 要行木火運, 氣勢在金水, 要行金水運, 反此必凶.」
  //   從旺·從勢와 달리 '무엇을 따르느냐'를 십신으로 묻지 않는다 — 판을 덮은 기세를 따를 뿐이다.
  //   근거 사례 「支全巳午未, 燥烈極矣 … 天干金水無根 … 只可順其氣勢也」(JCS-045).
  //   ⚠️ 넓게 잡으면 종격이 폭증한다. 3자 완성 국(방합·삼합) + 일간 무근(지지 정기)
  //     + 일간을 돕는 천간이 없거나 무근일 때로 좁힌다.
  if (pillars) {
    const OHS: Ohaeng[] = ['목', '화', '토', '금', '수'];
    const inO3 = inseongOhaeng(dayO);
    const dayRooted = presence(dayO, pillars).jeonggi > 0 || hapguk(dayO, pillars) > 0;
    const helperRooted = presence(inO3, pillars).jeonggi > 0 || hapguk(inO3, pillars) > 0;
    if (!dayRooted && !helperRooted) {
      const flow = OHS.find((o) => o !== dayO && o !== inO3 && hapguk(o, pillars) === 2);
      if (flow) {
        const huisin = inseongOhaeng(flow), gisin = gwanOhaeng(flow);
        return { primary: flow, eokbu: inseongOhaeng(dayO), johu: computeJohu(dayGan, monthJi).need, huisin, gisin, method: '종격',
          bases: [
            { method: '종격', value: flow, adopted: true, note: `지지가 ${flow} 기세로 국(局)을 이뤘는데 일간 ${dayO}은 뿌리도 도와줄 인성도 없어, 기세를 따르는 종기격(從氣格)으로 봅니다.` },
            { method: '억부', value: inseongOhaeng(dayO), adopted: false, note: '기댈 뿌리가 없어 균형(억부)을 논할 자리가 아닙니다.' },
          ],
          conflict: false, eokbuCandidates: [],
          desc: `지지가 ${flow} 기세로 국(局)을 이루고, 일간 ${dayO}은 지지에 뿌리도 없고 도와줄 ${inO3} 기운도 뿌리가 없습니다. 이런 명식은 억지로 나를 세우지 않고 판을 덮은 기세를 따르는 종기격(從氣格)으로 봅니다 — 원전도 「기세가 어디에 있느냐만 보라」고 합니다. ${flow} 기운의 시기·환경이 약이고, 그 기세를 정면으로 거스르는 ${gisin} 기운이 탈이 됩니다.` };
      }
    }
  }
  if (strength >= 0.90) {
    // 종왕격(전왕): 일간 세력이 판을 지배 → 왕한 기운을 따름.
    //   v7 — 여기서도 「如局中印輕, 行傷食亦佳」가 적용된다(JCS-060 「全賴卯木洩其精英」).
    const jong90 = pillars ? jongwangPrimary(dayO, pillars) : dayO;
    const huisin = inseongOhaeng(jong90), gisin = gwanOhaeng(jong90);
    return { primary: jong90, eokbu: SAENG[dayO], johu: computeJohu(dayGan, monthJi).need, huisin, gisin, method: '종격',
      bases: [
        { method: '종격', value: jong90, adopted: true, note: jong90 === dayO ? '일간 세력이 판을 지배해 대세를 따릅니다(종왕격).' : `일간 세력이 판을 지배하는 종왕격인데 ${inseongOhaeng(dayO)}(인성)이 가벼워, ${SAENG[dayO]}으로 흘려보내는 편이 낫습니다(原典 「如局中印輕, 行傷食亦佳」).` },
        { method: '억부', value: SAENG[dayO], adopted: false, note: '종격에서는 균형을 잡는 억부를 쓰지 않습니다.' },
        { method: '조후', value: computeJohu(dayGan, monthJi).need, adopted: false, note: '종격 우선 — 계절 처방보다 대세를 따릅니다.' },
      ],
      conflict: false, eokbuCandidates: [],
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
        conflict: false, eokbuCandidates: [],
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
  //  v6 — 고정 매핑에서 '후보 평가'로. pillars 없는 구버전 호출부는 옛 매핑으로 폴백한다.
  const johuPre = computeJohu(dayGan, monthJi);
  const isSanggwan = pillars ? computeGyeokguk(pillars, dayGan).key === '상관' : false;
  const eokbuCandidates = pillars ? evaluateEokbu(dayO, strength, pillars, counts, johuPre.need, isSanggwan) : [];
  const eokbuTop = eokbuCandidates.find((c) => c.usable);
  const eokbu: Ohaeng = eokbuTop ? eokbuTop.value : (strength <= 0.38 ? inseongOhaeng(dayO) : SAENG[dayO]);
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
  let yakWhy = '';
  if (counts) {
    for (const o of ['목', '화', '토', '금', '수'] as Ohaeng[]) {
      if ((counts[o] ?? 0) >= 5 && o !== dayO) {
        byeong = o;
        // ⚠️ v6 — '약'을 극(剋) 하나로 못 박지 않는다.
        //   土多金埋(JCS-010)에서 임철초는 흙을 목으로 치지 않고 물로 씻어낸다(淘洗).
        //   즉 약 후보는 ①병을 극하는 오행 ②일간을 설해 흐르게 하는 식상 — 둘 중
        //   원국에서 실제로 쓸 수 있는 쪽이다. 후보 평가로 고른다.
        const geukO = (Object.keys(GEUK) as Ohaeng[]).find((x) => GEUK[x] === o)!;
        const seolO = SAENG[dayO];
        // 병이 '인성'이면(일간을 생하는 기운의 과다 = 土多金埋·母慈滅子) 일간이 묻힌 것이므로
        // 직접 극(財破印)보다 흐름을 터주는 설(洩身)이 먼저다 — JCS-010 「淘洗」.
        const byeongIsInseong = o === inseongOhaeng(dayO);
        if (pillars) {
          const cands = [
            scoreCandidate('재성', geukO, byeongIsInseong ? 2.0 : 3.0, pillars, counts, null),
            scoreCandidate('식상', seolO, byeongIsInseong ? 3.5 : 2.0, pillars, counts, null),
          ].filter((c) => c.usable).sort((a, b) => b.score - a.score);
          if (cands.length) { yak = cands[0].value; yakWhy = cands[0].reason; }
        }
        if (!yak) yak = geukO;
        break;
      }
    }
  }

  // 우선순위: 조후 시급 > 병약(극단 편중) > 통관(팽팽한 대립) > 억부
  // 조후 자격 — pillars 를 받은 경우에만 검사한다(구버전 호출부 호환).
  //   계절이 치우쳤다는 것만으로는 부족하고, 조후 오행이 실제로 힘이 있어야 조후우선을 건다.
  const johuElig = pillars ? johuEligibility(johu, pillars) : { eligible: true, reason: '' as const };
  //  v6 — 일간이 지나치게 약하면 계절보다 '몸 세우기'가 먼저다.
  //    「金寒水冷, 過于洩氣, 全賴酉時扶身 … 非用丁火也」(JCS-007) / JCS-003 도 같은 논리.
  const tooWeakForJohu = strength <= 0.15;
  const johuUsable = !!johu && johuRes.urgent && johuElig.eligible && !tooWeakForJohu;

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

  const dropped = eokbuCandidates.filter((c) => c !== eokbuTop && !c.usable);
  const eokbuNote =
    (strength <= 0.38 ? '일간이 약해 받쳐주는 기운을 찾습니다. ' : '일간이 넉넉해 덜어내는 기운을 찾습니다. ')
    + (eokbuTop ? `${eokbuTop.group}(${eokbuTop.value}) — ${eokbuTop.reason}.` : '')
    + (dropped.length ? ` 탈락: ${dropped.map((c) => `${c.group}(${c.value}) ${c.reason}`).join(' / ')}` : '');
  const bases: YongsinBasis[] = [
    { method: '억부', value: eokbu, adopted: method === '억부', note: eokbuNote },
    { method: '조후', value: johu, adopted: method === '조후우선', note: johuNote },
  ];
  if (byeong && yak) {
    bases.push({ method: '병약', value: yak, adopted: method === '병약', note:
      `${byeong} 기운이 ${counts?.[byeong] ?? 0}개로 몰려 '병'이 됐고, 그 병을 푸는 ${iga(yak)} '약'입니다.${yakWhy ? ` (${yakWhy})` : ''}` });
  }
  if (tonggwan && tonggwanPair) {
    bases.push({ method: '통관', value: tonggwan, adopted: method === '통관', note:
      `${gwa(tonggwanPair[0])} ${iga(tonggwanPair[1])} 맞서 막혀 있어 ${iga(tonggwan)} 다리가 됩니다.` });
  }
  // 값이 있는 기준들 사이에서 결론이 갈리는가.
  //   기각된 기준도 포함해서 본다 — 다른 앱이 그 기준을 채택했을 수 있고,
  //   사용자가 실제로 마주치는 건 그 차이이기 때문이다.
  //   단 '시급하지 않은 조후'는 제외한다. 그건 경쟁하는 기준이 아니라 보조 처방이라
  //   포함하면 무작위 표본의 47.8%에 충돌 배지가 붙어 배지가 무의미해진다(2026-09-02 실측).
  const competing = bases.filter((b) => b.value && (b.method !== '조후' || johuRes.urgent));
  const vals = Array.from(new Set(competing.map((b) => b.value) as Ohaeng[]));
  const conflict = vals.length > 1;

  return { primary, eokbu, johu, huisin, gisin, method, desc, bases, conflict, eokbuCandidates };
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

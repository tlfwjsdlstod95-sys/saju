// 오늘의 운세(일일운) — 원국 × 오늘 일진, 규칙 기반 결정론 엔진 (AI 호출 0, 무작위 0)
//
// 무엇을 계산하나 (2026-09-10 재작성)
//   오늘 일진이 원국 네 기둥을 어떻게 건드리는지 **만** 본다.
//     A. 오늘 천간 × 일간 → 십신(항상 1개)
//     B. 오늘 천간 × 원국 천간 → 천간합·천간충
//     C. 오늘 지지 × 원국 지지 → 육합·충·형·해·원진
//   용신·신강약·띠·별자리·행운의 색은 쓰지 않는다(용신은 유료 리포트, 띠는 원국과 무관).
//   관계표는 hapchung.ts 의 표를 그대로 쓴다 — 원국 분석과 오늘의 운세가 다른 표를 쓰면 안 된다.
//
// 일진 교체 = **한국 날짜 00:00**. 명식의 자시 학파와 분리한다.
//   (헤아림 기본 yaja = 23시대 출생도 당일 일주 유지 → 일주 교체는 원래 00:00. 23:00 교체로 바꾸지 말 것)
//   오늘의 일진은 출생 진태양시·경도와 무관하다. 한국 달력 날짜의 일주다.
//
// 점수 = DAILY_RULE 의 식 하나. 화면의 「계산」칸은 dailyFormula() 로 **같은 상수에서** 문장을 만든다.
//   ⚠️ 예전 jitter(±3, 시드 기반 미세 변동)는 삭제했다. 같은 입력이면 점수가 같아야 한다.
import {
  CHEONGAN, CHEONGAN_HANJA, JIJI, JIJI_HANJA,
  type Ohaeng,
} from './constants';
import { sipsin } from './elements';
import { gregorianToJDN } from './astro';
import { GAN_HAP, GAN_CHUNG, YUKHAP, SAMHYEONG, SANGHYEONG, JAHYEONG, HAE, WONJIN } from './hapchung';
import type { SajuCore } from './types';

// (옛 favor·mapScore 는 2026-09-11 lib/saju/favor.ts 로 옮기고 jitter 를 없앴다)

type SipsinGroup = '비겁' | '식상' | '재성' | '관성' | '인성';
const GROUP_OF: Record<string, SipsinGroup> = {
  비견: '비겁', 겁재: '비겁', 식신: '식상', 상관: '식상',
  편재: '재성', 정재: '재성', 편관: '관성', 정관: '관성', 편인: '인성', 정인: '인성',
};

export type NatalPos = '년간' | '월간' | '일간' | '시간' | '년지' | '월지' | '일지' | '시지';
export type ZhiRelation = '합' | '충' | '형' | '삼형완성' | '해' | '원진';

/** 오늘의 운세 구조 — 문장·점수는 전부 이것에서만 나온다 */
export interface DailyStructure {
  date: string;                       // 2026-09-11 (한국 날짜)
  iljin: { stem: string; branch: string; hanja: string };
  iljin_changes_at: '00:00';
  basis: 'Asia/Seoul';
  day_master: string;
  ten_god: string;
  gan_he: { natal: NatalPos; pair: string }[];
  gan_chung: { natal: NatalPos; pair: string }[];
  zhi_hits: { natal: NatalPos; relation: ZhiRelation; pair: string }[];
  hour_pillar_known: boolean;
}

export interface DailyCategory {
  key: 'love' | 'money' | 'work' | 'health';
  label: string; emoji: string; score: number; msg: string;
  /** 점수 분해 — 화면 「계산」칸에 그대로 보인다 */
  parts: { base: number; tenGod: number; relations: number };
}

export interface DailyFortune {
  dateLabel: string;        // 2026.09.11 (금)
  cacheKey: string;         // {명식}:{YYYY-MM-DD}
  iljinKor: string;         // 병오
  iljinHanja: string;       // 丙午
  todaySipsin: string;      // 오늘 천간의 일간 기준 십신
  total: number;            // 네 칸 평균
  grade: '대길' | '길' | '평' | '주의';
  headline: string;         // 십신 한 줄
  lines: string[];          // 2~4문장 — 구조에서만
  advice: string;           // 실행 한 줄 — 관계에서만
  categories: DailyCategory[];
  structure: DailyStructure;
  /** 관계 태그(증거) — 「원국과의 관계」 칸 */
  tags: string[];
}

// ── 점수 식 — 코드와 화면이 같은 상수를 쓴다 ─────────────────────────────────
export const DAILY_RULE = {
  base: 60,
  main: 15,   // 오늘 십신이 그 분야의 주 십신
  sub: 7,     // 보조 십신
  rel: { 합: 5, 충: -10, 삼형완성: -10, 형: -6, 해: -4, 원진: -3 } as Record<'합' | ZhiRelation, number>,
  selfMul: 1.5, // 일간·일지(나 자신의 자리)에 걸린 관계
  min: 10, max: 95,
  grade: { 대길: 72, 길: 62, 평: 50 },
} as const;

const CAT_SPEC = (sex: 'M' | 'F') => [
  { key: 'love' as const, label: '애정', emoji: '❤', main: sex === 'M' ? '재성' : '관성', sub: '식상' },
  { key: 'money' as const, label: '재물', emoji: '🪙', main: '재성', sub: '식상' },
  { key: 'work' as const, label: '일·공부', emoji: '📈', main: '관성', sub: '인성' },
  { key: 'health' as const, label: '건강', emoji: '🌿', main: '인성', sub: '비겁' },
] as { key: DailyCategory['key']; label: string; emoji: string; main: SipsinGroup; sub: SipsinGroup }[];

/** 화면 「계산」칸 문구 — DAILY_RULE 에서 만든다(손으로 쓴 식이 코드와 어긋나지 않게) */
export function dailyFormula(sex: 'M' | 'F' = 'M'): string[] {
  const R = DAILY_RULE.rel, sgn = (n: number) => (n > 0 ? `+${n}` : `−${-n}`);
  return [
    `분야 점수 = ${DAILY_RULE.base} + 십신 가점 + 관계 합계 (${DAILY_RULE.min}~${DAILY_RULE.max}로 자름)`,
    `십신 가점 = 오늘 천간의 십신이 그 분야의 주 십신이면 +${DAILY_RULE.main}, 보조면 +${DAILY_RULE.sub} — ` +
      CAT_SPEC(sex).map((c) => `${c.label} ${c.main}/${c.sub}`).join(' · '),
    `관계 합계 = 합 ${sgn(R.합)} · 충 ${sgn(R.충)} · 삼형 완성 ${sgn(R.삼형완성)} · 형 ${sgn(R.형)} · 해 ${sgn(R.해)} · 원진 ${sgn(R.원진)} — 원국 한 자리에 겹치면 가장 센 마찰 하나와 합만, 일간·일지 자리면 ×${DAILY_RULE.selfMul}`,
    `총운 = 네 칸 평균 → ${DAILY_RULE.grade.대길}↑ 대길 · ${DAILY_RULE.grade.길}↑ 길 · ${DAILY_RULE.grade.평}↑ 평 · 그 아래 주의. 무작위 보정 없음 — 같은 날 같은 명식이면 점수가 같습니다.`,
  ];
}

// ── 날짜: 한국 달력 ───────────────────────────────────────────────────────────
const WEEKDAY = ['일', '월', '화', '수', '목', '금', '토'];
/** 어느 나라에서 열어도 한국 날짜(UTC+9, 서머타임 없음)로 */
export function kstDate(date: Date = new Date()) {
  const k = new Date(date.getTime() + 9 * 3600_000);
  return { y: k.getUTCFullYear(), m: k.getUTCMonth() + 1, d: k.getUTCDate(), wd: k.getUTCDay() };
}
/** 다음 한국 00:00 까지 남은 ms — 페이지를 켜 둔 채 자정을 넘기면 다시 계산하려고 */
export function msToNextKstMidnight(date: Date = new Date()): number {
  const k = date.getTime() + 9 * 3600_000;
  return 86_400_000 - (k % 86_400_000);
}
/** 오늘의 일진(한국 날짜 00:00 교체) */
export function iljinOf(date: Date = new Date()): { gan: number; ji: number; iso: string } {
  const { y, m, d } = kstDate(date);
  const idx = ((gregorianToJDN(y, m, d) + 49) % 60 + 60) % 60; // 명식 일주와 같은 앵커
  return { gan: idx % 10, ji: idx % 12, iso: `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}` };
}

// ── 관계 계산 (오늘 1기둥 × 원국 최대 4기둥) ────────────────────────────────
const pairHit = <T extends readonly [number, number, ...unknown[]]>(table: readonly T[], a: number, b: number): T | undefined =>
  table.find((t) => (t[0] === a && t[1] === b) || (t[0] === b && t[1] === a));

export type PillarRelations = Pick<DailyStructure, 'gan_he' | 'gan_chung' | 'zhi_hits'>;

/**
 * 간지 한 기둥(오늘 일진 · 그 달 월주 · 그해 세운) × 원국 네 기둥의 합·충·형·해·원진.
 * 오늘의 운세와 신년운세(월운·세운)가 **같은 함수**를 쓴다 — 표가 갈라지면 두 화면이 서로 다른 말을 한다.
 */
export function pillarRelations(tg: number, tj: number, P: SajuCore['pillars']): PillarRelations {
  const stems: { pos: NatalPos; g: number }[] = [
    { pos: '년간', g: P.year.gan }, { pos: '월간', g: P.month.gan }, { pos: '일간', g: P.day.gan },
    ...(P.hour ? [{ pos: '시간' as NatalPos, g: P.hour.gan }] : []),
  ];
  const branches: { pos: NatalPos; j: number }[] = [
    { pos: '년지', j: P.year.ji }, { pos: '월지', j: P.month.ji }, { pos: '일지', j: P.day.ji },
    ...(P.hour ? [{ pos: '시지' as NatalPos, j: P.hour.ji }] : []),
  ];

  const gan_he: DailyStructure['gan_he'] = [], gan_chung: DailyStructure['gan_chung'] = [];
  for (const s of stems) {
    const he = pairHit(GAN_HAP, tg, s.g);
    if (he) gan_he.push({ natal: s.pos, pair: `${CHEONGAN[he[0]]}${CHEONGAN[he[1]]}합` });
    const ch = pairHit(GAN_CHUNG, tg, s.g);
    if (ch) gan_chung.push({ natal: s.pos, pair: `${CHEONGAN[ch[0]]}${CHEONGAN[ch[1]]}충` });
  }

  const zhi_hits: DailyStructure['zhi_hits'] = [];
  const pairName = (a: number, b: number) => `${JIJI[a]}${JIJI[b]}`;
  for (const b of branches) {
    const hap = pairHit(YUKHAP, tj, b.j);
    if (hap) zhi_hits.push({ natal: b.pos, relation: '합', pair: pairName(hap[0], hap[1]) });
    if (Math.abs(tj - b.j) === 6) zhi_hits.push({ natal: b.pos, relation: '충', pair: pairName(Math.min(tj, b.j), Math.max(tj, b.j)) });
    const hae = pairHit(HAE, tj, b.j);
    if (hae) zhi_hits.push({ natal: b.pos, relation: '해', pair: pairName(hae[0], hae[1]) });
    const wj = pairHit(WONJIN, tj, b.j);
    if (wj) zhi_hits.push({ natal: b.pos, relation: '원진', pair: pairName(wj[0], wj[1]) });
    if (pairHit([SANGHYEONG], tj, b.j)) zhi_hits.push({ natal: b.pos, relation: '형', pair: `${pairName(SANGHYEONG[0], SANGHYEONG[1])} 상형` });
    if (tj === b.j && (JAHYEONG as readonly number[]).includes(tj)) zhi_hits.push({ natal: b.pos, relation: '형', pair: `${JIJI[tj]}${JIJI[tj]} 자형` });
  }
  // 삼형: 오늘 지지가 인사신/축술미 중 하나일 때 — 원국이 나머지 둘을 다 가지면 완성, 하나면 가담
  for (const set of SAMHYEONG) {
    if (!set.includes(tj)) continue;
    const others = set.filter((x) => x !== tj);
    const have = others.filter((o) => branches.some((b) => b.j === o));
    const label = set.map((x) => JIJI[x]).join('');
    if (have.length === 2) {
      for (const b of branches.filter((b) => others.includes(b.j))) zhi_hits.push({ natal: b.pos, relation: '삼형완성', pair: `${label} 삼형` });
    } else if (have.length === 1) {
      for (const b of branches.filter((b) => b.j === have[0])) zhi_hits.push({ natal: b.pos, relation: '형', pair: `${label} 형(가담)` });
    }
  }

  return { gan_he, gan_chung, zhi_hits };
}

export function dailyStructure(r: SajuCore, date: Date = new Date()): DailyStructure {
  const { gan: tg, ji: tj, iso } = iljinOf(date);
  const dayGan = r.dayMaster.gan;
  const P = r.pillars;
  const { gan_he, gan_chung, zhi_hits } = pillarRelations(tg, tj, P);
  return {
    date: iso,
    iljin: { stem: CHEONGAN[tg], branch: JIJI[tj], hanja: `${CHEONGAN_HANJA[tg]}${JIJI_HANJA[tj]}` },
    iljin_changes_at: '00:00', basis: 'Asia/Seoul',
    day_master: CHEONGAN[dayGan],
    ten_god: sipsin(dayGan, tg),
    gan_he, gan_chung, zhi_hits,
    hour_pillar_known: !!P.hour,
  };
}

// ── 점수 ─────────────────────────────────────────────────────────────────────
const isSelf = (p: NatalPos) => p === '일간' || p === '일지';
/**
 * 관계 합계(분야 공통). 원국의 **한 자리**(예: 일지)에 관계가 겹치면(해+원진, 충+형…)
 * 그 자리는 **가장 센 마찰 하나 + 합**만 센다 — 표에는 전부 적되, 같은 두 글자를 두세 번 벌점 주지 않는다.
 * 삼형 완성은 두 자리에 걸려도 한 번만 센다.
 */
export function relationSum(s: PillarRelations): number {
  const R = DAILY_RULE.rel;
  const byPos = new Map<NatalPos, { neg: number; pos: number }>();
  const put = (p: NatalPos, v: number) => {
    const e = byPos.get(p) ?? { neg: 0, pos: 0 };
    if (v < 0) e.neg = Math.min(e.neg, v); else e.pos = Math.max(e.pos, v);
    byPos.set(p, e);
  };
  for (const h of s.gan_he) put(h.natal, R.합);
  for (const h of s.gan_chung) put(h.natal, R.충);
  for (const h of s.zhi_hits) put(h.natal, h.relation === '삼형완성' ? 0 : R[h.relation]);
  let sum = 0;
  for (const [p, e] of byPos) sum += (e.neg + e.pos) * (isSelf(p) ? DAILY_RULE.selfMul : 1);
  const sam = s.zhi_hits.filter((h) => h.relation === '삼형완성');
  if (sam.length) sum += R.삼형완성 * (sam.some((h) => isSelf(h.natal)) ? DAILY_RULE.selfMul : 1);
  return Math.round(sum * 10) / 10;
}

/** 관계 태그(증거) — 충 먼저, 합, 그다음 형·해·원진. 오늘의 운세·신년운세 공통 */
export function relationTags(s: PillarRelations): string[] {
  return [
    ...s.gan_chung.map((h) => `${h.natal} 충 ${h.pair.replace('충', '')}`),
    ...s.zhi_hits.filter((h) => h.relation === '충').map((h) => `${h.natal} 충 ${h.pair}`),
    ...s.gan_he.map((h) => `${h.natal} 합 ${h.pair.replace('합', '')}`),
    ...s.zhi_hits.filter((h) => h.relation === '합').map((h) => `${h.natal} 합 ${h.pair}`),
    ...s.zhi_hits.filter((h) => !['충', '합'].includes(h.relation)).map((h) => `${h.natal} ${h.relation === '삼형완성' ? '삼형 완성' : h.relation} ${h.pair}`),
  ];
}

// ── 문장 — 구조에서만. 없는 관계를 말하지 않는다 ─────────────────────────────
const TEN_GOD_TEXT: Record<string, { head: string; act: string }> = {
  비견: { head: '내 힘으로 밀고 가는 날', act: '혼자 할 일과 같이 할 일을 나눠 두면 편합니다.' },
  겁재: { head: '경쟁이 붙기 쉬운 날', act: '돈이나 몫을 나누는 약속은 글로 남겨 두는 쪽이 낫습니다.' },
  식신: { head: '손이 가는 대로 만들어 내는 날', act: '미뤄 둔 작업을 하나 끝내기 좋습니다.' },
  상관: { head: '말과 표현이 앞서기 쉬운 날', act: '말은 짧게, 문서는 한 번 더 읽고 보내세요.' },
  편재: { head: '돈과 물건이 오가는 날', act: '들어오고 나간 돈을 그날 바로 적어 두세요.' },
  정재: { head: '차곡차곡 챙기는 날', act: '정산·장부 정리처럼 꼼꼼한 일이 잘 맞습니다.' },
  편관: { head: '압박과 규칙이 크게 느껴지는 날', act: '마감과 규칙을 먼저 확인하고 움직이세요.' },
  정관: { head: '약속과 책임이 드러나는 날', act: '맡은 일을 정해진 방식대로 끝내는 쪽이 낫습니다.' },
  편인: { head: '생각이 깊어지고 혼자 파고드는 날', act: '새 자료를 찾거나 혼자 공부하기 좋습니다.' },
  정인: { head: '배우고 정리하는 날', act: '정리·학습 쪽으로 쓰면 됩니다.' },
};
const POS_AREA: Record<string, string> = { 년: '집안·바깥 일', 월: '일·직장', 일: '나와 가까운 사람', 시: '계획·아랫사람' };
const area = (p: NatalPos) => POS_AREA[p[0]];
/** 받침 있으면 '과', 없으면 '와' (년간과 / 일지와) */
const gwa = (w: string) => ((w.charCodeAt(w.length - 1) - 0xac00) % 28 ? `${w}과` : `${w}와`);

function buildLines(s: DailyStructure, dayO: Ohaeng): { lines: string[]; advice: string } {
  const lines = [`오늘 일진은 ${s.iljin.hanja}(${s.iljin.stem}${s.iljin.branch}), ${s.day_master}${dayO} 일간에는 ${s.ten_god}의 날입니다.`];
  const chung = [...s.gan_chung.map((h) => ({ natal: h.natal, pair: h.pair })), ...s.zhi_hits.filter((h) => h.relation === '충').map((h) => ({ natal: h.natal, pair: `${h.pair}충` }))];
  const he = [...s.gan_he.map((h) => ({ natal: h.natal, pair: h.pair })), ...s.zhi_hits.filter((h) => h.relation === '합').map((h) => ({ natal: h.natal, pair: `${h.pair}합` }))];
  const minor = s.zhi_hits.filter((h) => h.relation === '형' || h.relation === '삼형완성' || h.relation === '해' || h.relation === '원진');
  if (chung.length) {
    const c = chung.slice(0, 2);
    lines.push(`${c.map((h) => `${gwa(h.natal)} ${h.pair}`).join(', ')}이라 ${[...new Set(c.map((h) => area(h.natal)))].join('·')} 쪽 리듬이 흔들릴 수 있습니다.`);
  }
  if (he.length) {
    const h2 = he.slice(0, 2);
    lines.push(`${h2.map((h) => `${gwa(h.natal)} ${h.pair}`).join(', ')}이 들어 ${[...new Set(h2.map((h) => area(h.natal)))].join('·')}에서 손발이 맞기 쉽습니다.`);
  }
  if (minor.length && lines.length < 3) {
    const kinds = [...new Set(minor.map((h) => (h.relation === '삼형완성' ? '삼형' : h.relation)))];
    lines.push(`${kinds.join('·')}도 걸려 있어 사소한 마찰에 신경이 쓰일 수 있습니다.`);
  }
  if (!chung.length && !he.length && !minor.length) lines.push('원국과 부딪히거나 묶이는 관계는 없습니다.');
  const advice = chung.length
    ? '충이 있는 날이라 말·계약·큰 결정은 하루 미루는 쪽에 가깝습니다.'
    : TEN_GOD_TEXT[s.ten_god].act;
  lines.push(advice);
  return { lines: lines.slice(0, 4), advice };
}

const CAT_MSG: Record<DailyCategory['key'], Partial<Record<SipsinGroup, string>>> = {
  love: { 재성: '재성이 드는 날 — 호감·만남 쪽 일이 눈에 띄기 쉽습니다.', 관성: '관성이 드는 날 — 약속·관계의 책임이 가까워집니다.', 식상: '식상이 드는 날 — 표현이 늘어 관계가 가벼워지기 쉽습니다.' },
  money: { 재성: '재성이 드는 날 — 돈·물건의 출입이 늘기 쉽습니다.', 식상: '식상이 드는 날 — 만들고 파는 쪽이 돈으로 이어지기 쉽습니다.' },
  work: { 관성: '관성이 드는 날 — 규칙·상사·평가가 가까워집니다.', 인성: '인성이 드는 날 — 배우고 준비하는 일이 잘 맞습니다.' },
  health: { 인성: '인성이 드는 날 — 쉬고 회복하는 쪽에 힘이 실립니다.', 비겁: '비겁이 드는 날 — 몸을 쓰는 일에 힘이 납니다.' },
};

/**
 * 오늘의 운세 계산.
 * @param r    이미 계산된 사주 결과(원국 4기둥·일간·성별)
 * @param date 기준 시각(기본: 지금). **한국 날짜**로 일진을 정한다.
 */
export function computeDailyFortune(r: SajuCore, date: Date = new Date()): DailyFortune {
  const s = dailyStructure(r, date);
  const { y, m, d, wd } = kstDate(date);
  const sex = r.input.sex ?? 'M';
  const group = GROUP_OF[s.ten_god];
  const rel = relationSum(s);

  const categories: DailyCategory[] = CAT_SPEC(sex).map((c) => {
    const tenGod = group === c.main ? DAILY_RULE.main : group === c.sub ? DAILY_RULE.sub : 0;
    const score = Math.max(DAILY_RULE.min, Math.min(DAILY_RULE.max, Math.round(DAILY_RULE.base + tenGod + rel)));
    let msg = (tenGod ? CAT_MSG[c.key][group] : undefined) ?? `오늘 십신(${s.ten_god})은 이 분야를 직접 건드리지 않습니다.`;
    if (rel < 0) msg += ` 원국과의 마찰(${rel})이 함께 들어 있습니다.`;
    else if (rel > 0) msg += ` 원국과의 합(+${rel})이 더해졌습니다.`;
    return { key: c.key, label: c.label, emoji: c.emoji, score, msg, parts: { base: DAILY_RULE.base, tenGod, relations: rel } };
  });
  const total = Math.round(categories.reduce((a, c) => a + c.score, 0) / categories.length);
  // 등급 경계 — 명식 400 × 30일 분포(p25 50 · p50 58 · p75 65 · p90 71, 2026-09-10)에 맞춘 값
  const grade: DailyFortune['grade'] = total >= DAILY_RULE.grade.대길 ? '대길' : total >= DAILY_RULE.grade.길 ? '길' : total >= DAILY_RULE.grade.평 ? '평' : '주의';

  const { lines, advice } = buildLines(s, r.dayMaster.ohaeng);
  const tags = relationTags(s);

  const chartKey = [r.input.year, r.input.month, r.input.day, r.input.unknownTime ? 'x' : `${r.input.hour}${r.input.minute ?? 0}`, sex,
    Math.round((r.input.longitude ?? 126.978) * 100), r.input.jasiMode ?? 'yaja'].join('-');
  return {
    dateLabel: `${y}.${String(m).padStart(2, '0')}.${String(d).padStart(2, '0')} (${WEEKDAY[wd]})`,
    cacheKey: `${chartKey}:${s.date}`,
    iljinKor: `${s.iljin.stem}${s.iljin.branch}`,
    iljinHanja: s.iljin.hanja,
    todaySipsin: s.ten_god,
    total, grade,
    headline: TEN_GOD_TEXT[s.ten_god].head,
    lines, advice, categories, structure: s, tags,
  };
}

// 경계 진단 — 「당신 명식이 다른 곳과 갈릴 수 있는 지점」
//
// 이 화면의 존재 이유: 우리가 파는 건 「더 잘 맞힌다」가 아니라 **「계산이 맞다」** 이고,
// 그 증명은 남의 정확도가 아니라 **내 명식의 갈림길**일 때 힘이 생긴다.
//   자랑:  "저희는 진태양시까지 봅니다"
//   증거:  "이 보정을 안 하는 곳에서는 **당신 시주가 갑오가 아니라 을미**로 나옵니다"
//
// 만드는 방법은 **엔진을 한 번 더 돌리는 것뿐**이다. 결정론이라 같은 입력이면 같은 출력이고,
// 스위치(`trueSolar`·`dst`·`jieqi`·`jasiMode`)를 하나씩만 꺼서 **한 요인만 갈아끼운다.**
// 복합 변종(여러 개를 한꺼번에 끈 '대충 만든 앱')은 만들지 않는다 — 무엇이 원인인지 못 읽게 되니까.
//
// ⚠️ 두 성격을 **한 표에 섞지 않는다**(스펙 부록 A4):
//   · 계산 생략(clock_only·jieqi_date·no_dst) → **우리가 옳다.**
//   · 학파 선택(조자시)                      → **정답이 둘이다. 중립을 지킨다.**
//   섞어 놓으면 「헤아림도 여러 학파 중 하나」로 읽혀서, 우리 강점(계산 정확도)이 학파 논쟁에 묻힌다.
import { computeSaju } from './index';
import { nearestJeol } from './solarTerms';
import { dateToJD } from './astro';
import type { BirthInput, SajuResult, Pillar } from './types';

export type VariantKey = 'clock_only' | 'jieqi_date' | 'no_dst' | 'zaozi';

export interface VariantDiff {
  key: VariantKey;
  /** 계산 생략인가, 학파 선택인가 — 화면에서 **블록을 나누는** 기준 */
  kind: '생략' | '학파';
  label: string;
  /** 무엇을 빼거나 바꿨는지 한 줄 */
  what: string;
  /** 바뀌는 기둥 이름 */
  changed: string[];
  /** 우리 계산 / 그 방식 (바뀐 기둥만) */
  ours: string;
  theirs: string;
}

export interface BoundaryDiag {
  /** 가장 가까운 절입과 시간차(분). 음수 = 아직 안 왔음 */
  jeolgi: { name: string; hanja: string; whenKST: string; deltaMin: number; sameDay: boolean; near: boolean };
  trueSolar: { longitudeCorrectionMin: number; eotMin: number; apparentSolarDateTime: string; totalShiftMin: number };
  dstApplied: boolean;
  jasiType: '일반' | '야자시' | '조자시' | null;
  unknownTime: boolean;
  variants: VariantDiff[];
  /** 하나라도 갈리는가 — 아니면 화면은 **안심 카드**를 띄운다(겁을 주지 않는다는 증거) */
  anyChange: boolean;
}

const gz = (p: Pillar | null) => (p ? `${p.ganKor}${p.jiKor}(${p.ganHanja}${p.jiHanja})` : '—');
const KEYS = ['year', 'month', 'day', 'hour'] as const;
const NAMES: Record<(typeof KEYS)[number], string> = { year: '년주', month: '월주', day: '일주', hour: '시주' };

/** 두 명식에서 **달라진 기둥만** 뽑는다 */
function diffPillars(a: SajuResult, b: SajuResult) {
  const changed: string[] = [], ours: string[] = [], theirs: string[] = [];
  for (const k of KEYS) {
    const pa = a.pillars[k], pb = b.pillars[k];
    if (gz(pa) === gz(pb)) continue;
    changed.push(NAMES[k]); ours.push(gz(pa)); theirs.push(gz(pb));
  }
  return { changed, ours: ours.join(' · '), theirs: theirs.join(' · ') };
}

export function computeBoundary(input: BirthInput, base: SajuResult): BoundaryDiag {
  const c = base.corrected;
  const lon = input.longitude ?? 126.978;
  const clockHour = input.unknownTime ? 12 : (input.hour ?? 12);
  const civilOffset = (c.standardMeridian === 135 ? 9 : 8.5) + (c.summerTimeApplied ? 1 : 0);
  const birthKSTjd = dateToJD(input.year, input.month, input.day, clockHour - civilOffset, input.minute ?? 0, 0) + 9 / 24;

  const nj = nearestJeol(birthKSTjd);
  const n = nj.nearest;
  const njDate = new Date(Date.UTC(1970, 0, 1) + (n.kstJd - 2440587.5) * 86400000);
  const pad = (x: number) => String(x).padStart(2, '0');
  const whenKST = `${njDate.getUTCFullYear()}-${pad(njDate.getUTCMonth() + 1)}-${pad(njDate.getUTCDate())} ${pad(njDate.getUTCHours())}:${pad(njDate.getUTCMinutes())}`;
  const sameDay = njDate.getUTCFullYear() === input.year && njDate.getUTCMonth() + 1 === input.month && njDate.getUTCDate() === input.day;

  // 어떤 변종을 실제로 돌릴지 — **달라질 수 있는 것만** 돌린다(그 외엔 정의상 같은 결과라 계산 낭비).
  const runs: Array<{ key: VariantKey; kind: '생략' | '학파'; label: string; what: string; opt: Partial<BirthInput>; when: boolean }> = [
    {
      key: 'clock_only', kind: '생략', label: '진태양시 보정을 안 하면',
      what: '출생지 경도 시차와 균시차를 빼고 시계 시각을 그대로 쓰는 방식',
      opt: { trueSolar: false }, when: true,
    },
    {
      key: 'jieqi_date', kind: '생략', label: '절입을 날짜로만 보면',
      what: '절기가 든 시각을 안 보고 「그 날짜면 넘어간 것」으로 처리하는 방식',
      opt: { jieqi: 'date_only' }, when: sameDay,
    },
    {
      key: 'no_dst', kind: '생략', label: '서머타임을 되돌리지 않으면',
      what: '시계가 1시간 앞당겨져 있던 기간인데 그대로 계산하는 방식',
      opt: { dst: false }, when: c.summerTimeApplied,
    },
    {
      key: 'zaozi', kind: '학파', label: '자시 학파를 바꾸면',
      what: '23시대 출생을 다음 날로 넘겨 보는 정자시(조자시) 학파',
      opt: { jasiMode: c.jasiMode === 'jeongja' ? 'yaja' : 'jeongja' }, when: c.jasiType === '야자시',
    },
  ];

  const variants: VariantDiff[] = [];
  for (const r of runs) {
    if (!r.when) continue;
    const alt = computeSaju({ ...input, ...r.opt });
    const d = diffPillars(base, alt);
    if (!d.changed.length) continue;   // 갈리지 않으면 표에 올리지 않는다 — 없는 불안을 만들지 않는다
    variants.push({ key: r.key, kind: r.kind, label: r.label, what: r.what, ...d });
  }

  return {
    jeolgi: { name: n.name, hanja: n.hanja, whenKST, deltaMin: n.deltaMin, sameDay, near: Math.abs(n.deltaMin) <= 24 * 60 },
    trueSolar: {
      longitudeCorrectionMin: c.longitudeCorrectionMin,
      eotMin: c.equationOfTimeMin,
      apparentSolarDateTime: c.apparentSolarDateTime,
      totalShiftMin: Math.round((c.longitudeCorrectionMin + c.equationOfTimeMin) * 10) / 10,
    },
    dstApplied: c.summerTimeApplied,
    jasiType: c.jasiType,
    unknownTime: !!input.unknownTime,
    variants,
    anyChange: variants.length > 0,
  };
}

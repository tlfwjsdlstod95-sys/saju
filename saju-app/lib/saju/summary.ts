// 결과 상단 요약 카드 — 「이 명식이 어떤 상태인가」를 한 자리에 모은다 (카드사심사후_수정대기목록.md §E-4 ②)
//
// 한 카드에 네 가지만 싣는다.
//   ① 상태 태그 3종 — 안정 / 경계 / 시각 미상. **boundary.ts 가 이미 계산한 값만** 읽는다(새 판정 없음).
//   ② 한 줄 진단   — 일주 · 강약 · 오행 쏠림. **무료로 이미 보이는 사실만** 모은다.
//                    ⚠️ 격국·용신은 유료 잠금(세로 자르기)이라 여기 절대 싣지 않는다 — 요약이 게이트 구멍이 되면 안 된다.
//   ③ 경계 알림    — 원래 명식 카드 안에 있던 배지(2026-09-10)를 그대로 옮겼다. 규칙·문구 동일.
//   ④ 계산 기준    — 진태양시 · 자시 학파 · 절입 · 서머타임. 「무엇으로 계산했나」를 숫자로.
//
// 순수 함수라 화면 없이 검증한다(scripts/test-summary.ts).
import { strengthTier } from './elements';
import type { SajuCore } from './types';
import type { BoundaryDiag } from './boundary';
import { computeHapchung } from './hapchung';
import { cardLen, CARD_LEN } from './cardLint';

export type SummaryTagKey = 'stable' | 'boundary' | 'unknown_time';
export interface SummaryTag {
  key: SummaryTagKey;
  label: string;
  /** safe=골드 체크 / warn=골드 경고(빨강 아님 — 틀렸다가 아니라 갈린다) / mute=회색 */
  tone: 'safe' | 'warn' | 'mute';
}

export interface ResultSummary {
  tags: SummaryTag[];
  /** 한 줄 진단 조각들 — 화면에서 「 · 」로 잇는다 */
  diagnosis: string[];
  /** 경계 알림(최대 2줄). 비면 safeLine 을 쓴다 */
  notes: string[];
  /** 알림이 없을 때 조용한 한 줄 */
  safeLine: string | null;
  /** safeLine 옆 링크 — 시각 미상이면 시각 미상 카드로 보낸다 */
  safeHref: string;
  criteria: Array<{ k: string; v: string }>;
  /**
   * 「한눈에」 확장 2줄 (2026-09-23 B안) — **이미 무료로 쓰는 필드만**.
   *   +1 겉에 나온 십신 / 여덟 글자에 없는 십신 묶음 (조후 필요 오행·용신 아님)
   *   +2 원국 안에서 맞닿은 관계 (충·형·해·파·합) — 없으면 생략
   *   (+3 대운 요약은 대운 카드와 겹쳐서 여기선 생략)
   * 한 줄 = 한 문장, 무료 카드 길이 규칙(cardLint: 하드 36자)을 넘으면 짧은 형태로 줄이거나 뺀다.
   */
  scenes: string[];
}

export function fmtDelta(min: number): string {
  const a = Math.abs(Math.round(min));
  const d = Math.floor(a / 1440), h = Math.floor((a % 1440) / 60), m = a % 60;
  if (d) return `${d}일 ${h}시간`;
  if (h) return `${h}시간 ${m}분`;
  return `${m}분`;
}

/** 받침 있으면 「과」, 없으면 「와」 */
const wa = (w: string) => { const c = w.charCodeAt(w.length - 1) - 0xac00; return c >= 0 && c <= 11171 && c % 28 ? '과' : '와'; };

/** 받침 있으면 a, 없으면 b */
const jo = (w: string, a: string, b: string) => { const c = w.charCodeAt(w.length - 1) - 0xac00; return c >= 0 && c <= 11171 && c % 28 ? a : b; };
const fits = (x: string) => cardLen(x) <= CARD_LEN.hard;
const GROUPS: Record<string, string[]> = { 비겁: ['비견', '겁재'], 식상: ['식신', '상관'], 재성: ['편재', '정재'], 관성: ['편관', '정관'], 인성: ['편인', '정인'] };

function sceneLines(r: SajuCore): string[] {
  const out: string[] = [];
  // +1 겉(천간)에 나온 십신 / 여덟 글자에 없는 묶음 — 일간 자신은 뺀다. 시각 미상이면 시주가 없으니 저절로 빠진다.
  //   2026-09-23 2차: 「천간에 ~이 나와 있고, ~은 여덟 글자에 없습니다」 → 짧게 두 문장.
  const P = r.pillars;
  const vis = [...new Set([P.month, P.hour, P.year].filter(Boolean).map((p) => p!.ganSipsin).filter(Boolean) as string[])];
  const absent = Object.entries(GROUPS).filter(([, ks]) => ks.every((k) => !(r.sipsinSummary[k] > 0))).map(([g]) => g);
  if (vis.length) {
    const head = `겉에는 ${vis.join('·')}입니다.`;
    const a = absent.join('·');
    const full = absent.length ? `${head} 여덟 글자에 ${a}${jo(a, '이', '가')} 없습니다.` : head;
    out.push(fits(full) ? full : head);
  }
  // +2 원국 안 관계 — 「원국 안에서 사와 해가 이미 부딪칩니다(충).」 글자를 직접 불러야 「내 얘기」가 된다.
  const hc = computeHapchung(P);
  const bad = hc.filter((h) => h.tone === 'bad'), good = hc.filter((h) => h.tone === 'good');
  // 글자는 이름이 아니라 **실제 자리(positions)** 에서 뽑는다 — 반합 이름은 삼합 세 글자를 다 적어서(「인오술 반합」)
  //   이름으로 부르면 원국에 없는 글자까지 「묶여 있다」고 말하게 된다.
  const POSMAP: Record<string, 'year' | 'month' | 'day' | 'hour'> = { 년: 'year', 월: 'month', 일: 'day', 시: 'hour' };
  const charsOf = (h: { type: string; positions: string[]; name: string }) => {
    const cs = h.positions.map((pos) => { const pl = P[POSMAP[pos]]; return pl ? (h.type === '천간합' ? pl.ganKor : pl.jiKor) : ''; }).filter(Boolean);
    if (!cs.length) return [...(h.name.split(' ')[0])];
    const uniq = [...new Set(cs)];
    return uniq.length === 1 ? [uniq[0], uniq[0]] : uniq;   // 같은 글자끼리(자형)면 「진 둘이」, 아니면 겹친 글자는 한 번만
  };
  // 종류는 이름이 아니라 type 에서 — 「해묘미 삼합」의 「해」를 해(害)로 읽지 않게
  const kind = (h: { name: string; type: string }) => (h.name.includes('자형') ? '자형' : /반합/.test(h.name) ? '반합' : /삼합/.test(h.name) ? '삼합' : h.type);
  const subject = (cs: string[]) => {
    if (cs.length === 2 && cs[0] === cs[1]) return `${cs[0]} 둘이`;
    if (cs.length === 2) return `${cs[0]}${jo(cs[0], '과', '와')} ${cs[1]}${jo(cs[1], '이', '가')}`;
    const j = cs.join('·'); return `${j}${jo(j, '이', '가')}`;
  };
  const line = (list: { name: string; type: string; positions: string[] }[], verb: string) => {
    const h = list[0], more = list.length > 1 ? ` 외 ${list.length - 1}개` : '';
    const full = `원국 안에서 ${subject(charsOf(h))} ${verb}(${kind(h)}${more}).`;
    return fits(full) ? full : `원국 안에서 ${subject(charsOf(h))} ${verb}.`;
  };
  if (bad.length) out.push(line(bad, '이미 부딪칩니다'));
  else if (good.length) out.push(line(good, '이미 묶여 있습니다'));
  return out;
}

const OH = ['목', '화', '토', '금', '수'] as const;
const TIER_LABEL = { weak: '신약', mid: '중화', strong: '신강' } as const;

/** 경계 알림 — 2026-09-10 명식표 배지 규칙 그대로(순서·문구 동일). 실제로 갈리는 경우에만 「갈린다」고 말한다. */
function boundaryNotes(b: BoundaryDiag): string[] {
  const notes: string[] = [];
  const changed = (k: string) => b.variants.some((v) => v.key === k);
  if (changed('zaozi'))
    notes.push(`${b.jasiType ?? '자시'} 구간 출생 — 학파에 따라 일주가 두 갈래로 갈려요`);
  if (changed('jieqi_date'))
    notes.push(`절기(${b.jeolgi.name}) 경계 출생 — 날짜만 보면 월주·년주가 달라져요`);
  else if (Math.abs(b.jeolgi.deltaMin) <= 60)
    notes.push(`절기(${b.jeolgi.name})까지 ${fmtDelta(b.jeolgi.deltaMin)} — 분 단위로 봐야 갈리지 않는 자리예요`);
  if (b.dstApplied) notes.push('서머타임 기간 출생 — 시주를 1시간 되돌려 계산했어요');
  if (!notes.length && changed('clock_only'))
    notes.push('진태양시 보정 대상 — 보정을 안 하면 시주가 달라져요');
  return notes;
}

export function buildSummary(r: SajuCore, b?: BoundaryDiag | null): ResultSummary {
  const unknownTime = !!r.input.unknownTime || !r.pillars.hour;
  const notes = b ? boundaryNotes(b) : [];

  // ── ① 상태 태그 ──
  // 「경계」는 **사실**로만 정한다: 변종이 하나라도 실제로 갈리거나, 절입까지 한 시간 이내.
  // (서머타임 안내만 있고 아무것도 안 갈리면 경계가 아니다 — 「이미 되돌려 계산했다」는 사실 안내일 뿐)
  const isBoundary = !!b && (b.anyChange || Math.abs(b.jeolgi.deltaMin) <= 60);
  // 명식표 배지 규칙은 알림이 있으면 진태양시 줄을 생략했다. 요약 카드는 태그의 근거를 빠뜨리지 않는다 —
  // 서머타임 안내에 가려 진태양시 갈림이 안 보이던 경우(1948~51·1987~88 출생 일부)를 채운다.
  if (isBoundary && b!.variants.some((v) => v.key === 'clock_only') && !notes.some((n) => n.startsWith('진태양시')))
    notes.push('진태양시 보정 대상 — 보정을 안 하면 시주가 달라져요');
  const tags: SummaryTag[] = [];
  if (isBoundary) {
    const school = b!.variants.some((v) => v.kind === '학파');
    const omit = b!.variants.some((v) => v.kind === '생략') || Math.abs(b!.jeolgi.deltaMin) <= 60;
    tags.push({
      key: 'boundary', tone: 'warn',
      label: omit && school ? '계산·학파에 따라 갈리는 명식' : school ? '자시 학파에 따라 갈리는 명식' : '계산 방식에 따라 갈리는 명식',
    });
  } else if (!unknownTime && b) {
    // 경계 진단이 없으면(옛 세션 캐시 등) 「멀다」고 말할 근거가 없다 → 태그를 달지 않는다
    tags.push({ key: 'stable', tone: 'safe', label: '경계에서 먼 명식' });
  }
  if (unknownTime) tags.push({ key: 'unknown_time', tone: 'mute', label: '시각 미상 — 시주 제외' });

  // ── ② 한 줄 진단 (무료로 이미 보이는 값만) ──
  const d = r.pillars.day;
  const diagnosis: string[] = [`${d.ganKor}${d.jiKor}(${d.ganHanja}${d.jiHanja}) 일주`];
  diagnosis.push(`${TIER_LABEL[strengthTier(r.dayMasterStrength)]} ${Math.round(r.dayMasterStrength * 100)}%`);
  const st = r.ohaeng.status;
  const many = OH.filter((o) => st[o] === '과다');
  const none = OH.filter((o) => st[o] === '부족');
  if (many.length) diagnosis.push(`${many.join('·')} 많음`);
  if (none.length) diagnosis.push(`${none.join('·')} 없음`);
  if (!many.length && !none.length) diagnosis.push('오행 고른 편');
  // 무료 카드 하드 36자(cardLint) — 넘치면 「많음」 조각부터 뺀다(없는 오행이 더 정보가 크다)
  if (cardLen(diagnosis.join(' · ')) > CARD_LEN.hard && many.length) diagnosis.splice(diagnosis.findIndex((x) => x.endsWith('많음')), 1);

  // ── 알림이 없을 때 한 줄 — 시각 미상이면 「어디서 보든 같다」고 말하지 않는다(시주가 붙으면 갈릴 수 있다) ──
  let safeLine: string | null = null;
  if (!isBoundary && b) {
    // 시각 미상: 「년·월·일은 같다」도 말하지 않는다 — 절입일·자정 직후면 시각에 따라 갈린다(§E-4 ③ 카드가 판정).
    safeLine = unknownTime
      ? '시주는 비우고, 확정된 것만 아래에 나눴어요.'
      : '어디서 계산해도 이 네 기둥 그대로입니다.';
  }

  // ── ④ 계산 기준 ──
  const c = r.corrected;
  const criteria: ResultSummary['criteria'] = [
    { k: '진태양시', v: unknownTime ? '시각 미상' : `${c.apparentSolarDateTime.slice(11, 16)} (경도 ${c.longitudeCorrectionMin}분 · 균시차 ${c.equationOfTimeMin}분)` },
    { k: '자시', v: c.jasiMode === 'jeongja' ? '정자시 학파' : '야자시 학파(기본값)' },
    { k: '절입', v: b ? `분 단위 · 가장 가까운 ${b.jeolgi.name}${wa(b.jeolgi.name)} ${fmtDelta(b.jeolgi.deltaMin)} ${b.jeolgi.deltaMin >= 0 ? '뒤' : '앞'}` : '분 단위' },
    { k: '서머타임', v: c.summerTimeApplied ? '적용 기간 — 1시간 되돌림' : '해당 없음' },
  ];

  return { tags, diagnosis, notes: isBoundary ? notes.slice(0, 2) : [], safeLine, safeHref: unknownTime ? '#time-unknown' : '#boundary', criteria, scenes: sceneLines(r) };
}

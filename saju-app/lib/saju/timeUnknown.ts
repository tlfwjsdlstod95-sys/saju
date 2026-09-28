// 시각 미상 분기 (카드사심사후_수정대기목록.md §E-4 ③)
//
// 태어난 시각을 모르는 사람에게 「무엇이 확정이고 무엇이 아직 모르는 것인지」를 **계산으로** 나눠 준다.
// 방법은 경계 진단과 같다 — 엔진을 다시 돌린다. 이번엔 스위치가 아니라 **그날 하루의 시계 시각**을 훑는다.
//
//   확정      = 00:00~23:59 어느 시각이든 같은 값 (년주·월주·일주 중 해당하는 것)
//   아직 모름 = 시각에 따라 달라지는 값 — 시주는 늘, 절입일이면 월주(·입춘이면 년주),
//               자정 직후 출생이면 일주(진태양시로는 아직 전날), 그리고 대운 시작 나이
//
// ⚠️ 「정오로 가정했다」는 말로 끝내지 않는다. 정오 가정은 계산 편의일 뿐, 그 값이 맞다는 보장이 아니다.
// ⚠️ 시각 후보에 **순위·확률을 붙이지 않는다** — 어느 시각이 더 그럴듯한지 우리는 모른다.
//    시간 길이(몇 분짜리 구간인지)만 사실로 보여준다.
import { computeSaju } from './index';
import type { BirthInput, Pillar, SajuResult } from './types';

export interface TimeSpan { value: string; from: string; to: string; minutes: number }
export interface PillarState {
  pillar: '년주' | '월주' | '일주';
  /**
   * fixed  = 하루 내내 같다
   * mostly = 한 값이 하루의 95% 이상 — 예외 구간이 짧다(대개 자정 직후: 진태양시로는 아직 전날)
   * split  = 하루 중간에서 갈린다(절입일 출생) — 이건 「모른다」가 맞다
   */
  status: 'fixed' | 'mostly' | 'split';
  /** fixed·mostly 의 대표값. split 이면 null */
  main: string | null;
  spans: TimeSpan[];
}
export interface TimeUnknownScan {
  pillars: PillarState[];
  /** 시주 후보 — 시계 시각 구간별(보통 12~13개) */
  hour: TimeSpan[];
  /** 첫 대운 나이 범위 */
  startAge: { min: number; max: number };
  /** 강약 라벨 범위(시주가 붙으면 바뀔 수 있다) */
  strength: string[];
}

const gz = (p: Pillar | null) => (p ? `${p.ganKor}${p.jiKor}(${p.ganHanja}${p.jiHanja})` : '—');
const hhmm = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
const tier = (s: number) => (s <= 0.38 ? '신약' : s >= 0.55 ? '신강' : '중화');   // STRENGTH_CUT 과 같은 값

type Snap = { y: string; m: string; d: string; h: string; age: number; st: string };

export function scanUnknownTime(input: BirthInput): TimeUnknownScan {
  const base: BirthInput = { ...input, unknownTime: false };
  const cache = new Map<number, Snap>();
  const at = (min: number): Snap => {
    const hit = cache.get(min);
    if (hit) return hit;
    const r: SajuResult = computeSaju({ ...base, hour: Math.floor(min / 60), minute: min % 60 });
    const s = {
      y: gz(r.pillars.year), m: gz(r.pillars.month), d: gz(r.pillars.day), h: gz(r.pillars.hour),
      age: r.luck.startAge ?? Math.max(1, Math.round(r.luck.daewoonAge)), st: tier(r.dayMasterStrength),
    };
    cache.set(min, s);
    return s;
  };
  const key = (s: Snap) => `${s.y}|${s.m}|${s.d}|${s.h}`;

  // 10분 간격으로 훑고, 값이 바뀐 자리만 1분 단위로 좁힌다(이분 탐색) — 1,440번 대신 약 200번.
  const STEP = 10;
  const cuts: number[] = [0];            // 새 구간이 시작하는 분
  let prev = at(0);
  for (let t = STEP; t < 1440 + STEP; t += STEP) {
    const tt = Math.min(t, 1439);
    const cur = at(tt);
    if (key(cur) !== key(prev)) {
      let lo = tt - STEP, hi = tt;       // lo 는 prev 와 같고 hi 는 다르다
      while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (key(at(mid)) === key(prev)) lo = mid; else hi = mid; }
      cuts.push(hi);
    }
    prev = cur;
    if (tt === 1439) break;
  }

  // 구간 → 기둥별 span
  const segs = cuts.map((c, i) => ({ from: c, to: (cuts[i + 1] ?? 1440) - 1, s: at(c) }));
  const spansOf = (f: (s: Snap) => string): TimeSpan[] => {
    const out: TimeSpan[] = [];
    for (const g of segs) {
      const v = f(g.s), last = out[out.length - 1];
      const len = g.to - g.from + 1;
      if (last && last.value === v) { last.to = hhmm(g.to); last.minutes += len; }
      else out.push({ value: v, from: hhmm(g.from), to: hhmm(g.to), minutes: len });
    }
    return out;
  };
  const state = (pillar: PillarState['pillar'], spans: TimeSpan[]): PillarState => {
    if (spans.length === 1) return { pillar, status: 'fixed', main: spans[0].value, spans };
    // 같은 값이 흩어져 있을 수 있어(자정 앞뒤) 값별로 분을 더한다
    const tot = new Map<string, number>();
    for (const sp of spans) tot.set(sp.value, (tot.get(sp.value) ?? 0) + sp.minutes);
    const [topV, topM] = [...tot.entries()].sort((a, b) => b[1] - a[1])[0];
    // 일주가 갈리는 건 늘 **자정 직후**(진태양시로는 아직 전날)다 — 서머타임이면 그 창이 1시간 반까지 길어지지만
    // 하루 중간에서 갈리는 일은 없다. 그래서 일주는 길이와 상관없이 「거의 확정 + 예외」로 보여준다.
    // 년·월은 절입 시각에서 갈린다 — 예외가 하루의 5% 미만(약 72분)일 때만 「거의 확정」.
    const mostly = pillar === '일주' ? topM >= 720 : topM >= 1440 * 0.95;
    return mostly
      ? { pillar, status: 'mostly', main: topV, spans }
      : { pillar, status: 'split', main: null, spans };
  };
  const pillars = [state('년주', spansOf((s) => s.y)), state('월주', spansOf((s) => s.m)), state('일주', spansOf((s) => s.d))];

  const ages = [...cache.values()].map((s) => s.age);
  const order = ['신약', '중화', '신강'];
  const strength = order.filter((t) => [...cache.values()].some((s) => s.st === t));

  return {
    pillars,
    hour: spansOf((s) => s.h),
    startAge: { min: Math.min(...ages), max: Math.max(...ages) },
    strength,
  };
}

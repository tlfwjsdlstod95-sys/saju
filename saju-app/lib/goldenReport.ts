// 고전 원전 대조 결과를 **빌드 시점에 직접 계산**한다.
//
// 왜 파일로 안 떨구고 계산하나
//   손으로 쓴 표나 커밋된 JSON 은 엔진을 고치는 순간 낡는다. /accuracy 가 낡은 숫자를 걸고 있으면
//   그 페이지의 존재 이유(정직한 공개)가 무너진다. 그래서 페이지가 골든 케이스를 읽고
//   **지금 배포된 엔진으로 다시 판정해** 표를 만든다. ENGINE_VERSION 이 올라가면 표도 자동으로 바뀐다.

import goldenRaw from '@/scripts/golden-cases.json';
import { dayMasterStrength } from './saju/elements';
import { computeGyeokYong } from './saju/gyeokyong';
import { chartFromGanji } from './saju/fromGanji';
import { ENGINE_VERSION } from './saju/version';

export interface GoldenRow {
  id: string;
  book: string;
  chapter: string;
  page: string;
  expected: string;
  got: string;
  method: string;   // 엔진이 채택한 판정 방법(억부/조후우선/병약/통관/종격)
  match: boolean;
  engine: number;
  /** 채점에 들어간 채로 규칙이 바뀐 첫 버전. 'none' 만 홀드아웃 */
  seenBy: string;
  /** 홀드아웃 자격(원문 인용·쪽수·사진). 기존 튜닝 세트는 판단 대상이 아니라 true */
  schemaOk: boolean;
  /** 'secondary' = 논문 표·재인용에서 온 명식(원전 쪽 미대조) */
  tier: 'primary' | 'secondary';
}

interface RawCase {
  id: string;
  school: string;
  pillars?: { year: string; month: string; day: string; hour?: string };
  expect?: { yongsin?: string; strength?: string; gyeokguk?: string; johu?: string };
  source: { book: string; chapter?: string; page?: string; photo?: string; tier?: 'secondary' };
  note?: string;
  seenBy?: string;
  /** 용신이 둘 이상인데 원문에 우선이 없다 → 채점 분모에서 뺀다 */
  ambiguous?: boolean;
  /** 같은 명식이 다른 출전으로 한 번 더 실려 있을 때, 정본(1차 사료) 케이스의 id. 채점에서 뺀다. */
  dupOf?: string;
}

/** 적천수 계열 용신 케이스 전부(일치·불일치 모두). 우리 용신 체계와 같은 학파만 채점한다. */
export function yongsinRows(): GoldenRow[] {
  const cases = (goldenRaw as { cases: RawCase[] }).cases ?? [];
  const rows: GoldenRow[] = [];
  for (const c of cases) {
    if (c.school !== 'jeokcheonsu' || !c.expect?.yongsin || !c.pillars) continue;
    // 같은 사주가 두 출전으로 실려 있으면 한 번만 센다.
    //   논문 재인용과 원전이 같은 명식을 싣는 경우가 있는데, 둘 다 채점하면
    //   그 한 사주의 정오답이 재현율에 두 번 반영돼 숫자가 부풀거나 깎인다.
    if (c.dupOf) continue;
    if (c.ambiguous) continue;
    try {
      const { dayGan, pillars } = chartFromGanji(c.pillars);
      const strength = dayMasterStrength(dayGan, pillars);
      const gy = computeGyeokYong(pillars, dayGan, strength);
      rows.push({
        id: c.id,
        book: c.source.book,
        chapter: c.source.chapter ?? '—',
        page: c.source.page ?? '—',
        expected: c.expect.yongsin,
        got: gy.yongsin.primary,
        method: gy.yongsin.method,
        match: gy.yongsin.primary === c.expect.yongsin,
        engine: ENGINE_VERSION,
        seenBy: c.seenBy ?? 'unknown',
        schemaOk: c.seenBy !== 'none' || holdoutEligible(c),
        tier: c.source.tier === 'secondary' ? 'secondary' : 'primary',
      });
    } catch {
      // 입력이 깨진 케이스는 표에서 빼되 조용히 넘어간다(페이지가 죽으면 안 된다)
    }
  }
  return rows.sort((a, b) => a.id.localeCompare(b.id));
}

export function rate(rows: GoldenRow[]): { hit: number; total: number; pct: string } {
  const hit = rows.filter((r) => r.match).length;
  const total = rows.length;
  return { hit, total, pct: total ? ((hit / total) * 100).toFixed(1) : '0.0' };
}

/**
 * 채점에 쓰는 명식 수 — 페이지 문구의 「고전 원전 N건으로 채점」에 쓴다.
 * 2026-09-29: 옮겨 적기만 하고 채점 기준(expect)을 아직 달지 않은 명식(당시 29건)까지 세고 있었다.
 *   「192건으로 채점」은 사실보다 크게 말한 것이라, 기준이 하나라도 있는 명식만 센다(중복 명식 제외).
 *   한 명식이 격국·강약·용신에 겹쳐 쓰이므로 표의 항목별 건수를 더해도 이 숫자가 되지 않는다.
 */
export function totalCases(): number {
  return ((goldenRaw as { cases: { dupOf?: string; expect?: Record<string, unknown> }[] }).cases ?? [])
    .filter((c) => !c.dupOf && c.expect && Object.keys(c.expect).length > 0).length;
}

/** 옮겨 적은 명식 전체(채점 기준 유무 무관, 중복 제외). */
export function transcribedCases(): number {
  return ((goldenRaw as { cases: { dupOf?: string }[] }).cases ?? []).filter((c) => !c.dupOf).length;
}

/**
 * 홀드아웃 자격 — 원문 한자 인용(4자 이상) · 원전 쪽수 · 판본 사진이 모두 있어야 한다.
 * 모델 기억·블로그·논문 표로 채운 8자가 홀드아웃에 섞이는 순간 이 숫자는 81.3% 와 같은 거짓이 된다.
 */
export function holdoutEligible(c: { note?: string; source: { page?: string; photo?: string } }): boolean {
  return /[\u4e00-\u9fff]{4,}/.test(c.note ?? '') && /\d/.test(c.source.page ?? '') && !!c.source.photo;
}

/**
 * 홀드아웃(S1) — seenBy:'none' 이고 자격을 갖춘 적천수 명식만.
 * ⚠️ ID 순번으로 정하지 않는다. 예전 「미확인(JCS-071~)」 22건은 v8~v14 를 채택할 때마다 채점에 쓰였다 → 튜닝 세트다.
 * 2026-09-10 기준 0건. v14 동결 뒤 판본에서 새로 전사하는 명식(JCS-093~)부터 쌓인다.
 */
export function holdoutRows(rows: GoldenRow[]): GoldenRow[] {
  return rows.filter((r) => r.seenBy === 'none' && r.schemaOk);
}

/** 튜닝 세트(S0) — 규칙을 고칠 때 정오답을 본 명식. 여기 재현율은 낙관치로 읽는다. */
export function tunedRows(rows: GoldenRow[]): GoldenRow[] {
  return rows.filter((r) => r.seenBy !== 'none');
}

/** 원전(primary)에서 온 명식만. 2차 출처(논문 표·재인용)를 빼고 나란히 적는 숫자 */
export function primaryRows(rows: GoldenRow[]): GoldenRow[] {
  return rows.filter((r) => r.tier === 'primary');
}

/** 조후 채점 표본 — 원전 건수와 전체 건수. 원전 N<30 이면 비율을 공개하지 않는다. */
export function johuSample(): { n: number; primary: number } {
  const cs = ((goldenRaw as { cases: RawCase[] }).cases ?? []).filter((c) => c.expect?.johu && !c.dupOf && !c.ambiguous);
  return { n: cs.length, primary: cs.filter((c) => c.source.tier !== 'secondary').length };
}

/** 조후 비율을 공개하는 최소 표본 */
export const JOHU_MIN_N = 30;

/**
 * 홀드아웃(S1) 적중 수를 공개하는 최소 표본.
 * N 이 작으면 한 건이 비율을 크게 흔든다(N=9 면 한 건이 11%p). 표본 수만 밝히고 적중은 적지 않는다.
 * 조후의 JOHU_MIN_N 과 같은 규칙 — 근거는 `헤아림_용신_채점정의.md` §1·§5.
 */
export const HOLDOUT_MIN_N = 30;

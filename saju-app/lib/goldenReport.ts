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
}

interface RawCase {
  id: string;
  school: string;
  pillars?: { year: string; month: string; day: string; hour?: string };
  expect?: { yongsin?: string; strength?: string; gyeokguk?: string; johu?: string };
  source: { book: string; chapter?: string; page?: string };
}

/** 적천수 계열 용신 케이스 전부(일치·불일치 모두). 우리 용신 체계와 같은 학파만 채점한다. */
export function yongsinRows(): GoldenRow[] {
  const cases = (goldenRaw as { cases: RawCase[] }).cases ?? [];
  const rows: GoldenRow[] = [];
  for (const c of cases) {
    if (c.school !== 'jeokcheonsu' || !c.expect?.yongsin || !c.pillars) continue;
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
      });
    } catch {
      // 입력이 깨진 케이스는 표에서 빼되 조용히 넘어간다(페이지가 죽으면 안 된다)
    }
  }
  return rows.sort((a, b) => a.id.localeCompare(b.id));
}

/**
 * 튜닝 뒤에 원전에서 새로 캔 표본만 추린다(JCS-042 이후).
 * 엔진 규칙은 JCS-041 까지의 표본으로 맞췄으므로, 그 뒤 케이스의 성적이 **일반화 성능**에 가깝다.
 * 이 둘을 나눠 보여주는 게 정직하다 — 같은 표본으로 맞추고 같은 표본으로 채점하면 숫자가 부풀기 때문.
 */
export function newSampleRows(rows: GoldenRow[]): GoldenRow[] {
  return rows.filter((r) => {
    const n = Number((r.id.match(/(\d+)$/) ?? [])[1] ?? 0);
    return r.id.startsWith('JCS-') && n >= 42;
  });
}

export function rate(rows: GoldenRow[]): { hit: number; total: number; pct: string } {
  const hit = rows.filter((r) => r.match).length;
  const total = rows.length;
  return { hit, total, pct: total ? ((hit / total) * 100).toFixed(1) : '0.0' };
}

/** 골든 케이스 총 건수(학파·채점축 무관). 페이지 문구의 '몇 건으로 채점했나'에 쓴다. */
export function totalCases(): number {
  return ((goldenRaw as { cases: unknown[] }).cases ?? []).length;
}

/**
 * v7 을 확정한 **뒤에** 원전에서 캔 표본(JCS-071~).
 * 규칙을 만들 때 이 명식들은 존재하지도 않았다 — 어떤 규칙도 이 케이스를 본 적이 없다는 뜻이라
 * 표본은 작지만 가장 엄격한 일반화 지표다. 고정 세트(JCS-001~070)와 반드시 나눠 읽는다.
 */
export function unseenRows(rows: GoldenRow[]): GoldenRow[] {
  return rows.filter((r) => {
    const n = Number((r.id.match(/(\d+)$/) ?? [])[1] ?? 0);
    return r.id.startsWith('JCS-') && n >= 71;
  });
}

/** v7 을 만들 때 쓴 고정 세트(JCS-001~070). 여기 숫자는 부풀 수 있다는 전제로 읽어야 한다. */
export function fixedRows(rows: GoldenRow[]): GoldenRow[] {
  return rows.filter((r) => {
    const n = Number((r.id.match(/(\d+)$/) ?? [])[1] ?? 0);
    return !(r.id.startsWith('JCS-') && n >= 71);
  });
}

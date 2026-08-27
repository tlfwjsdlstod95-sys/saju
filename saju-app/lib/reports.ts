// 리포트 보관 — 서버 전용 (service_role 키 사용).
//
// 판매 단위가 "리포트 1건"이므로, 구매한 리포트의 '원문'이 계정에 남아 있어야 한다.
// 그래야 폰에서 사고 PC에서 열어도 같은 글이 나온다. (localStorage·Redis 캐시는
// 기기 종속이거나 만료되므로 약관에 적은 "계정에 저장되어 다시 열람"의 근거가 못 된다.)
//
// 원칙
//   - 저장은 언제나 best-effort. 실패해도 사용자 화면은 정상 동작해야 한다(throw 금지).
//   - 저장 시점의 권한 판정은 호출부(AI 라우트)가 이미 끝냈다. 여기서 다시 하지 않는다.
//   - 조회는 항상 user_id 로 좁힌다. 남의 리포트가 열리면 안 된다.

import { supabaseAdmin } from '@/lib/supabase';

export type ReportKind = 'reading' | 'yearly' | 'gunghap';

export interface ReportMeta {
  name?: string;
  birth?: string;      // "1995.03.07 14:20" 같은 표시용 문자열
  ilju?: string;       // 일주 (예: 무오)
  motif?: string;      // 원형 이름
  emoji?: string;
  partner?: string;    // 궁합 상대 이름
  year?: number;       // 신년운세 대상 연도
  free?: boolean;      // 초대 프로모션 등 무료 제공분
}

export interface ReportRow {
  id: string;
  kind: ReportKind;
  chart: string;
  variant: string;
  title: string;
  meta: ReportMeta;
  body: string;
  createdAt: number;
  updatedAt: number;
}

const MAX_BODY = 60_000; // 안전장치 — 정상 리포트는 1만자 안쪽

export function reportId(uid: string, kind: ReportKind, chart: string, variant: string): string {
  return `${uid}|${kind}|${chart}|${variant || ''}`;
}

export const KIND_LABEL: Record<ReportKind, string> = {
  reading: '정밀 사주 리포트',
  yearly: '신년운세 총평',
  gunghap: '궁합 리포트',
};

function rowToReport(r: any): ReportRow {
  return {
    id: r.id,
    kind: r.kind,
    chart: r.chart,
    variant: r.variant ?? '',
    title: r.title ?? KIND_LABEL[r.kind as ReportKind] ?? '리포트',
    meta: (r.meta ?? {}) as ReportMeta,
    body: r.body ?? '',
    createdAt: new Date(r.created_at).getTime(),
    updatedAt: new Date(r.updated_at).getTime(),
  };
}

/** 리포트 원문 보관. 실패해도 조용히 넘어간다. */
export async function saveReport(args: {
  uid: string | null;
  kind: ReportKind;
  chart: string;
  variant?: string;
  title?: string;
  meta?: ReportMeta;
  body: string;
}): Promise<void> {
  const { uid, kind, chart, body } = args;
  if (!uid || !chart) return;
  if (!body || body.length < 200) return; // 중단된 스트림은 보관하지 않는다
  const sb = supabaseAdmin();
  if (!sb) return;
  const variant = args.variant ?? '';
  try {
    await sb.from('saju_reports').upsert(
      {
        id: reportId(uid, kind, chart, variant),
        user_id: uid,
        kind,
        chart,
        variant,
        title: (args.title ?? KIND_LABEL[kind]).slice(0, 120),
        meta: args.meta ?? {},
        body: body.slice(0, MAX_BODY),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' },
    );
  } catch {
    /* 보관 실패는 사용자 경험을 막지 않는다 */
  }
}

/** 단건 조회 — 본인 것만. */
export async function getReport(
  uid: string | null,
  kind: ReportKind,
  chart: string,
  variant = '',
): Promise<ReportRow | null> {
  if (!uid || !chart) return null;
  const sb = supabaseAdmin();
  if (!sb) return null;
  try {
    const { data, error } = await sb
      .from('saju_reports')
      .select('*')
      .eq('id', reportId(uid, kind, chart, variant))
      .eq('user_id', uid)
      .limit(1);
    if (error || !data || !data.length) return null;
    return rowToReport(data[0]);
  } catch {
    return null;
  }
}

/** 목록 조회 — 원문(body)은 빼고 가볍게. */
export async function listReports(uid: string | null, limit = 60): Promise<Omit<ReportRow, 'body'>[]> {
  if (!uid) return [];
  const sb = supabaseAdmin();
  if (!sb) return [];
  try {
    const { data, error } = await sb
      .from('saju_reports')
      .select('id,kind,chart,variant,title,meta,created_at,updated_at')
      .eq('user_id', uid)
      .order('updated_at', { ascending: false })
      .limit(limit);
    if (error || !data) return [];
    return data.map((r: any) => {
      const { body, ...rest } = rowToReport(r);
      return rest;
    });
  } catch {
    return [];
  }
}

/** 삭제 — 본인 것만. */
export async function deleteReport(uid: string | null, id: string): Promise<boolean> {
  if (!uid || !id) return false;
  const sb = supabaseAdmin();
  if (!sb) return false;
  try {
    const { error } = await sb.from('saju_reports').delete().eq('user_id', uid).eq('id', id);
    return !error;
  } catch {
    return false;
  }
}

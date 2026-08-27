// 클라이언트 ↔ 서버 동기화 헬퍼.
// 로그인 상태가 아니면 서버가 401을 주고, 호출부는 조용히 localStorage만 씁니다.
'use client';

import type { Profile } from './profiles';
import type { Receipt } from './receipts';

async function ok(res: Response) { return res.ok ? res.json().catch(() => null) : null; }

export async function cloudListProfiles(): Promise<Profile[] | null> {
  try { const r = await fetch('/api/profiles', { cache: 'no-store' }); const d = await ok(r); return d?.profiles ?? null; } catch { return null; }
}
export async function cloudSaveProfile(p: Profile): Promise<void> {
  try { await fetch('/api/profiles', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(p) }); } catch {}
}
export async function cloudDeleteProfile(id: string): Promise<void> {
  try { await fetch('/api/profiles?id=' + encodeURIComponent(id), { method: 'DELETE' }); } catch {}
}

export async function cloudListReceipts(): Promise<Receipt[] | null> {
  try { const r = await fetch('/api/receipts', { cache: 'no-store' }); const d = await ok(r); return d?.receipts ?? null; } catch { return null; }
}
export async function cloudAddReceipt(rc: Receipt): Promise<void> {
  try { await fetch('/api/receipts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(rc) }); } catch {}
}

// ── 보관된 리포트 ──────────────────────────────────────────────
// 구매한 리포트의 '원문'은 서버(saju_reports)에 남는다. localStorage 캐시가 없는
// 기기에서도 같은 글이 나와야 하기 때문. 저장은 서버 라우트가 직접 하므로 여기엔 POST가 없다.

export type CloudReportKind = 'reading' | 'yearly' | 'gunghap';

export interface CloudReportSummary {
  id: string;
  kind: CloudReportKind;
  chart: string;
  variant: string;
  title: string;
  meta: { name?: string; birth?: string; ilju?: string; motif?: string; emoji?: string; partner?: string; year?: number; free?: boolean };
  createdAt: number;
  updatedAt: number;
}

/** 보관된 리포트 원문. 없으면 null. */
export async function cloudGetReport(kind: CloudReportKind, chart: string, variant = ''): Promise<string | null> {
  try {
    const q = `/api/reports?kind=${kind}&chart=${encodeURIComponent(chart)}&variant=${encodeURIComponent(variant)}`;
    const r = await fetch(q, { cache: 'no-store' });
    const d = await ok(r);
    const body = d?.report?.body;
    return typeof body === 'string' && body.length > 0 ? body : null;
  } catch { return null; }
}

/** 내 리포트 목록(원문 제외). 비로그인이면 빈 배열. */
export async function cloudListReports(): Promise<CloudReportSummary[]> {
  try { const r = await fetch('/api/reports', { cache: 'no-store' }); const d = await ok(r); return d?.reports ?? []; } catch { return []; }
}

export async function cloudDeleteReport(id: string): Promise<void> {
  try { await fetch('/api/reports?id=' + encodeURIComponent(id), { method: 'DELETE' }); } catch {}
}

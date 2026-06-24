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

/** 서버 이용권(프리미엄) 조회. 로그인 안 했으면 null. */
export async function cloudGetEntitlement(): Promise<boolean | null> {
  try { const r = await fetch('/api/entitlement', { cache: 'no-store' }); const d = await ok(r); return d ? !!d.premium : null; } catch { return null; }
}

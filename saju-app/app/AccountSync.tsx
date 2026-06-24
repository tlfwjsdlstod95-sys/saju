'use client';

// 로그인되면: 서버 기록을 가져와 localStorage와 병합하고,
// 로그인 전에 익명으로 저장해둔 기록은 서버로 올립니다(유실 방지).
// 병합 후 'saju:synced' 이벤트를 쏴서 화면이 새로고침되게 합니다.
import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import {
  cloudListProfiles, cloudSaveProfile,
  cloudListReceipts, cloudAddReceipt, cloudGetEntitlement,
} from '@/lib/cloud';
import type { Profile } from '@/lib/profiles';
import type { Receipt } from '@/lib/receipts';

const P_KEY = 'saju_profiles_v1';
const R_KEY = 'saju_receipts_v1';
const PREMIUM_KEY = 'saju_premium_v1';

function read<T>(key: string): T[] {
  try { const v = JSON.parse(localStorage.getItem(key) || '[]'); return Array.isArray(v) ? v : []; } catch { return []; }
}
function write(key: string, v: unknown) { try { localStorage.setItem(key, JSON.stringify(v)); } catch {} }

export default function AccountSync() {
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status !== 'authenticated' || !(session as any)?.uid) return;
    let done = false;

    (async () => {
      // 1) 이용권: 서버가 프리미엄이면 로컬에도 반영
      const ent = await cloudGetEntitlement();
      if (ent) { try { localStorage.setItem(PREMIUM_KEY, '1'); } catch {} }

      // 2) 보관함 병합 (id 기준, savedAt 최신 우선)
      const localP = read<Profile>(P_KEY);
      const cloudP = (await cloudListProfiles()) ?? [];
      const byId = new Map<string, Profile>();
      for (const p of cloudP) byId.set(p.id, p);
      for (const p of localP) {
        const ex = byId.get(p.id);
        if (!ex || (p.savedAt ?? 0) > (ex.savedAt ?? 0)) byId.set(p.id, p);
      }
      const mergedP = [...byId.values()].sort((a, b) => b.savedAt - a.savedAt);
      write(P_KEY, mergedP);
      // 로컬에만 있던(=서버에 없던) 것 업로드
      const cloudIds = new Set(cloudP.map((p) => p.id));
      for (const p of mergedP) if (!cloudIds.has(p.id)) await cloudSaveProfile(p);

      // 3) 영수증 병합 (orderId 기준)
      const localR = read<Receipt>(R_KEY);
      const cloudR = (await cloudListReceipts()) ?? [];
      const rById = new Map<string, Receipt>();
      for (const r of cloudR) rById.set(r.orderId, r);
      for (const r of localR) if (!rById.has(r.orderId)) rById.set(r.orderId, r);
      const mergedR = [...rById.values()].sort((a, b) => b.savedAt - a.savedAt);
      write(R_KEY, mergedR);
      const cloudOrderIds = new Set(cloudR.map((r) => r.orderId));
      for (const r of mergedR) if (!cloudOrderIds.has(r.orderId)) await cloudAddReceipt(r);

      if (!done) window.dispatchEvent(new Event('saju:synced'));
    })();

    return () => { done = true; };
  }, [status, session]);

  return null;
}

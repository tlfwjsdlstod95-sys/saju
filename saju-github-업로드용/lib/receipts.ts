// 결제 영수증 / 이용 내역 — localStorage 기반 (서버 없음)
'use client';

const KEY = 'saju_receipts_v1';

export interface Receipt {
  orderId: string;
  orderName: string;
  amount: number;
  method: string;       // 카드, 간편결제 등
  approvedAt: string;   // ISO (토스 승인 시각)
  isTest: boolean;
  savedAt: number;
}

export function listReceipts(): Receipt[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw) as Receipt[];
    return Array.isArray(arr) ? arr.sort((a, b) => b.savedAt - a.savedAt) : [];
  } catch { return []; }
}

function write(list: Receipt[]) {
  try { localStorage.setItem(KEY, JSON.stringify(list)); } catch {}
}

/** orderId 중복이면 무시(승인 페이지 새로고침 대비) */
export function addReceipt(r: Omit<Receipt, 'savedAt'>): Receipt[] {
  const list = listReceipts();
  if (list.some((x) => x.orderId === r.orderId)) return list;
  list.push({ ...r, savedAt: Date.now() });
  write(list);
  return listReceipts();
}

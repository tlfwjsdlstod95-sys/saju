"use client";

// 프리미엄 콘텐츠(개운법·택일·신년운세)를 서버에서 받아오는 공용 훅.
//
// 계산이 서버(/api/premium)로 옮겨간 뒤부터, 유료 카드들은 '가려진 데이터'가 아니라
// **아예 없는 데이터**를 다룬다. 로딩/402(미구매)/실패 세 상태만 신경 쓰면 된다.

import { useEffect, useState } from 'react';

export type PremiumKind = 'gaeun' | 'auspicious' | 'yearly';

export function usePremiumData<T>(enabled: boolean, kind: PremiumKind, body: Record<string, unknown> | null) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [locked, setLocked] = useState(false);   // 402 — 아직 구매 전
  const [err, setErr] = useState('');
  const key = body ? JSON.stringify(body) : '';

  useEffect(() => {
    if (!enabled || !body) return;
    let alive = true;
    setLoading(true); setErr(''); setLocked(false);
    fetch('/api/premium', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ...body, kind }),
    })
      .then(async (res) => {
        const d = await res.json().catch(() => ({}));
        if (!alive) return;
        if (res.status === 402) { setLocked(true); setData(null); return; }
        if (!res.ok) { setErr(d?.error || '잠시 후 다시 시도해 주세요.'); setData(null); return; }
        setData(d.data as T);
      })
      .catch(() => { if (alive) setErr('네트워크가 불안정해요. 잠시 후 다시 시도해 주세요.'); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [enabled, kind, key]); // eslint-disable-line react-hooks/exhaustive-deps

  return { data, loading, locked, err };
}

"use client";

import { useState } from 'react';
import type { ReviewRow, ReviewStatus } from '@/lib/reviews';

const LABEL: Record<ReviewStatus, string> = { pending: '보류', public: '공개', hidden: '숨김' };

export default function ReviewAdmin({ initial }: { initial: ReviewRow[] }) {
  const [rows, setRows] = useState(initial);
  const [busy, setBusy] = useState('');

  async function change(id: string, status: ReviewStatus) {
    setBusy(id);
    try {
      const r = await fetch('/api/reviews', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id, status }),
      });
      const d = await r.json().catch(() => ({}));
      if (d?.ok) setRows((prev) => prev.map((x) => (x.id === id ? { ...x, status } : x)));
    } catch {}
    setBusy('');
  }

  if (rows.length === 0) {
    return (
      <div className="card">
        <p className="meta">아직 들어온 후기가 없어요.</p>
      </div>
    );
  }

  const counts = rows.reduce((a, r) => { a[r.status] = (a[r.status] ?? 0) + 1; return a; }, {} as Record<string, number>);

  return (
    <div className="card">
      <div className="meta" style={{ marginBottom: 14 }}>
        전체 {rows.length}건 · 보류 {counts.pending ?? 0} · 공개 {counts.public ?? 0} · 숨김 {counts.hidden ?? 0}
      </div>
      <div className="review-list">
        {rows.map((r) => (
          <div className={`review-item admin st-${r.status}`} key={r.id}>
            <div className="review-item-h">
              <span className="review-item-stars">{'★'.repeat(r.rating)}<span className="off">{'★'.repeat(5 - r.rating)}</span></span>
              <span className="review-item-who">
                {r.nickname || '익명'} · {new Date(r.createdAt).toLocaleDateString('ko-KR')} ·
                {r.tier === 'premium' ? ' 구매자' : ' 무료'}{r.userId ? ' · 로그인' : ''}
                {r.consent ? ' · 인용동의' : ''} · v{r.engine ?? '?'}
              </span>
            </div>
            <p className="review-item-body">{r.body}</p>
            <div className="review-admin-actions">
              <span className={`review-status st-${r.status}`}>{LABEL[r.status]}</span>
              {(['public', 'pending', 'hidden'] as ReviewStatus[])
                .filter((s) => s !== r.status)
                .map((s) => (
                  <button key={s} className="mini-btn" disabled={busy === r.id} onClick={() => change(r.id, s)}>
                    {LABEL[s]}으로
                  </button>
                ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

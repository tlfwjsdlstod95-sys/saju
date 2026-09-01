"use client";

// 승인된 실후기 노출 — 메인 화면.
//
// 후기가 하나도 없으면 아무것도 렌더하지 않는다(빈 후기란은 없느니만 못하다).
// 표시되는 건 사장님이 /admin/reviews 에서 '공개'로 바꾼 것뿐이다.

import { useEffect, useState } from 'react';

interface PublicReview { rating: number; body: string; nickname: string; createdAt: number }

function when(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

export default function Reviews() {
  const [items, setItems] = useState<PublicReview[]>([]);

  useEffect(() => {
    let alive = true;
    fetch('/api/reviews?public=1', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => { if (alive && Array.isArray(d?.reviews)) setItems(d.reviews); })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  if (items.length === 0) return null;

  const avg = Math.round((items.reduce((a, r) => a + r.rating, 0) / items.length) * 10) / 10;

  return (
    <div className="card reviews-card">
      <h2>먼저 본 분들의 한 줄</h2>
      <div className="meta" style={{ marginBottom: 14 }}>
        실제 사용자가 남긴 후기입니다 — 평균 <b>{avg.toFixed(1)}</b>점 · {items.length}건.
        헤아림은 후기를 지어내지 않습니다.
      </div>
      <div className="review-list">
        {items.map((r, i) => (
          <div className="review-item" key={i}>
            <div className="review-item-h">
              <span className="review-item-stars">{'★'.repeat(r.rating)}<span className="off">{'★'.repeat(5 - r.rating)}</span></span>
              <span className="review-item-who">{r.nickname || '익명'} · {when(r.createdAt)}</span>
            </div>
            <p className="review-item-body">{r.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

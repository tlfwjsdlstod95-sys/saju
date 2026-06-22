'use client';

import { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function FailInner() {
  const router = useRouter();
  const params = useSearchParams();
  const code = params.get('code');
  const message = params.get('message');

  return (
    <main className="wrap">
      <div className="pay-result-card">
        <div className="pay-result-icon err">!</div>
        <h2>결제가 취소됐어요</h2>
        <p className="meta">{message || '결제가 완료되지 않았습니다.'}{code ? ` (${code})` : ''}</p>
        <button className="btn" onClick={() => router.replace('/')}>홈으로 돌아가기</button>
      </div>
    </main>
  );
}

export default function PaymentFail() {
  return (
    <Suspense fallback={<main className="wrap"><div className="pay-result-card"><h2>불러오는 중…</h2></div></main>}>
      <FailInner />
    </Suspense>
  );
}

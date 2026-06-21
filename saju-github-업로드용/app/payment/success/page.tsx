'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { addReceipt } from '@/lib/receipts';

const PREMIUM_KEY = 'saju_premium_v1';
const RETURN_KEY = 'saju_pay_return';

function SuccessInner() {
  const router = useRouter();
  const params = useSearchParams();
  const [state, setState] = useState<'loading' | 'ok' | 'error'>('loading');
  const [msg, setMsg] = useState('');
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return; // 승인 API 중복 호출 방지
    ran.current = true;

    const paymentKey = params.get('paymentKey');
    const orderId = params.get('orderId');
    const amount = Number(params.get('amount'));

    if (!paymentKey || !orderId || !amount) {
      setState('error'); setMsg('결제 정보가 올바르지 않습니다.');
      return;
    }

    (async () => {
      try {
        const res = await fetch('/api/payment/confirm', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ paymentKey, orderId, amount }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || '결제 승인 실패');

        try { localStorage.setItem(PREMIUM_KEY, '1'); } catch {}
        // 이용 내역에 영수증 저장
        addReceipt({
          orderId: data.orderId ?? orderId,
          orderName: data.orderName ?? '사주 정밀 리포트 · 프리미엄',
          amount: data.amount ?? amount,
          method: data.method ?? '카드',
          approvedAt: data.approvedAt ?? new Date().toISOString(),
          isTest: !!data.isTest,
        });
        setState('ok');

        const back = (() => { try { return localStorage.getItem(RETURN_KEY) || '/'; } catch { return '/'; } })();
        try { localStorage.removeItem(RETURN_KEY); } catch {}
        setTimeout(() => router.replace(back), 1800);
      } catch (e: any) {
        setState('error'); setMsg(e.message);
      }
    })();
  }, [params, router]);

  return (
    <main className="wrap">
      <div className="pay-result-card">
        {state === 'loading' && (
          <>
            <div className="pay-result-spin" />
            <h2>결제를 확인하는 중…</h2>
            <p className="meta">토스페이먼츠 승인 처리 중입니다. 잠시만요.</p>
          </>
        )}
        {state === 'ok' && (
          <>
            <div className="pay-result-icon ok">✓</div>
            <h2>결제 완료!</h2>
            <p className="meta">프리미엄 잠금이 해제됐어요. 잠시 후 자동으로 돌아갑니다.</p>
          </>
        )}
        {state === 'error' && (
          <>
            <div className="pay-result-icon err">!</div>
            <h2>결제 승인에 실패했어요</h2>
            <p className="meta">{msg}</p>
            <button className="btn" onClick={() => router.replace('/')}>홈으로 돌아가기</button>
          </>
        )}
      </div>
    </main>
  );
}

export default function PaymentSuccess() {
  return (
    <Suspense fallback={<main className="wrap"><div className="pay-result-card"><div className="pay-result-spin" /><h2>불러오는 중…</h2></div></main>}>
      <SuccessInner />
    </Suspense>
  );
}

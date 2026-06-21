'use client';

import { useEffect, useState } from 'react';
import Script from 'next/script';

const KEY = 'saju_premium_v1';
const CUSTOMER_KEY = 'saju_customer_key';
const RETURN_KEY = 'saju_pay_return';
const PRICE = 9900;

/** 프리미엄 잠금 상태 (localStorage 영속) */
export function usePremium(): [boolean, () => void] {
  const [premium, setPremium] = useState(false);
  useEffect(() => { try { setPremium(localStorage.getItem(KEY) === '1'); } catch {} }, []);
  const unlock = () => { try { localStorage.setItem(KEY, '1'); } catch {} setPremium(true); };
  return [premium, unlock];
}

declare global {
  interface Window { TossPayments?: any }
}

// 고객 식별키 (2~50자). 없으면 만들어 저장.
function getCustomerKey(): string {
  try {
    let k = localStorage.getItem(CUSTOMER_KEY);
    if (!k) { k = 'cust_' + Math.random().toString(36).slice(2) + Date.now().toString(36); localStorage.setItem(CUSTOMER_KEY, k); }
    return k;
  } catch {
    return 'cust_' + Math.random().toString(36).slice(2);
  }
}

export default function Paywall(
  { open, onClose, onUnlock }: { open: boolean; onClose: () => void; onUnlock: () => void },
) {
  const [paying, setPaying] = useState(false);
  const [err, setErr] = useState('');
  const clientKey = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY;

  if (!open) return null;

  async function pay() {
    setErr('');
    if (!clientKey) { setErr('결제 설정이 필요합니다. .env.local 에 NEXT_PUBLIC_TOSS_CLIENT_KEY 를 넣어주세요.'); return; }
    if (!window.TossPayments) { setErr('결제 모듈을 불러오는 중이에요. 잠시 후 다시 눌러주세요.'); return; }

    setPaying(true);
    try {
      // 돌아올 경로 저장 (메인/궁합 어디서 눌렀든 그 자리로 복귀)
      try { localStorage.setItem(RETURN_KEY, window.location.pathname); } catch {}

      const tossPayments = window.TossPayments(clientKey);
      const payment = tossPayments.payment({ customerKey: getCustomerKey() });
      const orderId = 'saju_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

      await payment.requestPayment({
        method: 'CARD',
        amount: { currency: 'KRW', value: PRICE },
        orderId,
        orderName: '사주 정밀 리포트 · 프리미엄',
        successUrl: `${window.location.origin}/payment/success`,
        failUrl: `${window.location.origin}/payment/fail`,
        card: { useEscrow: false, flowMode: 'DEFAULT', useCardPoint: false, useAppCardOnly: false },
      });
      // 성공 시 토스가 successUrl 로 리다이렉트하므로 이 아래는 실행되지 않음
    } catch (e: any) {
      // 사용자가 결제창을 닫은 경우 등
      if (e?.code === 'USER_CANCEL') setErr('');
      else setErr(e?.message || '결제를 시작하지 못했어요.');
      setPaying(false);
    }
  }

  return (
    <>
      <Script
        src="https://js.tosspayments.com/v2/standard"
        strategy="afterInteractive"
      />
      <div className="pay-overlay" onClick={onClose}>
        <div className="pay-card" onClick={(e) => e.stopPropagation()}>
          <button className="pay-x" onClick={onClose} aria-label="닫기">✕</button>
          <div className="pay-badge">🔓 프리미엄 잠금 해제</div>
          <div className="pay-title">AI 심층 풀이 + 정밀 리포트</div>
          <div className="pay-price"><b>₩9,900</b><span>1회 결제 · 평생 이용</span></div>
          <ul className="pay-list">
            <li>🔮 AI 심층 풀이 — 선배 톤 10단계, 무제한 재생성</li>
            <li>💬 AI 1:1 사주 상담 — 무제한 질문</li>
            <li>💞 AI 궁합 풀이 — 두 사람 관계 6단계 분석</li>
            <li>📈 평생 대운 80년 · 신년운세 · 개운법 · 택일</li>
          </ul>
          <button className="btn" onClick={pay} disabled={paying}>
            {paying ? '결제창을 여는 중…' : '토스페이먼츠로 결제하기 →'}
          </button>
          {err && <div className="warn" style={{ marginTop: 12 }}>{err}</div>}
          <p className="pay-demo">
            ※ 테스트 모드입니다. 토스 결제창에서 <b>아무 카드 번호나</b> 입력해도 실제 청구는 일어나지 않습니다.
            {clientKey?.startsWith('test_') === false ? '' : ' (운영 전환 시 가맹점 키로 교체)'}
          </p>
        </div>
      </div>
    </>
  );
}

'use client';

import { useCallback, useEffect, useState } from 'react';
import Script from 'next/script';
import { useSession, signIn } from 'next-auth/react';
import { makeOrderId } from '@/lib/chartId';

// ── 판매 단위 ────────────────────────────────────────────────────
// 헤아림은 "생년월일시 1건에 대한 정밀 리포트 1건"을 판다.
// 계정 전체를 여는 이용권(1회 결제 → 평생 무제한)은 카드사·PG 정책상 불가하므로 두지 않는다.
// 따라서 잠금 판정도 결제 여부도 전부 chartId(명식 id) 단위다.

const ENT_PREFIX = 'saju_ent_v2:';   // 명식별 로컬 캐시 (진짜 권한은 서버)
const OWNER_KEY = 'saju_owner_v1';   // 사장님 무료 이용 (판매 상품 아님)
const CUSTOMER_KEY = 'saju_customer_key';
const RETURN_KEY = 'saju_pay_return';
const PRICE = 5900;        // 런칭 할인가 (서버 app/api/payment/confirm 의 PRODUCT_AMOUNT 와 반드시 동일하게 유지)
const LIST_PRICE = 9900;   // 정가 (줄 긋기 표시용)

// 사장님 전용 잠금해제 코드 — 이 코드를 ?owner= 로 붙여 들어오면 결제 없이 자동 해제됩니다.
const OWNER_CODE = 'heaarim-ed31bc854ab540aa-2026';

function readLocal(chart?: string | null): boolean {
  if (!chart) return false;
  try {
    if (localStorage.getItem(OWNER_KEY) === '1') return true;
    return localStorage.getItem(ENT_PREFIX + chart) === '1';
  } catch { return false; }
}

/**
 * 이 명식의 리포트를 구매했는지 여부.
 * @param chart 현재 보고 있는 명식 id (없으면 항상 잠금)
 */
export function usePremium(chart?: string | null): [boolean, () => void] {
  const [unlocked, setUnlocked] = useState(false);

  useEffect(() => {
    // 비밀 주소(?owner=코드)로 접속하면 자동 잠금해제 후 주소창에서 코드 제거
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get('owner') === OWNER_CODE) {
        localStorage.setItem(OWNER_KEY, '1');
        params.delete('owner');
        const q = params.toString();
        window.history.replaceState({}, '', window.location.pathname + (q ? '?' + q : ''));
      }
    } catch {}

    setUnlocked(readLocal(chart));
    if (!chart) return;

    // 서버가 진짜 권한. 로컬 캐시가 틀렸으면 여기서 교정된다(양방향).
    let alive = true;
    fetch('/api/entitlement?chart=' + encodeURIComponent(chart), { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => {
        if (!alive) return;
        if (d?.entitled === true) {
          try { localStorage.setItem(ENT_PREFIX + chart, '1'); } catch {}
          setUnlocked(true);
        } else if (d?.loggedIn === true) {
          // 로그인했는데 구매 이력이 없다 → 로컬 캐시가 잘못된 것이므로 지운다.
          try { localStorage.removeItem(ENT_PREFIX + chart); } catch {}
          if (!readLocal(chart)) setUnlocked(false);
        }
      })
      .catch(() => { /* 네트워크 실패 시 로컬 캐시 유지 */ });

    const onSync = () => setUnlocked(readLocal(chart));
    window.addEventListener('saju:synced', onSync);
    return () => { alive = false; window.removeEventListener('saju:synced', onSync); };
  }, [chart]);

  const unlock = useCallback(() => {
    if (!chart) return;
    try { localStorage.setItem(ENT_PREFIX + chart, '1'); } catch {}
    setUnlocked(true);
  }, [chart]);

  return [unlocked, unlock];
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
  {
    open, onClose, onUnlock, chart, productName,
  }: {
    open: boolean;
    onClose: () => void;
    onUnlock: () => void;
    /** 결제 대상 명식 id. 이게 없으면 결제할 수 없다(무엇을 파는지 특정 불가). */
    chart?: string | null;
    productName?: string;
  },
) {
  const [paying, setPaying] = useState(false);
  const [err, setErr] = useState('');
  const { data: session, status } = useSession();
  const clientKey = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY;
  const loggedIn = !!(session as any)?.uid;

  if (!open) return null;

  async function pay() {
    setErr('');
    if (!chart) { setErr('먼저 사주를 분석해 주세요. 리포트는 명식 1건 단위로 판매됩니다.'); return; }
    if (!loggedIn) { setErr('로그인 후 결제할 수 있어요.'); return; }
    if (!clientKey) { setErr('결제 설정이 필요합니다. .env.local 에 NEXT_PUBLIC_TOSS_CLIENT_KEY 를 넣어주세요.'); return; }
    if (!window.TossPayments) { setErr('결제 모듈을 불러오는 중이에요. 잠시 후 다시 눌러주세요.'); return; }

    setPaying(true);
    try {
      // 돌아올 경로 저장 (메인/궁합 어디서 눌렀든 그 자리로 복귀)
      try { localStorage.setItem(RETURN_KEY, window.location.pathname); } catch {}

      const tossPayments = window.TossPayments(clientKey);
      const payment = tossPayments.payment({ customerKey: getCustomerKey() });
      // 주문번호에 명식 id를 새긴다 → 결제 기록 자체가 "이 리포트 1건"의 이용권 증빙이 된다.
      const orderId = makeOrderId(chart);

      await payment.requestPayment({
        method: 'CARD',
        amount: { currency: 'KRW', value: PRICE },
        orderId,
        orderName: productName || '사주 정밀 리포트 1건',
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
          <div className="pay-badge">📄 정밀 리포트 1건</div>
          <div className="pay-title">{productName || 'AI 심층 풀이 + 정밀 리포트'}</div>
          <div className="pay-price">
            <span className="pay-orig">₩{LIST_PRICE.toLocaleString()}</span>
            <b>₩{PRICE.toLocaleString()}</b>
            <span className="pay-save">런칭 할인 {Math.round((1 - PRICE / LIST_PRICE) * 100)}%</span>
          </div>
          <p className="pay-sub">지금 보고 계신 생년월일시 1건에 대한 리포트입니다.</p>
          <ul className="pay-list">
            <li>🔮 AI 심층 풀이 — 선배 톤 10단계 (말투 3종 선택)</li>
            <li>💬 이 명식에 대한 AI 1:1 상담</li>
            <li>📈 대운 80년 · 신년운세 · 개운법 · 택일</li>
            <li>📕 인생 가이드북 PDF 저장</li>
          </ul>

          {status !== 'loading' && !loggedIn ? (
            <div className="pay-login">
              <p className="pay-login-msg">
                구매하신 리포트를 계정에 저장하기 위해 <b>로그인이 필요</b>합니다.
                기기를 바꿔도 다시 열람할 수 있어요.
              </p>
              <div className="login-providers">
                <button className="login-btn kakao" onClick={() => signIn('kakao')}>
                  <span className="login-ic">💬</span> 카카오로 로그인
                </button>
                <button className="login-btn naver" onClick={() => signIn('naver')}>
                  <span className="login-ic">N</span> 네이버로 로그인
                </button>
                <button className="login-btn google" onClick={() => signIn('google')}>
                  <span className="login-ic">G</span> 구글로 로그인
                </button>
              </div>
            </div>
          ) : (
            <button className="btn" onClick={pay} disabled={paying || status === 'loading'}>
              {paying ? '결제창을 여는 중…' : '토스페이먼츠로 결제하기 →'}
            </button>
          )}

          {err && <div className="warn" style={{ marginTop: 12 }}>{err}</div>}
          <p className="pay-demo">
            결제 승인 즉시 리포트가 생성되어 웹에서 열람됩니다 · 자동갱신·정기결제 없음 ·
            다른 생년월일시의 리포트는 건별로 결제 · 배송이 없는 디지털 콘텐츠입니다.
          </p>
        </div>
      </div>
    </>
  );
}

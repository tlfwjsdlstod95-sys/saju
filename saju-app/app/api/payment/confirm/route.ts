import { NextResponse } from 'next/server';
import { auth as getSession } from '@/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { chartFromOrderId } from '@/lib/chartId';

export const runtime = 'nodejs';

// 우리 상품 가격(원). 클라이언트가 보낸 금액을 신뢰하지 않고 서버에서 검증한다.
const PRODUCT_AMOUNT = 5900; // Paywall.tsx 의 PRICE 와 반드시 동일하게 유지

export async function POST(req: Request) {
  const secretKey = process.env.TOSS_SECRET_KEY;
  if (!secretKey) {
    return NextResponse.json(
      { error: '결제 설정이 필요합니다. .env.local 에 TOSS_SECRET_KEY 를 넣어주세요.', needsKey: true },
      { status: 503 },
    );
  }

  let body: { paymentKey?: string; orderId?: string; amount?: number };
  try { body = await req.json(); } catch { return NextResponse.json({ error: '잘못된 요청' }, { status: 400 }); }

  const { paymentKey, orderId, amount } = body;
  if (!paymentKey || !orderId || typeof amount !== 'number') {
    return NextResponse.json({ error: '결제 정보가 누락되었습니다.' }, { status: 400 });
  }

  // 금액 위변조 방지: 클라이언트가 보낸 금액이 우리 상품 가격과 일치하는지 확인
  if (amount !== PRODUCT_AMOUNT) {
    return NextResponse.json({ error: '결제 금액이 일치하지 않습니다.' }, { status: 400 });
  }

  // ── 승인 전 사전 검증 ──────────────────────────────────────────
  // 이 라우트(=토스 confirm)가 실제로 돈이 빠져나가는 지점이다. 그러니 승인 조건이
  // 안 맞으면 토스를 호출하기 '전에' 끊는다. 이러면 청구가 아예 발생하지 않는다.

  // 1) 어떤 명식에 대한 결제인지 — 주문번호에 새겨져 있어야 한다.
  const chart = chartFromOrderId(orderId);
  if (!chart) {
    return NextResponse.json(
      { error: '주문 정보가 올바르지 않습니다. 결제를 다시 시도해 주세요.' },
      { status: 400 },
    );
  }

  // 2) 로그인 필수 — 구매한 리포트를 계정에 묶어야 기기를 바꿔도 열람할 수 있다.
  const session = await getSession();
  const uid = ((session as any)?.uid as string) ?? null;
  if (!uid) {
    return NextResponse.json(
      { error: '로그인 후 결제할 수 있어요. 구매하신 리포트를 계정에 저장하기 위해 필요합니다.', needsLogin: true },
      { status: 401 },
    );
  }

  // 토스 시크릿 키로 Basic 인증 (키 뒤에 콜론, 비밀번호는 빈 값)
  const auth = Buffer.from(`${secretKey}:`).toString('base64');

  const res = await fetch('https://api.tosspayments.com/v1/payments/confirm', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ paymentKey, orderId, amount }),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    // 토스가 주는 에러 코드/메시지를 그대로 전달
    return NextResponse.json(
      { error: data?.message || '결제 승인에 실패했습니다.', code: data?.code },
      { status: res.status },
    );
  }

  const isTest = secretKey.startsWith('test_');

  // 승인 성공 — 결제 기록을 남긴다. 주문번호에 명식 id가 들어 있으므로
  // 이 한 줄이 곧 "그 명식 리포트 1건"에 대한 이용권 증빙이 된다.
  // (계정 전체를 여는 프리미엄 플래그는 두지 않는다 — 1회 결제 무제한 구조 금지)
  let saved = false;
  try {
    const sb = supabaseAdmin();
    if (sb) {
      const { error: recErr } = await sb.from('saju_receipts').upsert(
        {
          order_id: data.orderId, user_id: uid,
          order_name: data.orderName, amount: data.totalAmount,
          method: data.method, approved_at: data.approvedAt, is_test: isTest,
        },
        { onConflict: 'order_id' },
      );
      saved = !recErr;
    }
  } catch { /* 아래에서 saved=false 로 처리 */ }

  return NextResponse.json({
    ok: true,
    orderId: data.orderId,
    orderName: data.orderName,
    amount: data.totalAmount,
    method: data.method,
    approvedAt: data.approvedAt,
    isTest,
    chart,
    // 기록 실패 시 클라이언트가 안내를 띄울 수 있게 알려준다(결제 자체는 이미 승인됨).
    saved,
  });
}

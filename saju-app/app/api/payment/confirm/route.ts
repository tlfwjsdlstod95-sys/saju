import { NextResponse } from 'next/server';
import { auth as getSession } from '@/auth';
import { supabaseAdmin } from '@/lib/supabase';

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

  // 승인 성공 — 로그인 유저면 서버에 이용권/영수증을 기록한다.
  // (이게 "진짜" 권한이라 localStorage 우회로 매출이 새지 않음)
  try {
    const session = await getSession();
    const uid = (session as any)?.uid ?? null;
    const sb = supabaseAdmin();
    if (uid && sb) {
      await sb.from('saju_entitlements').upsert(
        { user_id: uid, premium: true, source: 'toss', last_order_id: data.orderId, updated_at: new Date().toISOString() },
        { onConflict: 'user_id' },
      );
      await sb.from('saju_receipts').upsert(
        {
          order_id: data.orderId, user_id: uid,
          order_name: data.orderName, amount: data.totalAmount,
          method: data.method, approved_at: data.approvedAt, is_test: isTest,
        },
        { onConflict: 'order_id' },
      );
    }
  } catch { /* 기록 실패해도 승인 자체는 성공으로 응답 */ }

  return NextResponse.json({
    ok: true,
    orderId: data.orderId,
    orderName: data.orderName,
    amount: data.totalAmount,
    method: data.method,
    approvedAt: data.approvedAt,
    isTest,
  });
}

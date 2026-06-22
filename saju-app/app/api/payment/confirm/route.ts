import { NextResponse } from 'next/server';

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

  // 승인 성공 — 핵심 정보만 반환 (실서비스라면 여기서 DB에 결제/이용권 기록)
  return NextResponse.json({
    ok: true,
    orderId: data.orderId,
    orderName: data.orderName,
    amount: data.totalAmount,
    method: data.method,
    approvedAt: data.approvedAt,
    isTest: secretKey.startsWith('test_'),
  });
}

import { NextResponse } from 'next/server';
import { safeChartId } from '@/lib/chartId';
import { checkEntitled } from '@/lib/entitlement';

export const runtime = 'nodejs';

// 명식 단위 이용권 조회.
//   GET /api/entitlement?chart=<명식 id 16자>
//
// 판매 단위가 "리포트 1건"이므로 계정 전체 프리미엄이라는 개념은 없다.
// 물어본 명식에 대해서만 true/false 를 돌려준다.
export async function GET(req: Request) {
  const chart = safeChartId(new URL(req.url).searchParams.get('chart'));
  const { uid, entitled } = await checkEntitled(chart);

  if (!uid) {
    // 비로그인 — 구매 이력을 계정에 묶어야 기기를 바꿔도 열람되므로 로그인이 필요하다.
    return NextResponse.json({ entitled: false, loggedIn: false }, { status: 200 });
  }
  if (!chart) return NextResponse.json({ entitled: false, loggedIn: true }, { status: 200 });

  return NextResponse.json({ entitled, loggedIn: true });
}

// 서버 전용 이용권 조회.
//
// "진짜" 권한은 여기서만 판정한다. 클라이언트 localStorage 는 화면 깜빡임을 줄이기 위한
// 캐시일 뿐이고, AI 라우트·결제 라우트는 반드시 이 함수를 통해 확인한다.
//
// 이용권의 증빙 = saju_receipts 의 결제 기록.
// 주문번호가 `saju-<chartId>-<랜덤>` 이므로, 해당 유저에게 그 명식으로 시작하는
// 주문번호가 하나라도 있으면 그 명식의 리포트를 구매한 것이다.

import { auth } from '@/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { safeChartId } from '@/lib/chartId';

/** 현재 로그인 유저 id (없으면 null) */
export async function currentUid(): Promise<string | null> {
  try {
    const session = await auth();
    return ((session as any)?.uid as string) ?? null;
  } catch {
    return null;
  }
}

/**
 * 사장님(운영자) 계정인가 — 판매 상품이 아니라 내부 확인용 통과다.
 * Vercel 환경변수 `SAJU_OWNER_UIDS` 에 uid 를 콤마로 나열한다. 예) kakao:123,google:456
 * 비어 있으면 아무도 통과하지 않는다(기본 잠금).
 */
export function isOwnerUid(uid: string | null): boolean {
  if (!uid) return false;
  const raw = process.env.SAJU_OWNER_UIDS;
  if (!raw) return false;
  return raw.split(',').map((s) => s.trim()).filter(Boolean).includes(uid);
}

/** 이 유저가 이 명식(또는 궁합 쌍)의 리포트를 구매했는가 */
export async function hasChartEntitlement(uid: string | null, chart: string | null): Promise<boolean> {
  const id = safeChartId(chart);
  if (!uid || !id) return false;
  // 운영자는 결제 기록 없이도 통과 (사장님 무료 이용)
  if (isOwnerUid(uid)) return true;
  const sb = supabaseAdmin();
  if (!sb) return false;
  try {
    const { data, error } = await sb
      .from('saju_receipts')
      .select('order_id')
      .eq('user_id', uid)
      .like('order_id', `saju-${id}-%`)
      .limit(1);
    if (error) return false;
    return !!(data && data.length > 0);
  } catch {
    return false;
  }
}

/** 라우트에서 쓰는 한 줄 헬퍼 */
export async function checkEntitled(chart: string | null): Promise<{ uid: string | null; entitled: boolean }> {
  const uid = await currentUid();
  const entitled = await hasChartEntitlement(uid, chart);
  return { uid, entitled };
}

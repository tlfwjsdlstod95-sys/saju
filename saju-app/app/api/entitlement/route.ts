import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';

// 로그인 유저의 프리미엄(이용권) 상태를 서버에서 조회.
// 클라이언트 localStorage가 아니라 이 값이 "진짜" 권한입니다.
export async function GET() {
  const session = await auth();
  const id = (session as any)?.uid ?? null;
  const sb = supabaseAdmin();
  if (!id || !sb) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { data, error } = await sb.from('saju_entitlements').select('premium').eq('user_id', id).maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ premium: !!data?.premium });
}

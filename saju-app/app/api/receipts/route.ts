import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';

async function uid(): Promise<string | null> {
  const session = await auth();
  return (session as any)?.uid ?? null;
}

export async function GET() {
  const session = await auth(); const id = (session as any)?.uid ?? null; const sb = supabaseAdmin();
  if (!id || !sb) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { data, error } = await sb.from('saju_receipts').select('*').eq('user_id', id).order('created_at', { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const receipts = (data ?? []).map((r: any) => ({
    orderId: r.order_id, orderName: r.order_name, amount: r.amount,
    method: r.method, approvedAt: r.approved_at, isTest: !!r.is_test,
    savedAt: new Date(r.created_at).getTime(),
  }));
  return NextResponse.json({ receipts });
}

export async function POST(req: Request) {
  const id = await uid(); const sb = supabaseAdmin();
  if (!id || !sb) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  let r: any; try { r = await req.json(); } catch { return NextResponse.json({ error: 'bad request' }, { status: 400 }); }
  if (!r?.orderId) return NextResponse.json({ error: 'invalid' }, { status: 400 });
  const row = {
    order_id: r.orderId, user_id: id, order_name: r.orderName ?? null,
    amount: r.amount ?? null, method: r.method ?? null,
    approved_at: r.approvedAt ?? null, is_test: !!r.isTest,
  };
  const { error } = await sb.from('saju_receipts').upsert(row, { onConflict: 'order_id' });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

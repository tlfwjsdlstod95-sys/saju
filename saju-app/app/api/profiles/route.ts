import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { supabaseAdmin } from '@/lib/supabase';

export const runtime = 'nodejs';

async function uid(): Promise<string | null> {
  const session = await auth();
  return (session as any)?.uid ?? null;
}

function rowToProfile(r: any) {
  return {
    id: r.id, name: r.name,
    year: r.year, month: r.month, day: r.day,
    hour: r.hour, minute: r.minute,
    city: r.city ?? '', sex: r.sex ?? 'M', unknownTime: !!r.unknown_time,
    summary: r.summary ?? undefined, savedAt: Number(r.saved_at),
  };
}

export async function GET() {
  const id = await uid(); const sb = supabaseAdmin();
  if (!id || !sb) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { data, error } = await sb.from('saju_profiles').select('*').eq('user_id', id).order('saved_at', { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ profiles: (data ?? []).map(rowToProfile) });
}

export async function POST(req: Request) {
  const id = await uid(); const sb = supabaseAdmin();
  if (!id || !sb) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  let p: any; try { p = await req.json(); } catch { return NextResponse.json({ error: 'bad request' }, { status: 400 }); }
  if (!p?.id || !p?.name) return NextResponse.json({ error: 'invalid' }, { status: 400 });
  const row = {
    id: p.id, user_id: id, name: p.name,
    year: p.year, month: p.month, day: p.day,
    hour: p.hour ?? null, minute: p.minute ?? 0,
    city: p.city ?? null, sex: p.sex ?? null, unknown_time: !!p.unknownTime,
    summary: p.summary ?? null, saved_at: p.savedAt ?? Date.now(),
  };
  const { error } = await sb.from('saju_profiles').upsert(row, { onConflict: 'id' });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const id = await uid(); const sb = supabaseAdmin();
  if (!id || !sb) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const pid = new URL(req.url).searchParams.get('id');
  if (!pid) return NextResponse.json({ error: 'missing id' }, { status: 400 });
  const { error } = await sb.from('saju_profiles').delete().eq('user_id', id).eq('id', pid);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

// 공개 통계 — 누적 풀이 수 (랜딩 사회적 증거). Upstash 실측값, env 없으면 0.
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function GET() {
  const kvUrl = process.env.UPSTASH_REDIS_REST_URL;
  const kvTok = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!kvUrl || !kvTok) return NextResponse.json({ total: 0 });
  try {
    const r = await fetch(`${kvUrl}/get/stat:readings_total`, {
      headers: { Authorization: `Bearer ${kvTok}` }, cache: 'no-store',
    });
    const j = await r.json();
    const total = parseInt(j?.result ?? '0', 10) || 0;
    return NextResponse.json({ total }, { headers: { 'cache-control': 'public, s-maxage=300' } });
  } catch {
    return NextResponse.json({ total: 0 });
  }
}

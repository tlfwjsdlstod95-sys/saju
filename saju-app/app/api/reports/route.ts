import { NextResponse } from 'next/server';
import { currentUid } from '@/lib/entitlement';
import { safeChartId } from '@/lib/chartId';
import { getReport, listReports, deleteReport, type ReportKind } from '@/lib/reports';

export const runtime = 'nodejs';

const KINDS: ReportKind[] = ['reading', 'yearly', 'gunghap'];

function safeKind(v: unknown): ReportKind | null {
  const s = String(v ?? '');
  return (KINDS as string[]).includes(s) ? (s as ReportKind) : null;
}

// 보관된 리포트 조회.
//   GET /api/reports                                  → 내 리포트 목록(원문 제외)
//   GET /api/reports?kind=reading&chart=<16hex>&variant=default → 단건 원문
//
// 비로그인이면 401 이 아니라 빈 목록을 준다. 익명 사용자도 앱은 그대로 쓰이므로,
// 호출부가 401 을 예외 처리하느라 화면이 깜빡이는 걸 피하기 위해서다.
export async function GET(req: Request) {
  const uid = await currentUid();
  if (!uid) return NextResponse.json({ loggedIn: false, reports: [] });

  const sp = new URL(req.url).searchParams;
  const kind = safeKind(sp.get('kind'));
  const chart = safeChartId(sp.get('chart'));

  if (kind && chart) {
    const variant = String(sp.get('variant') ?? '').slice(0, 40);
    const report = await getReport(uid, kind, chart, variant);
    return NextResponse.json({ loggedIn: true, report });
  }

  return NextResponse.json({ loggedIn: true, reports: await listReports(uid) });
}

export async function DELETE(req: Request) {
  const uid = await currentUid();
  if (!uid) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const id = new URL(req.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'missing id' }, { status: 400 });
  const ok = await deleteReport(uid, id);
  return NextResponse.json({ ok });
}

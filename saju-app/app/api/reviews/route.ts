import { NextResponse } from 'next/server';
import { currentUid, isOwnerUid } from '@/lib/entitlement';
import { safeChartId } from '@/lib/chartId';
import { guardCompute, getClientIp, clampInt } from '@/lib/apiGuard';
import {
  submitReview, listPublicReviews, listAllReviews, setReviewStatus,
  cleanText, looksLikeSpam, ipHash,
  BODY_MIN, BODY_MAX, NICK_MAX, type ReviewStatus,
} from '@/lib/reviews';

export const runtime = 'nodejs';

// 실후기 수집.
//   POST /api/reviews                  → 후기 남기기 (로그인 불필요)
//   GET  /api/reviews?public=1         → 사이트 노출용, 승인된 것만
//   GET  /api/reviews                  → 운영자 전용, 전부(상태 포함)
//   PATCH /api/reviews                 → 운영자 전용, 상태 변경
//
// 로그인을 요구하지 않는 대신 ①명식+작성자당 1행 ②레이트리밋 ③기본 비공개(승인제)
// ④링크·연락처 스팸 필터로 막는다. 승인 전에는 어디에도 보이지 않는다.

const STATUSES: ReviewStatus[] = ['pending', 'public', 'hidden'];

export async function POST(req: Request) {
  const blocked = await guardCompute(req, 'review', { windowMs: 60_000, max: 5 });
  if (blocked) return blocked;

  let raw: any = {};
  try { raw = await req.json(); } catch { return NextResponse.json({ error: 'bad request' }, { status: 400 }); }

  const chart = safeChartId(raw?.chart);
  if (!chart) return NextResponse.json({ error: '명식 정보가 없어요.' }, { status: 400 });

  // ⚠️ clampInt 로 받으면 안 된다 — 0이나 빈 값이 1점으로 올라붙어 "안 고른 별점"이 1점이 된다.
  const rating = Number(raw?.rating);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return NextResponse.json({ error: '별점을 골라 주세요.' }, { status: 400 });
  }

  const body = cleanText(raw?.body, BODY_MAX);
  if (body.length < BODY_MIN) {
    return NextResponse.json({ error: `후기를 ${BODY_MIN}자 이상 적어 주세요.` }, { status: 400 });
  }
  if (looksLikeSpam(body)) {
    return NextResponse.json({ error: '링크·연락처는 후기에 담을 수 없어요.' }, { status: 400 });
  }

  const nickname = cleanText(raw?.nickname, NICK_MAX);
  const consent = raw?.consent === true;
  const tier = raw?.tier === 'premium' ? 'premium' : 'free';
  const engine = clampInt(raw?.engine, 0, 999, 0) || null;

  const uid = await currentUid();
  const hash = ipHash(getClientIp(req));
  const who = uid ?? `ip:${hash}`;

  const res = await submitReview({
    chart, who, userId: uid, rating, body, nickname, tier, engine, consent, ipHashValue: hash,
  });

  // 저장에 실패해도 사용자에겐 사고처럼 보이지 않게 한다(후기는 부가 기능).
  if (!res.ok) return NextResponse.json({ ok: false, saved: false }, { status: 200 });
  return NextResponse.json({ ok: true, saved: true });
}

export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;

  if (sp.get('public')) {
    const limit = clampInt(sp.get('limit'), 1, 50, 12);
    return NextResponse.json({ reviews: await listPublicReviews(limit) });
  }

  const uid = await currentUid();
  if (!isOwnerUid(uid)) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  return NextResponse.json({ reviews: await listAllReviews(200) });
}

export async function PATCH(req: Request) {
  const uid = await currentUid();
  if (!isOwnerUid(uid)) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  let raw: any = {};
  try { raw = await req.json(); } catch { return NextResponse.json({ error: 'bad request' }, { status: 400 }); }

  const id = String(raw?.id ?? '').slice(0, 120);
  const status = String(raw?.status ?? '') as ReviewStatus;
  if (!id || !STATUSES.includes(status)) {
    return NextResponse.json({ error: 'bad request' }, { status: 400 });
  }
  return NextResponse.json({ ok: await setReviewStatus(id, status) });
}

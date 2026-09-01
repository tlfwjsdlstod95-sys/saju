// 실후기 수집 — 서버 전용 (service_role 키 사용).
//
// 원칙
//   - 가짜 후기를 쓰지 않는 대신 진짜 후기를 받는다. 그래서 문턱을 낮춘다(로그인 불필요).
//   - 문턱이 낮은 만큼 기본값은 비공개다. 사장님이 /admin/reviews 에서 승인한 것만 노출된다.
//   - 저장 실패가 사용자 화면을 깨뜨리면 안 된다(조회는 빈 배열, 저장은 사유가 담긴 결과 객체).
//   - 원문 IP 는 남기지 않는다. 소금 친 해시 앞부분만 중복 방지용으로 쓴다.

import { createHash } from 'crypto';
import { supabaseAdmin } from '@/lib/supabase';

export type ReviewStatus = 'pending' | 'public' | 'hidden';

export interface ReviewRow {
  id: string;
  chart: string;
  userId: string | null;
  rating: number;
  body: string;
  nickname: string;
  tier: string;
  engine: number | null;
  consent: boolean;
  status: ReviewStatus;
  createdAt: number;
}

/** 사이트에 노출할 때 쓰는 최소 정보 (작성자 추적 정보 없음) */
export interface PublicReview {
  rating: number;
  body: string;
  nickname: string;
  createdAt: number;
}

export const BODY_MIN = 4;
export const BODY_MAX = 300;
export const NICK_MAX = 12;

/** 제어문자 제거 + 공백 정리 + 길이 제한 */
export function cleanText(v: unknown, max: number): string {
  let out = '';
  for (const ch of String(v ?? '')) {
    const code = ch.codePointAt(0) ?? 0;
    out += code < 32 || code === 127 ? ' ' : ch;
  }
  return out.replace(/\s+/g, ' ').trim().slice(0, max);
}

/** 광고·스팸 필터 — 링크나 연락처가 섞이면 후기가 아니라 광고다 */
export function looksLikeSpam(body: string): boolean {
  if (/https?:\/\/|www\.|\.com|\.net|\.co\.kr/i.test(body)) return true;
  if (/(카톡|카카오톡|텔레그램|오픈채팅|open\.kakao)/i.test(body)) return true;
  if (/\d{2,3}[-. ]?\d{3,4}[-. ]?\d{4}/.test(body)) return true; // 전화번호꼴
  return false;
}

export function ipHash(ip: string): string {
  const salt = process.env.AUTH_SECRET || 'heaarim';
  return createHash('sha256').update(`${salt}|${ip}`).digest('hex').slice(0, 16);
}

/** 같은 명식 + 같은 작성자 = 한 행 (다시 내면 갱신) */
export function reviewId(chart: string, who: string): string {
  return `${chart}|${who}`;
}

function rowToReview(r: any): ReviewRow {
  return {
    id: r.id,
    chart: r.chart,
    userId: r.user_id ?? null,
    rating: Number(r.rating) || 0,
    body: r.body ?? '',
    nickname: r.nickname || '익명',
    tier: r.tier ?? 'free',
    engine: r.engine ?? null,
    consent: !!r.consent,
    status: (r.status ?? 'pending') as ReviewStatus,
    createdAt: new Date(r.created_at).getTime(),
  };
}

export interface SubmitResult { ok: boolean; reason?: 'db' | 'error' }

/**
 * 후기 저장(신규 또는 갱신). 검증은 라우트가 이미 끝낸 값을 받는다.
 * ok=false 는 "저장 못 했다"는 뜻 — 사용자에겐 조용한 실패로 안내한다.
 */
export async function submitReview(args: {
  chart: string;
  who: string;              // uid 또는 "ip:<해시>"
  userId: string | null;
  rating: number;
  body: string;
  nickname: string;
  tier: string;
  engine: number | null;
  consent: boolean;
  ipHashValue: string;
}): Promise<SubmitResult> {
  const sb = supabaseAdmin();
  if (!sb) return { ok: false, reason: 'db' };
  try {
    const { error } = await sb.from('saju_reviews').upsert(
      {
        id: reviewId(args.chart, args.who),
        chart: args.chart,
        user_id: args.userId,
        rating: args.rating,
        body: args.body,
        nickname: args.nickname || null,
        tier: args.tier,
        engine: args.engine,
        consent: args.consent,
        ip_hash: args.ipHashValue,
        // status 는 넘기지 않는다 — 이미 승인된 글을 고쳐도 자동 재공개되지 않도록.
        // 신규 행일 때만 테이블 기본값 'pending' 이 들어간다.
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' },
    );
    if (error) return { ok: false, reason: 'db' };
    return { ok: true };
  } catch {
    return { ok: false, reason: 'error' };
  }
}

/** 사이트에 노출할 승인된 후기 */
export async function listPublicReviews(limit = 12): Promise<PublicReview[]> {
  const sb = supabaseAdmin();
  if (!sb) return [];
  try {
    const { data, error } = await sb
      .from('saju_reviews')
      .select('rating, body, nickname, created_at')
      .eq('status', 'public')
      .order('created_at', { ascending: false })
      .limit(Math.min(50, Math.max(1, limit)));
    if (error || !data) return [];
    return data.map((r: any) => ({
      rating: Number(r.rating) || 0,
      body: r.body ?? '',
      nickname: r.nickname || '익명',
      createdAt: new Date(r.created_at).getTime(),
    }));
  } catch {
    return [];
  }
}

/** 운영자 화면용 — 전부(최신순) */
export async function listAllReviews(limit = 200): Promise<ReviewRow[]> {
  const sb = supabaseAdmin();
  if (!sb) return [];
  try {
    const { data, error } = await sb
      .from('saju_reviews')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(Math.min(500, Math.max(1, limit)));
    if (error || !data) return [];
    return data.map(rowToReview);
  } catch {
    return [];
  }
}

/** 운영자 화면용 — 공개/보류/숨김 전환 */
export async function setReviewStatus(id: string, status: ReviewStatus): Promise<boolean> {
  const sb = supabaseAdmin();
  if (!sb) return false;
  try {
    const { error } = await sb
      .from('saju_reviews')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id);
    return !error;
  } catch {
    return false;
  }
}

/** 평균 별점·건수 (승인분 기준). 후기가 없으면 count 0. */
export async function publicReviewStats(): Promise<{ count: number; avg: number }> {
  const sb = supabaseAdmin();
  if (!sb) return { count: 0, avg: 0 };
  try {
    const { data, error } = await sb.from('saju_reviews').select('rating').eq('status', 'public');
    if (error || !data || data.length === 0) return { count: 0, avg: 0 };
    const sum = data.reduce((a: number, r: any) => a + (Number(r.rating) || 0), 0);
    return { count: data.length, avg: Math.round((sum / data.length) * 10) / 10 };
  } catch {
    return { count: 0, avg: 0 };
  }
}

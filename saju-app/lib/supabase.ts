// Supabase 서버 클라이언트 (service_role 키 — 서버 라우트에서만 사용)
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let cached: SupabaseClient | null = null;

/** 환경변수가 없으면 null 반환 → 호출부에서 "클라우드 미설정"으로 처리 (익명 동작 유지) */
export function supabaseAdmin(): SupabaseClient | null {
  if (cached) return cached;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  cached = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  return cached;
}

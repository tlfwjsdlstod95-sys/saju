// Auth.js (NextAuth v5) — 카카오 · 네이버 · 구글 로그인
// 환경변수가 없는 provider는 자동으로 비활성화되어, 키가 있는 것만 노출됩니다.
import NextAuth from 'next-auth';
import Kakao from 'next-auth/providers/kakao';
import Naver from 'next-auth/providers/naver';
import Google from 'next-auth/providers/google';
import { supabaseAdmin } from '@/lib/supabase';

const providers = [];
if (process.env.AUTH_KAKAO_ID) providers.push(Kakao);
if (process.env.AUTH_NAVER_ID) providers.push(Naver);
if (process.env.AUTH_GOOGLE_ID) providers.push(Google);

const {
  handlers: rawHandlers,
  auth,
  signIn,
  signOut,
} = NextAuth({
  providers,
  session: { strategy: 'jwt' },
  trustHost: true,
  callbacks: {
    async jwt({ token, account, profile }) {
      if (account) {
        token.uid = `${account.provider}:${account.providerAccountId}`;
        token.provider = account.provider;
        // 유저 레코드 upsert (있으면 last_seen 갱신)
        // ⚠️ 클라우드 저장(Supabase) 실패가 로그인 자체를 막지 않도록 격리.
        //    여기서 throw되면 Auth.js가 "Configuration" 서버 에러를 띄움.
        try {
          const sb = supabaseAdmin();
          if (sb) {
            const email = (profile as any)?.email ?? token.email ?? null;
            const name = (profile as any)?.name ?? token.name ?? null;
            await sb.from('saju_users').upsert(
              { id: token.uid as string, email, name, provider: account.provider, last_seen: new Date().toISOString() },
              { onConflict: 'id' },
            );
          }
        } catch (e) {
          // 클라우드 저장만 실패 — 로그인은 계속 진행 (익명/로컬 동작 유지)
          console.error('[auth] saju_users upsert 실패(로그인은 계속):', e);
        }
      }
      return token;
    },
    async session({ session, token }) {
      (session as any).uid = token.uid ?? null;
      (session as any).provider = token.provider ?? null;
      return session;
    },
  },
});

// ⚠️ 네이버 호환 패치: 네이버 토큰 응답의 expires_in이 "문자열"이라
//    Auth.js v5(oauth4webapi)가 "must be a positive number"로 콜백을 거부함.
//    네이버 콜백 동안에만 fetch를 가로채, 네이버 토큰 엔드포인트 응답의
//    expires_in을 숫자로 보정한다. (의존성 추가 없음)
function naverFetchInterceptor(orig: typeof fetch): typeof fetch {
  return (async (input: any, init?: any) => {
    const res = await orig(input, init);
    try {
      const url =
        typeof input === 'string'
          ? input
          : input && typeof input === 'object' && 'url' in input
            ? (input as any).url
            : String(input);
      if (url && url.includes('nid.naver.com/oauth2.0/token')) {
        const data = await res.clone().json();
        if (data && data.expires_in != null && typeof data.expires_in !== 'number') {
          data.expires_in = Number(data.expires_in);
          return new Response(JSON.stringify(data), {
            status: res.status,
            statusText: res.statusText,
            headers: { 'content-type': 'application/json' },
          });
        }
      }
    } catch {
      /* 보정 실패 시 원본 응답 그대로 사용 */
    }
    return res;
  }) as typeof fetch;
}

const handlers = {
  POST: rawHandlers.POST,
  GET: async (req: Parameters<typeof rawHandlers.GET>[0]) => {
    if (new URL(req.url).pathname.endsWith('/api/auth/callback/naver')) {
      const orig = globalThis.fetch;
      globalThis.fetch = naverFetchInterceptor(orig);
      try {
        return await rawHandlers.GET(req);
      } finally {
        globalThis.fetch = orig;
      }
    }
    return rawHandlers.GET(req);
  },
};

export { handlers, auth, signIn, signOut };

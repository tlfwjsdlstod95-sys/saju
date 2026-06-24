// Auth.js (NextAuth v5) — 카카오 · 네이버 · 구글 로그인
// 환경변수가 없는 provider는 자동으로 비활성화되어, 키가 있는 것만 노출됩니다.
import NextAuth from 'next-auth';
import Kakao from 'next-auth/providers/kakao';
import Naver from 'next-auth/providers/naver';
import Google from 'next-auth/providers/google';
import { supabaseAdmin } from '@/lib/supabase';

const providers = [];
if (process.env.AUTH_KAKAO_ID) providers.push(Kakao);
if (process.env.AUTH_NAVER_ID)
  providers.push(
    Naver({
      clientId: process.env.AUTH_NAVER_ID,
      clientSecret: process.env.AUTH_NAVER_SECRET,
      // ⚠️ 네이버 토큰 응답의 expires_in이 "문자열"이라 Auth.js v5(oauth4webapi)가
      //    "must be a positive number"로 콜백을 거부함 → 숫자로 보정해 통과시킴.
      token: {
        url: 'https://nid.naver.com/oauth2.0/token',
        async conform(response: Response) {
          const data = await response.clone().json().catch(() => null);
          if (data && typeof data.expires_in === 'string') {
            data.expires_in = Number(data.expires_in);
            return Response.json(data);
          }
          return response;
        },
      },
    }),
  );
if (process.env.AUTH_GOOGLE_ID) providers.push(Google);

export const { handlers, auth, signIn, signOut } = NextAuth({
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

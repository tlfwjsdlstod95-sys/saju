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
        const sb = supabaseAdmin();
        if (sb) {
          const email = (profile as any)?.email ?? token.email ?? null;
          const name = (profile as any)?.name ?? token.name ?? null;
          await sb.from('saju_users').upsert(
            { id: token.uid as string, email, name, provider: account.provider, last_seen: new Date().toISOString() },
            { onConflict: 'id' },
          );
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

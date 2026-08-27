// Auth.js (NextAuth v5) — 카카오 · 네이버 · 구글 로그인
// 환경변수가 없는 provider는 자동으로 비활성화되어, 키가 있는 것만 노출됩니다.
import NextAuth from 'next-auth';
import Kakao from 'next-auth/providers/kakao';
import Naver from 'next-auth/providers/naver';
import Google from 'next-auth/providers/google';
import Credentials from 'next-auth/providers/credentials';
import { supabaseAdmin } from '@/lib/supabase';

const providers: any[] = [];
if (process.env.AUTH_KAKAO_ID) providers.push(Kakao);
if (process.env.AUTH_NAVER_ID) providers.push(Naver);
if (process.env.AUTH_GOOGLE_ID) providers.push(Google);

// ── 심사(PG·카드사) 전용 계정 ────────────────────────────────
// 왜 필요한가: 판매 단위를 '리포트 1건'으로 바꾸면서 결제 전 로그인을 필수로 만들었다.
//   (결제 기록이 계정에 묶여야 이용권 판정이 되므로) 그 결과 비회원은 결제창까지 갈 수 없고,
//   심사자가 결제 경로를 확인할 방법이 사라졌다. 우리 로그인은 소셜(OAuth) 뿐이라
//   넘겨줄 아이디/비밀번호가 없어서, 심사 기간에만 여는 전용 계정을 둔다.
//
// 안전장치
//   - 환경변수 REVIEW_LOGIN_ID / REVIEW_LOGIN_PASSWORD 가 **둘 다** 있을 때만 provider 자체가 등록된다.
//     심사가 끝나면 Vercel 에서 두 변수를 지우고 재배포 = 즉시 완전 비활성화.
//   - uid 는 `credentials:<id>` 라 소셜 계정과 섞이지 않는다.
//   - 이 계정에 이용권을 주지 않는다. 즉 **실제 결제 플로우를 그대로 밟는다** — 심사자가 봐야 하는 것이 그것이다.
//   - SAJU_OWNER_UIDS(사장님 통과 목록)에 절대 넣지 말 것. 넣으면 결제 없이 열려 심사 의미가 없어진다.
const REVIEW_ID = process.env.REVIEW_LOGIN_ID;
const REVIEW_PW = process.env.REVIEW_LOGIN_PASSWORD;
if (REVIEW_ID && REVIEW_PW) {
  providers.push(
    Credentials({
      id: 'review',
      name: '심사 전용 계정',
      credentials: {
        username: { label: '아이디', type: 'text' },
        password: { label: '비밀번호', type: 'password' },
      },
      async authorize(creds) {
        const u = String((creds as any)?.username ?? '');
        const pw = String((creds as any)?.password ?? '');
        // 길이가 다르면 즉시 실패시키되, 같을 때는 전 바이트를 비교해 타이밍 차를 줄인다.
        const eq = (a: string, b: string) => {
          if (a.length !== b.length) return false;
          let d = 0;
          for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
          return d === 0;
        };
        if (eq(u, REVIEW_ID) && eq(pw, REVIEW_PW)) {
          return { id: REVIEW_ID, name: '심사 전용 계정' };
        }
        return null;
      },
    }),
  );
}

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
        // 심사 계정은 Supabase 에 유저 레코드를 만들지 않는다(운영 데이터 오염 방지).
        if (account.provider === 'review') return token;
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

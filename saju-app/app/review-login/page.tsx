import type { Metadata } from 'next';
import Link from 'next/link';
import ReviewLoginForm from './ReviewLoginForm';

// 심사 전용 로그인 페이지.
// 사이트 어디에서도 링크하지 않고, 검색 노출도 막는다. 심사가 끝나면 환경변수
// REVIEW_LOGIN_ID / REVIEW_LOGIN_PASSWORD 를 지우는 것만으로 로그인 자체가 비활성화된다.
export const dynamic = 'force-dynamic'; // 런타임 환경변수로 판단해야 심사 종료 후 즉시 닫힌다

export const metadata: Metadata = {
  title: '심사 전용 로그인 · 헤아림',
  robots: { index: false, follow: false, nocache: true },
};

export default function ReviewLoginPage() {
  const enabled = !!(process.env.REVIEW_LOGIN_ID && process.env.REVIEW_LOGIN_PASSWORD);

  return (
    <main className="wrap">
      <div className="card" style={{ maxWidth: 460, margin: '48px auto' }}>
        <h2>심사 전용 로그인</h2>
        {enabled ? (
          <>
            <p className="meta" style={{ marginBottom: 18 }}>
              결제 경로 심사를 위해 제공된 계정입니다. 로그인 후 첫 화면에서 사주를 분석하시면
              결제 단계까지 확인하실 수 있습니다.
            </p>
            <ReviewLoginForm />
          </>
        ) : (
          <p className="meta">현재 사용할 수 없는 페이지입니다.</p>
        )}
        <p className="meta" style={{ marginTop: 22, fontSize: 12.5 }}>
          일반 이용자는 <Link href="/" style={{ color: 'var(--gold)' }}>첫 화면</Link>에서
          카카오·네이버·구글 계정으로 로그인하실 수 있습니다.
        </p>
      </div>
    </main>
  );
}

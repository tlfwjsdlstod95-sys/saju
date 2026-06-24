'use client';

import { useState } from 'react';
import { useSession, signIn, signOut } from 'next-auth/react';

// 로그인/로그아웃 UI. 로그인하면 보관함·이용권·영수증이 서버에 저장됩니다.
// 기본 Auth.js 화면(영어 "Sign in with…") 대신, 한글 provider 버튼을 직접 노출합니다.
export default function AccountButton() {
  const { data: session, status } = useSession();
  const [open, setOpen] = useState(false);

  if (status === 'loading') return null;

  if (session && (session as any).uid) {
    const label = session.user?.name || session.user?.email || '내 계정';
    return (
      <div className="account-box">
        <span className="account-name">☁ {label} · 기록 저장됨</span>
        <button className="account-btn" onClick={() => signOut()}>로그아웃</button>
      </div>
    );
  }

  if (!open) {
    return (
      <div className="account-box">
        <button className="account-btn primary" onClick={() => setOpen(true)}>
          로그인하고 내 사주 저장하기
        </button>
        <span className="account-hint">로그인은 선택이에요. 안 해도 다 쓸 수 있어요.</span>
      </div>
    );
  }

  return (
    <div className="account-box">
      <div className="login-providers">
        <button className="login-btn kakao" onClick={() => signIn('kakao')}>
          <span className="login-ic">💬</span> 카카오로 로그인
        </button>
        <button className="login-btn naver" onClick={() => signIn('naver')}>
          <span className="login-ic">N</span> 네이버로 로그인
        </button>
        <button className="login-btn google" onClick={() => signIn('google')}>
          <span className="login-ic">G</span> 구글로 로그인
        </button>
      </div>
      <span className="account-hint">로그인은 선택이에요. 안 해도 다 쓸 수 있어요.</span>
    </div>
  );
}

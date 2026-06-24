'use client';

import { useSession, signIn, signOut } from 'next-auth/react';

// 로그인/로그아웃 버튼. 로그인하면 보관함·이용권·영수증이 서버에 저장됩니다.
// signIn()을 인자 없이 부르면 Auth.js 기본 로그인 화면(켜진 provider만 노출)이 뜹니다.
export default function AccountButton() {
  const { data: session, status } = useSession();

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

  return (
    <div className="account-box">
      <button className="account-btn primary" onClick={() => signIn()}>
        로그인하고 내 사주 저장하기
      </button>
      <span className="account-hint">로그인은 선택이에요. 안 해도 다 쓸 수 있어요.</span>
    </div>
  );
}

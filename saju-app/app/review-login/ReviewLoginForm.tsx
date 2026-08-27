'use client';

import { useState } from 'react';
import { signIn, useSession, signOut } from 'next-auth/react';

// 심사(PG·카드사) 전용 로그인 폼.
// 어디에서도 링크하지 않는다 — 심사 담당자에게 주소·아이디·비밀번호를 직접 전달한다.
export default function ReviewLoginForm() {
  const { data: session, status } = useSession();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(''); setBusy(true);
    const res = await signIn('review', { username, password, redirect: false });
    setBusy(false);
    if (res?.error) { setErr('아이디 또는 비밀번호가 올바르지 않습니다.'); return; }
    window.location.href = '/';
  }

  if (status === 'loading') return <p className="meta">확인 중…</p>;

  if (session && (session as any).uid) {
    return (
      <div className="review-done">
        <p className="review-ok">✓ 로그인되었습니다.</p>
        <p className="meta">
          이제 첫 화면에서 생년월일시를 입력해 사주를 분석한 뒤,
          <b> ‘AI 심층 풀이 보기’</b>를 누르면 결제창까지 진행하실 수 있습니다.
        </p>
        <div className="review-actions">
          <a className="btn" href="/">첫 화면으로</a>
          <button className="mini-btn" onClick={() => signOut({ callbackUrl: '/review-login' })}>로그아웃</button>
        </div>
      </div>
    );
  }

  return (
    <form className="review-form" onSubmit={submit}>
      <label className="review-label">
        아이디
        <input value={username} onChange={(e) => setUsername(e.target.value)}
               autoComplete="username" autoCapitalize="off" spellCheck={false} required />
      </label>
      <label className="review-label">
        비밀번호
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
               autoComplete="current-password" required />
      </label>
      {err && <p className="review-err">{err}</p>}
      <button className="btn" type="submit" disabled={busy}>{busy ? '확인 중…' : '로그인'}</button>
    </form>
  );
}

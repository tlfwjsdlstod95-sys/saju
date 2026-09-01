// 후기 승인 화면 — 운영자 전용.
//
// SAJU_OWNER_UIDS 에 등록된 계정으로 로그인했을 때만 목록이 보인다.
// 어디서도 링크하지 않고 검색엔진에도 넣지 않는다(주소를 아는 사람만 들어온다).

import type { Metadata } from 'next';
import { currentUid, isOwnerUid } from '@/lib/entitlement';
import { listAllReviews } from '@/lib/reviews';
import ReviewAdmin from './ReviewAdmin';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: '후기 관리 | 헤아림',
  robots: { index: false, follow: false },
};

export default async function ReviewAdminPage() {
  const uid = await currentUid();
  if (!isOwnerUid(uid)) {
    return (
      <main className="wrap">
        <div className="card">
          <h2>후기 관리</h2>
          <p className="meta">운영자 계정으로 로그인해야 볼 수 있어요.</p>
        </div>
      </main>
    );
  }

  const reviews = await listAllReviews(200);
  return (
    <main className="wrap">
      <div className="hero" style={{ paddingTop: 32, marginBottom: 20 }}>
        <div className="hero-kr">後記</div>
        <h1 style={{ fontSize: 'clamp(22px, 4.5vw, 32px)' }}>후기 관리</h1>
        <p>‘공개’로 바꾼 후기만 메인 화면에 실립니다. 기본값은 보류예요.</p>
      </div>
      <ReviewAdmin initial={reviews} />
    </main>
  );
}

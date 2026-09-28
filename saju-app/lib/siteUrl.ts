// 사이트 절대 주소 — **한 곳에서만 정한다.**
//
// 왜 파일까지 만들었나 (2026-09-09)
//   `layout.tsx` 의 기본값은 `http://localhost:3000`, `sitemap.ts` 의 기본값은 `https://heaarim.co.kr` 로
//   **서로 달랐다.** 환경변수가 잡혀 있으면 안 드러나지만, 빠지는 순간 OG 이미지와 사이트맵이
//   다른 도메인을 가리킨다 — 검색엔진 입장에선 그게 곧 「신뢰 못 할 사이트」다.
//   같은 값을 두 곳에 적어 두면 언젠가 어긋난다. 첫 화면 59命 사고와 같은 종류의 버그다.
//
// ⚠️ 운영 도메인이 바뀌면 **Vercel 환경변수 `NEXT_PUBLIC_SITE_URL` 만** 고친다.
//    (그리고 토스 상점관리자 > 회사정보 > 홈페이지 정보에 URL 변경 신청도 별도로 해야 한다)
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://heaarim.co.kr').replace(/\/+$/, '');

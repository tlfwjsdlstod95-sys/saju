import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/siteUrl';

// robots.txt — **없었다.** (2026-09-09 추가)
//   사이트맵은 63개 URL로 잘 만들어 두고, 크롤러에게 그 위치를 알려주는 파일이 없었다.
//   검색에 안 잡히는 이유가 콘텐츠 부족 이전에 **등록·수집 문제**일 수 있다.
//
//   네이버 크롤러는 `Yeti` 다. 와일드카드로도 잡히지만, 국내 유입이 핵심이라 **명시해 둔다**
//   (일부 사이트가 UA별 규칙 때문에 수집이 막히는 사고가 흔하다).
//   막는 곳: API·관리자·심사용 로그인·결제 리다이렉트 — 검색 결과에 뜰 이유가 없고, 떠도 손해다.
export default function robots(): MetadataRoute.Robots {
  const disallow = ['/api/', '/admin', '/review-login', '/payment/'];
  return {
    rules: [
      { userAgent: '*', allow: '/', disallow },
      { userAgent: 'Yeti', allow: '/', disallow },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}

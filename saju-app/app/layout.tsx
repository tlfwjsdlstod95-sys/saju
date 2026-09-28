import type { Metadata, Viewport } from 'next';
import './globals.css';
import PwaSetup from './PwaSetup';
import Footer from './Footer';
import Providers from './Providers';
import AccountSync from './AccountSync';
// Vercel Analytics — 대시보드는 2026-09-04에 켰는데 **수집 스크립트가 없어 계속 0** 이었다.
// 릴스 발행 전에 이게 붙어 있어야 baseline(유입 전 평상시 수치)을 잡을 수 있다.
import { Analytics } from '@vercel/analytics/react';
import TrackInit from './TrackInit';
import SiteHeader from './SiteHeader';

import { SITE_URL } from '@/lib/siteUrl';

const TITLE = '헤아림 · 정밀 만세력 사주';
// 2026-09-29: 「AI 사주 가이드」 → 「계산이 맞는 곳」 포지션으로. 검색·공유에서 가장 먼저 보이는 문장이다.
const DESC = '같은 생년월일시인데 앱마다 사주가 다른 이유 — 진태양시·절기·야자시까지 계산해 당신 명식이 갈리는 지점을 보여드립니다. 절기 오차 평균 6.8초, 71,733일 만세력 100% 일치.';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: TITLE,
  description: DESC,
  manifest: '/manifest.webmanifest',
  // 중복 콘텐츠 방지 — 같은 사이트가 `saju-cznh.vercel.app` 로도 그대로 열린다(2026-09-09 확인).
  //   검색엔진에는 내용이 같은 사이트가 둘로 보여 순위가 쪼개진다.
  //   `'./'` 는 metadataBase + **현재 경로**로 해석되므로 페이지마다 자기 주소가 canonical 이 된다
  //   (루트로 몰아버리면 /iljoo/* 60개가 통째로 죽으므로, 빌드 산출물에서 실제 태그를 확인했다).
  //   ⚠️ vercel.app → 커스텀 도메인 **301 리다이렉트**가 더 강력하지만, 토스 심사 항목에
  //      「URL 주소 및 접근 가능여부」가 있어 심사 중에는 건드리지 않는다. 승인 후 검토.
  alternates: { canonical: './' },
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: '헤아림' },
  icons: { icon: '/icon-192.png', apple: '/apple-touch-icon.png' },
  openGraph: {
    title: TITLE, description: DESC, type: 'website', locale: 'ko_KR',
    siteName: '헤아림', url: SITE_URL,
    images: [{ url: '/og.png', width: 1200, height: 630, alt: '헤아림 · 정밀 만세력 사주' }],
  },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESC, images: ['/og.png'] },
  // 검색엔진 소유 확인 — 값은 **환경변수로만** 넣는다.
  //   네이버 서치어드바이저·구글 서치콘솔에 사이트를 등록하면 인증 코드를 주는데,
  //   그때 Vercel 환경변수만 채우고 재배포하면 된다(코드를 다시 고칠 일이 없다).
  //   값이 없으면 태그 자체가 안 나가므로 지금 배포해도 부작용이 없다.
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_VERIFICATION || undefined,
    other: process.env.NEXT_PUBLIC_NAVER_VERIFICATION
      ? { 'naver-site-verification': process.env.NEXT_PUBLIC_NAVER_VERIFICATION }
      : {},
  },
};

export const viewport: Viewport = {
  themeColor: '#0c0a16',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Nanum+Myeongjo:wght@400;700;800&family=Noto+Sans+KR:wght@300;400;500;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <Providers>
          <AccountSync />
          <SiteHeader />
          {children}
          <Footer />
        </Providers>
        <PwaSetup />
        <Analytics />
        <TrackInit />
      </body>
    </html>
  );
}

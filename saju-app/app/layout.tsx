import type { Metadata, Viewport } from 'next';
import './globals.css';
import PwaSetup from './PwaSetup';
import Footer from './Footer';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
const TITLE = '命理 · 사주, 나를 꿰뚫다';
const DESC = '천문 데이터로 본 정통 만세력. 나를 가장 정확하게 읽어주는 선배 같은 사주 풀이.';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: TITLE,
  description: DESC,
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: '사주 명리' },
  icons: { icon: '/icon-192.png', apple: '/apple-touch-icon.png' },
  openGraph: {
    title: TITLE, description: DESC, type: 'website', locale: 'ko_KR',
    siteName: '사주 명리', url: SITE_URL,
    images: [{ url: '/og.png', width: 1200, height: 630, alt: '사주, 나를 꿰뚫다' }],
  },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESC, images: ['/og.png'] },
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
        {children}
        <Footer />
        <PwaSetup />
      </body>
    </html>
  );
}

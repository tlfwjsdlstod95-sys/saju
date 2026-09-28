'use client';
// 상단 헤더 — 검색·공유로 하위 페이지에 바로 들어온 사람이 길을 잃지 않게.
// 홈은 히어로에 워드마크가 이미 있어서 그리지 않는다.
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const LINKS: [string, string][] = [['/', '내 사주'], ['/gunghap', '궁합'], ['/accuracy', '검증'], ['/pricing', '가격']];

export default function SiteHeader() {
  const path = usePathname() || '/';
  if (path === '/' || path.startsWith('/admin') || path.startsWith('/payment')) return null;
  return (
    <header className="site-header">
      <Link href="/" className="site-logo">헤아림</Link>
      <nav>
        {LINKS.map(([href, label]) => (
          <Link key={href} href={href} className={path === href || (href !== '/' && path.startsWith(href)) ? 'on' : ''}>{label}</Link>
        ))}
      </nav>
    </header>
  );
}

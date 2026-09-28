// 페이지별 공유 정보(OG·트위터) — 2026-09-28
//
// 왜 필요한가: 루트 layout 의 openGraph 는 하위 페이지가 openGraph 를 **직접 쓰지 않으면 그대로 상속**된다.
//   그래서 /iljoo/갑자 · /sample · /accuracy 를 카톡에 공유해도 제목·설명·링크가 전부 홈으로 나왔다
//   (라이브 확인: og:title 「헤아림 · 정밀 만세력 사주」, og:url https://heaarim.co.kr).
//   일주·신살 사전 72쪽은 검색·공유로 들어오는 입구라 이게 곧 유입 손실이었다.
// 규칙: 페이지 metadata 는 이 함수로만 만든다. openGraph 를 쓰면 부모 것이 **통째로** 교체되므로
//   이미지·사이트명·로캘까지 여기서 다 채운다. path 는 metadataBase(SITE_URL) 기준 상대경로.
import type { Metadata } from 'next';

const SITE = '헤아림';
const DEFAULT_IMAGE = { url: '/og.png', width: 1200, height: 630, alt: '헤아림 · 정밀 만세력 사주' };

/** 검색 제목의 꼬리(「 | 헤아림」「 · 헤아림」)는 공유 카드에선 사이트명과 겹치므로 뗀다 */
const shareTitle = (t: string) => t.replace(/\s*[|·]\s*헤아림( 사주)?\s*$/, '');

export function pageMeta(o: {
  title: string;
  description: string;
  path: string;
  /** 공유 카드 제목을 검색 제목과 다르게 쓸 때 */
  ogTitle?: string;
  ogDescription?: string;
  image?: { url: string; width: number; height: number; alt: string };
}): Metadata {
  const ogTitle = o.ogTitle ?? shareTitle(o.title);
  const ogDesc = o.ogDescription ?? o.description;
  const image = o.image ?? DEFAULT_IMAGE;
  return {
    title: o.title,
    description: o.description,
    openGraph: { title: ogTitle, description: ogDesc, url: o.path, type: 'website', locale: 'ko_KR', siteName: SITE, images: [image] },
    twitter: { card: 'summary_large_image', title: ogTitle, description: ogDesc, images: [image.url] },
  };
}

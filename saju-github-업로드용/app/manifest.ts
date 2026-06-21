import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: '命理 · 사주, 나를 꿰뚫다',
    short_name: '사주 명리',
    description: '천문 데이터로 본 정통 만세력. 나를 가장 정확하게 읽어주는 선배 같은 사주 풀이.',
    start_url: '/',
    display: 'standalone',
    background_color: '#0c0a16',
    theme_color: '#0c0a16',
    lang: 'ko',
    orientation: 'portrait',
    categories: ['lifestyle', 'entertainment'],
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}

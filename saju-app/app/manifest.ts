import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: '헤아림 · 정밀 만세력 사주',
    short_name: '헤아림 사주',
    description: '천문 데이터로 헤아리는 나. 야자시·균시차까지 보정한 정밀 만세력 사주 풀이.',
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

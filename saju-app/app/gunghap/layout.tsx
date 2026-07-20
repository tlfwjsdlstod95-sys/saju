import type { Metadata } from 'next';

// 궁합 페이지 전용 OG — 공유가 일어나는 페이지의 광고판
export const metadata: Metadata = {
  title: '우리 궁합, 몇 점일까? 💞 | 헤아림',
  description: '천간합·지지합·오행 보완으로 계산하는 정통 사주 궁합. 상대방 생일을 몰라도 내 정보만 넣고 링크를 보내면 완성돼요.',
  openGraph: {
    title: '우리 궁합, 몇 점일까? 💞',
    description: '두 사람의 명식으로 보는 정통 사주 궁합 — 지금 무료로 확인해보세요.',
    images: ['/og.png'],
  },
  twitter: { card: 'summary_large_image', title: '우리 궁합, 몇 점일까? 💞', images: ['/og.png'] },
};

export default function GunghapLayout({ children }: { children: React.ReactNode }) {
  return children;
}

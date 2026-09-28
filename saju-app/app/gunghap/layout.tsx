import type { Metadata } from 'next';

// 궁합 페이지 전용 OG — 공유가 일어나는 페이지의 광고판
// 검색용 제목에는 **결합어**를 넣는다 — 「헤아림」 단독은 동명 회사(hearim.co.kr)와 트래픽을 나눠 갖는다.
// 공유용 OG 제목은 감정 진입 문장 그대로 간다(카톡·인스타에서 보이는 광고판이라 목적이 다르다).
export const metadata: Metadata = {
  title: '사주 궁합 — 이 사람이랑, 진짜 괜찮은 걸까 | 헤아림 사주',
  description: '천간합·지지 육합/반합·충·원진·오행 보완으로 계산하는 정통 사주 궁합. 무료이고, 상대방 생일을 몰라도 내 정보만 넣고 링크를 보내면 완성돼요. 진태양시·야자시까지 보정한 만세력 위에서 계산합니다.',
  openGraph: {
    title: '이 사람이랑, 진짜 괜찮은 걸까 💞',
    description: '두 사람의 명식으로 보는 정통 사주 궁합 — 무료로 확인해보세요.',
    // 궁합 전용 카드 — 공유 링크가 이 페이지의 유통 경로 자체라, 브랜드 워드마크 한 장으로는 누를 이유가 없다.
    // (원본 스크립트: `헤아림_OG_궁합.py` — 문구만 고쳐 다시 렌더하면 된다)
    images: [{ url: '/og-gunghap.png', width: 1200, height: 630, alt: '이 사람이랑, 진짜 괜찮은 걸까 — 헤아림 사주 궁합' }],
  },
  twitter: { card: 'summary_large_image', title: '이 사람이랑, 진짜 괜찮은 걸까 💞', images: ['/og-gunghap.png'] },
};

export default function GunghapLayout({ children }: { children: React.ReactNode }) {
  return children;
}

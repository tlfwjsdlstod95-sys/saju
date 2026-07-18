// 일주 사전 목록 — 60갑자 인덱스 (SEO 허브 페이지)
import Link from 'next/link';
import type { Metadata } from 'next';
import { CHEONGAN, CHEONGAN_HANJA, JIJI } from '@/lib/saju/constants';
import { iljuCharacter } from '@/lib/saju/ilju';

export const metadata: Metadata = {
  title: '일주 사전 — 60갑자 일주별 특징 총정리 | 헤아림',
  description: '갑자일주부터 계해일주까지, 60일주 전체의 물상과 성격 특징. 내 일주는 정밀 만세력으로 무료 확인.',
};

export default function IljuIndex() {
  const groups: { gan: number; items: { slug: string; tag: string }[] }[] = [];
  for (let g = 0; g < 10; g++) {
    const items: { slug: string; tag: string }[] = [];
    for (let j = 0; j < 12; j++) {
      if (g % 2 === j % 2) {
        const c = iljuCharacter(g, j);
        items.push({ slug: `${CHEONGAN[g]}${JIJI[j]}`, tag: c.tag });
      }
    }
    groups.push({ gan: g, items });
  }
  return (
    <main className="wrap">
      <div className="hero" style={{ paddingTop: 40 }}>
        <div className="hero-kr">六十日柱</div>
        <h1 style={{ fontSize: 40 }}>일주 사전 <span>— 60갑자</span></h1>
        <p>태어난 날의 기둥, 일주로 보는 나의 결. 60가지 중 당신은 단 하나(약 1.7%)입니다.</p>
      </div>
      {groups.map(({ gan, items }) => (
        <div className="card" key={gan}>
          <h2>{CHEONGAN[gan]}({CHEONGAN_HANJA[gan]}) 일간</h2>
          <div className="chips">
            {items.map((it) => (
              <Link key={it.slug} href={`/iljoo/${it.slug}`} className="chip" style={{ textDecoration: 'none' }}>
                {it.slug}일주 <b style={{ opacity: 0.75 }}>{it.tag}</b>
              </Link>
            ))}
          </div>
        </div>
      ))}
      <div className="card" style={{ textAlign: 'center' }}>
        <p className="meta" style={{ marginBottom: 12 }}>내 일주가 뭔지 모른다면 — 1분이면 나옵니다.</p>
        <Link href="/" className="btn share-btn" style={{ textDecoration: 'none', display: 'inline-block' }}>내 명식 무료 확인 →</Link>
      </div>
    </main>
  );
}

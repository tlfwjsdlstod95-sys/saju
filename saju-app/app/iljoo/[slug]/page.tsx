// 일주 60갑자 SEO 정적 페이지 — "○○일주 특징" 롱테일 검색 유입용 (릴스 대본 = SEO 페이지 원소스 멀티유즈)
import Link from 'next/link';
import type { Metadata } from 'next';
import { CHEONGAN, CHEONGAN_HANJA, JIJI, JIJI_HANJA, JIJI_ANIMAL, GAN_OHAENG, JI_OHAENG } from '@/lib/saju/constants';
import { iljuCharacter } from '@/lib/saju/ilju';

// 60갑자 (천간·지지 음양 일치 조합)
function all60(): { gan: number; ji: number; slug: string }[] {
  const out: { gan: number; ji: number; slug: string }[] = [];
  for (let g = 0; g < 10; g++) for (let j = 0; j < 12; j++) {
    if (g % 2 === j % 2) out.push({ gan: g, ji: j, slug: `${CHEONGAN[g]}${JIJI[j]}` });
  }
  return out;
}

export function generateStaticParams() {
  return all60().map(({ slug }) => ({ slug }));
}

function find(slug: string) {
  return all60().find((x) => x.slug === decodeURIComponent(slug)) ?? null;
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const it = find(params.slug);
  if (!it) return { title: '일주 사전 | 헤아림' };
  const c = iljuCharacter(it.gan, it.ji);
  return {
    title: `${c.name} 특징 — '${c.tag}' | 헤아림`,
    description: `${c.name}(${CHEONGAN_HANJA[it.gan]}${JIJI_HANJA[it.ji]}) 성격과 특징: ${c.trait} 정밀 만세력으로 내 명식을 무료로 확인하세요.`,
  };
}

export default function IljuPage({ params }: { params: { slug: string } }) {
  const it = find(params.slug);
  if (!it) {
    return (
      <main className="wrap"><div className="card"><h2>일주를 찾을 수 없어요</h2><p><Link href="/iljoo">전체 일주 사전으로 →</Link></p></div></main>
    );
  }
  const c = iljuCharacter(it.gan, it.ji);
  const ganO = GAN_OHAENG[it.gan], jiO = JI_OHAENG[it.ji];
  const yang = it.gan % 2 === 0;
  const siblings = all60().filter((x) => x.gan === it.gan && x.ji !== it.ji);

  return (
    <main className="wrap">
      <div className="hero" style={{ paddingTop: 40 }}>
        <div className="hero-kr">{CHEONGAN_HANJA[it.gan]}{JIJI_HANJA[it.ji]}</div>
        <h1 style={{ fontSize: 40 }}>{c.name} — <span>{c.tag}</span></h1>
        <p>60일주 중 하나, 약 1.7%의 구조 · {yang ? '양(陽)' : '음(陰)'} {ganO} 일간 · 지지 {JIJI[it.ji]}({JIJI_ANIMAL[it.ji]}) {jiO}</p>
      </div>

      <div className="card">
        <h2>{c.name}는 어떤 사람인가</h2>
        <p style={{ lineHeight: 1.8 }}>{c.trait}</p>
        <p style={{ lineHeight: 1.8, marginTop: 10, opacity: 0.85 }}>
          일주(日柱)는 태어난 날의 기둥으로, 사주에서 &lsquo;나 자신&rsquo;을 가장 직접적으로 보여주는 자리입니다.
          다만 일주는 시작일 뿐 — 같은 {c.name}라도 태어난 계절(월지)과 시간(시주)에 따라
          격국(타고난 그릇)과 용신(약이 되는 기운)이 완전히 달라집니다.
        </p>
      </div>

      <div className="card" style={{ textAlign: 'center' }}>
        <h2>내가 정말 {c.name}일까?</h2>
        <p className="meta" style={{ marginBottom: 14 }}>
          야자시(23시 출생)·서머타임·출생지 보정을 안 하면 일주 자체가 달라질 수 있어요.
          헤아림은 천문 데이터로 계산하고, 독립 만세력과 1,000건 교차 검증(1000/1000 일치)을 거쳤습니다.
        </p>
        <Link href="/" className="btn share-btn" style={{ textDecoration: 'none', display: 'inline-block' }}>내 명식 무료로 확인하기 →</Link>
      </div>

      <div className="card">
        <h2>같은 {CHEONGAN[it.gan]}({CHEONGAN_HANJA[it.gan]}) 일간의 다른 일주</h2>
        <div className="chips">
          {siblings.map((s) => (
            <Link key={s.slug} href={`/iljoo/${s.slug}`} className="chip" style={{ textDecoration: 'none' }}>
              {s.slug}일주
            </Link>
          ))}
        </div>
        <p style={{ marginTop: 14 }}><Link href="/iljoo" style={{ color: 'var(--gold)' }}>60일주 전체 보기 →</Link></p>
      </div>
    </main>
  );
}

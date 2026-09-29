// 사주 용어 사전 허브 — 결과 화면의 말을 같은 말로 푼다 (2026-09-29)
import Link from 'next/link';
import type { Metadata } from 'next';
import { pageMeta } from '@/lib/pageMeta';
import { DICT } from '@/lib/dict';

export const metadata: Metadata = pageMeta({
  title: '사주 용어 사전 — 시주·진태양시·야자시 | 헤아림',
  description: '사주 결과 화면에 나오는 말을 풀어 둔 사전입니다. 같은 생시인데 앱마다 명식이 달라지는 지점부터 차례로 정리합니다.',
  path: '/dict',
});

export default function DictHub() {
  return (
    <main className="wrap">
      <div className="hero" style={{ paddingTop: 40 }}>
        <div className="hero-kr">辭典</div>
        <h1 style={{ fontSize: 40 }}>사주 용어 <span>사전</span></h1>
        <p>결과 화면에 나오는 말을 같은 말로 풀었습니다. 앱마다 명식이 갈리는 지점부터 정리합니다.</p>
      </div>

      <div className="card">
        <h2>명식이 갈리는 지점</h2>
        <div style={{ display: 'grid', gap: 12 }}>
          {DICT.map((e) => (
            <Link key={e.slug} href={`/dict/${e.slug}`} style={{ textDecoration: 'none', color: 'inherit', display: 'block', padding: '14px 16px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)' }}>
              <div style={{ fontWeight: 700, fontSize: 17 }}>{e.term}{e.hanja ? <span style={{ opacity: 0.55, fontWeight: 400, marginLeft: 6, fontSize: 14 }}>{e.hanja}</span> : null}</div>
              <div className="meta" style={{ marginTop: 4 }}>{e.h1}</div>
            </Link>
          ))}
        </div>
      </div>

      <div className="card">
        <h2>다른 사전</h2>
        <div className="chips">
          <Link href="/iljoo" className="chip" style={{ textDecoration: 'none' }}>60일주 사전</Link>
          <Link href="/sinsal" className="chip" style={{ textDecoration: 'none' }}>12신살 사전</Link>
          <Link href="/accuracy" className="chip" style={{ textDecoration: 'none' }}>검증 방법과 숫자</Link>
        </div>
      </div>

      <div className="card" style={{ textAlign: 'center' }}>
        <h2>내 명식에서 확인하기</h2>
        <p className="meta" style={{ marginBottom: 14 }}>용어보다 빠른 건 내 명식을 직접 보는 거예요. 명식·기본 풀이는 무료입니다.</p>
        <Link href="/" className="btn share-btn" style={{ textDecoration: 'none', display: 'inline-block' }}>내 명식 무료로 확인하기 →</Link>
      </div>
    </main>
  );
}

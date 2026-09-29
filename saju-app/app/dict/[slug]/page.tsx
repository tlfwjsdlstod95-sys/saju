// 사주 용어 한 장 — 정의 → 엔진에서 하는 일 → 흔한 오해 → 학파 갈림 → 입력 폼 (2026-09-29)
import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import { pageMeta } from '@/lib/pageMeta';
import { DICT, DICT_ALIAS, findDict } from '@/lib/dict';

export function generateStaticParams() {
  return DICT.map((e) => ({ slug: e.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const e = findDict(params.slug);
  if (!e) return { title: '사주 용어 사전 | 헤아림' };
  return pageMeta({ title: e.title, description: e.description, path: `/dict/${e.slug}` });
}

const th = { padding: '8px 10px', borderBottom: '1px solid rgba(255,255,255,0.12)', textAlign: 'left' as const, opacity: 0.7, fontWeight: 600 };
const td = { padding: '8px 10px', borderBottom: '1px solid rgba(255,255,255,0.06)', verticalAlign: 'top' as const };

export default function DictPage({ params }: { params: { slug: string } }) {
  const raw = decodeURIComponent(params.slug);
  const alias = DICT_ALIAS[raw];
  if (alias) permanentRedirect(`/dict/${encodeURIComponent(alias)}`);
  const e = findDict(raw);
  if (!e) notFound();

  return (
    <main className="wrap">
      <div className="hero" style={{ paddingTop: 40 }}>
        {e.hanja && <div className="hero-kr">{e.hanja}</div>}
        <h1 style={{ fontSize: 34, lineHeight: 1.35 }}>{e.h1}</h1>
      </div>

      <div className="card">
        <h2>{e.term}{e.hanja ? `(${e.hanja})` : ''}란</h2>
        <p style={{ lineHeight: 1.8 }}>{e.lead}</p>
      </div>

      {e.blocks.map((b) => (
        <div className="card" key={b.h}>
          <h2>{b.h}</h2>
          {b.table && (
            <div style={{ overflowX: 'auto', marginBottom: b.p ? 14 : 0 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14, lineHeight: 1.6 }}>
                <thead><tr>{b.table.head.map((h) => <th key={h} style={th}>{h}</th>)}</tr></thead>
                <tbody>
                  {b.table.rows.map((r) => (
                    <tr key={r[0]}>{r.map((c, i) => <td key={i} style={i === 0 ? { ...td, fontWeight: 600, whiteSpace: 'nowrap' } : td}>{c}</td>)}</tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {b.p?.map((t) => <p key={t} style={{ lineHeight: 1.8, marginTop: 8 }}>{t}</p>)}
          {b.list && (
            <ul style={{ lineHeight: 1.8, paddingLeft: 20, margin: 0 }}>
              {b.list.map((t) => <li key={t} style={{ marginBottom: 6 }}>{t}</li>)}
            </ul>
          )}
        </div>
      ))}

      <div className="card" style={{ textAlign: 'center' }}>
        <h2>내 명식에서 보기</h2>
        <p className="meta" style={{ marginBottom: 14 }}>{e.cta.lead} 명식·경계 진단·기본 풀이는 무료입니다.</p>
        <Link href="/" className="btn share-btn" style={{ textDecoration: 'none', display: 'inline-block' }}>{e.cta.label}</Link>
      </div>

      <div className="card">
        <h2>함께 보기</h2>
        <div className="chips">
          {e.related.map((r) => (
            <Link key={r.href} href={r.href} className="chip" style={{ textDecoration: 'none' }}>{r.label}</Link>
          ))}
        </div>
        <p style={{ marginTop: 14 }}><Link href="/dict" style={{ color: 'var(--gold)' }}>사주 용어 사전 전체 →</Link></p>
      </div>
    </main>
  );
}

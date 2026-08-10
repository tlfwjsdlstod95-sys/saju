// 12신살 개별 SEO 정적 페이지 — "역마살 뜻", "도화살 있는 사주" 등 롱테일 검색 유입용
import Link from 'next/link';
import type { Metadata } from 'next';
import { SIN12_ORDER } from '@/lib/saju/advanced';
import { SIN12_CONTENT, findSin12, sin12ByBase } from '@/lib/saju/sin12Content';

export function generateStaticParams() {
  return SIN12_ORDER.map((name) => ({ slug: name }));
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const name = findSin12(params.slug);
  if (!name) return { title: '12신살 사전 | 헤아림' };
  const c = SIN12_CONTENT[name];
  const aliasPart = c.alias ? `(${c.alias})` : '';
  return {
    title: `${c.name}${aliasPart} 뜻과 특징 — ${c.oneLine.split('—')[0].trim()} | 헤아림`,
    description: `${c.name}(${c.hanja})${aliasPart}의 정확한 뜻: ${c.trait.slice(0, 90)} 내 사주에 걸린 12신살을 정밀 만세력으로 무료 확인.`,
  };
}

const TONE_LABEL = { good: '길한 편', neutral: '중립 — 쓰는 사람에 달림', caution: '주의가 필요한 편' } as const;
const TONE_COLOR = { good: '#4ade80', neutral: '#a3a3a3', caution: '#fbbf24' } as const;

export default function SinsalPage({ params }: { params: { slug: string } }) {
  const name = findSin12(params.slug);
  if (!name) {
    return (
      <main className="wrap">
        <div className="card"><h2>해당 신살을 찾을 수 없어요</h2><p><Link href="/sinsal">12신살 사전 전체 보기 →</Link></p></div>
      </main>
    );
  }
  const c = SIN12_CONTENT[name];
  const idx = SIN12_ORDER.indexOf(name);
  const prev = SIN12_ORDER[(idx + SIN12_ORDER.length - 1) % SIN12_ORDER.length];
  const next = SIN12_ORDER[(idx + 1) % SIN12_ORDER.length];
  const table = sin12ByBase(name);

  return (
    <main className="wrap">
      <div className="hero" style={{ paddingTop: 40 }}>
        <div className="hero-kr">{c.hanja}</div>
        <h1 style={{ fontSize: 40 }}>{c.name} <span>{c.alias ? `= ${c.alias}` : ''}</span></h1>
        <p>{c.oneLine}</p>
      </div>

      <div className="card">
        <div className="chips">
          <div className="chip">12신살 순서 <b>{idx + 1}번째</b></div>
          <div className="chip">성격 <b style={{ color: TONE_COLOR[c.tone] }}>{TONE_LABEL[c.tone]}</b></div>
          {c.alias && <div className="chip">다른 이름 <b>{c.alias}</b></div>}
        </div>
        <h2 style={{ marginTop: 16 }}>{c.name}의 뜻</h2>
        <p style={{ lineHeight: 1.8 }}>{c.meaning}</p>
      </div>

      <div className="card">
        <h2>{c.name}이 있는 사람의 결</h2>
        <p style={{ lineHeight: 1.8 }}>{c.trait}</p>
      </div>

      <div className="card">
        <h2>무기가 되는 지점</h2>
        <p style={{ lineHeight: 1.8 }}>{c.strength}</p>
        <h2 style={{ marginTop: 18 }}>주의할 지점</h2>
        <p style={{ lineHeight: 1.8 }}>{c.caution}</p>
      </div>

      <div className="card">
        <h2>잘 맞는 분야</h2>
        <div className="chips">
          {c.jobs.map((j) => <div className="chip" key={j}>{j}</div>)}
        </div>
        <p style={{ marginTop: 12, fontSize: 13, color: 'var(--text-mute)', lineHeight: 1.7 }}>
          ※ 신살 하나로 직업을 정하지는 않습니다. 격국(타고난 그릇)과 용신(약이 되는 기운)이 방향을 정하고,
          신살은 그 위에 얹히는 색깔에 가깝습니다.
        </p>
      </div>

      <div className="card">
        <h2>{c.name} 운(대운·세운)이 들어올 때</h2>
        <p style={{ lineHeight: 1.8 }}>{c.timing}</p>
      </div>

      <div className="card">
        <h2>흔한 오해 바로잡기</h2>
        <p style={{ lineHeight: 1.8 }}>{c.myth}</p>
      </div>

      <div className="card">
        <h2>내 띠로 보는 {c.name} 자리</h2>
        <p className="meta" style={{ marginBottom: 12 }}>
          12신살은 태어난 해의 띠(년지)를 기준으로 배치합니다. 아래 지지가 내 사주 네 기둥(년·월·일·시지)에 있으면 {c.name}이 걸립니다.
        </p>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ textAlign: 'left', opacity: 0.6 }}>
                <th style={{ padding: '8px 10px', borderBottom: '1px solid rgba(255,255,255,0.12)' }}>내 띠 (년지)</th>
                <th style={{ padding: '8px 10px', borderBottom: '1px solid rgba(255,255,255,0.12)' }}>{c.name} 자리</th>
              </tr>
            </thead>
            <tbody>
              {table.map((r) => (
                <tr key={r.base}>
                  <td style={{ padding: '8px 10px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>{r.animal}띠 · {r.base}</td>
                  <td style={{ padding: '8px 10px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}><b>{r.ji}</b></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card" style={{ textAlign: 'center' }}>
        <h2>내 사주에 {c.name}이 있을까?</h2>
        <p className="meta" style={{ marginBottom: 14 }}>
          띠 기준·일지 기준 두 가지로 계산해서, 네 기둥 중 어디에 걸렸는지까지 보여드려요.
          야자시·서머타임·출생지 보정을 반영한 정밀 만세력 기준입니다.
        </p>
        <Link href="/" className="btn share-btn" style={{ textDecoration: 'none', display: 'inline-block' }}>내 12신살 무료로 확인하기 →</Link>
      </div>

      <div className="card">
        <h2>이어서 보기</h2>
        <div className="chips">
          <Link href={`/sinsal/${prev}`} className="chip" style={{ textDecoration: 'none' }}>← {prev}</Link>
          <Link href={`/sinsal/${next}`} className="chip" style={{ textDecoration: 'none' }}>{next} →</Link>
        </div>
        <div className="chips" style={{ marginTop: 10 }}>
          {SIN12_ORDER.filter((n) => n !== name).map((n) => (
            <Link key={n} href={`/sinsal/${n}`} className="chip" style={{ textDecoration: 'none' }}>{n}</Link>
          ))}
        </div>
        <p style={{ marginTop: 14 }}>
          <Link href="/sinsal" style={{ color: 'var(--gold)' }}>12신살 사전 전체 →</Link>
          {'  '}·{'  '}
          <Link href="/iljoo" style={{ color: 'var(--gold)' }}>60일주 사전 →</Link>
        </p>
      </div>
    </main>
  );
}

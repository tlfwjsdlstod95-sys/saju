// 12신살 사전 허브 — SEO 인덱스 페이지
import Link from 'next/link';
import type { Metadata } from 'next';
import { SIN12_ORDER } from '@/lib/saju/advanced';
import { SIN12_CONTENT } from '@/lib/saju/sin12Content';

export const metadata: Metadata = {
  title: '12신살 사전 — 역마살·도화살·장성살 전체 정리 | 헤아림',
  description: '겁살·재살·천살·지살·연살(도화살)·월살·망신살·장성살·반안살·역마살·육해살·화개살 12신살의 정확한 뜻과 내 사주에 걸린 살을 무료로 확인하세요.',
};

const TONE_LABEL = { good: '길', neutral: '중립', caution: '주의' } as const;
const TONE_COLOR = { good: '#4ade80', neutral: '#a3a3a3', caution: '#fbbf24' } as const;

export default function SinsalIndex() {
  return (
    <main className="wrap">
      <div className="hero" style={{ paddingTop: 40 }}>
        <div className="hero-kr">十二神殺</div>
        <h1 style={{ fontSize: 40 }}>12신살 사전 <span>— 열두 개의 별</span></h1>
        <p>도화살·역마살만 있는 게 아닙니다. 12신살은 태어난 해의 띠(년지)를 기준으로 열두 지지에 순서대로 배치되는 하나의 완결된 체계예요.</p>
      </div>

      <div className="card">
        <h2>12신살이란</h2>
        <p style={{ lineHeight: 1.8 }}>
          12신살(十二神殺)은 삼합(三合)의 무덤 자리 바로 다음 지지에서 <b>겁살</b>이 시작해
          재살 → 천살 → 지살 → 연살 → 월살 → 망신살 → 장성살 → 반안살 → 역마살 → 육해살 → 화개살 순으로
          열두 지지를 한 바퀴 도는 구조입니다. 흔히 따로따로 언급되는 <b>도화살은 연살</b>, <b>수옥살은 재살</b>,
          <b>고초살은 월살</b>과 같은 것으로, 원래는 이 한 체계 안의 이름들이에요.
        </p>
        <p style={{ lineHeight: 1.8, marginTop: 10, opacity: 0.85 }}>
          이름에 살(殺)이 붙어 모두 흉한 것으로 오해받지만, 장성살·반안살처럼 길한 것도 있고
          역마살·연살처럼 시대에 따라 해석이 뒤집힌 것도 있습니다. 살은 &lsquo;흉함&rsquo;이 아니라
          <b> 그 자리의 기운이 세다</b>는 표시로 보는 게 정확합니다.
        </p>
      </div>

      <div className="card">
        <h2>12신살 전체 — 순서대로</h2>
        <div style={{ display: 'grid', gap: 10, marginTop: 8 }}>
          {SIN12_ORDER.map((name, i) => {
            const c = SIN12_CONTENT[name];
            return (
              <Link
                key={name}
                href={`/sinsal/${name}`}
                style={{
                  textDecoration: 'none', color: 'inherit', display: 'block',
                  border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: '14px 16px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ opacity: 0.45, fontSize: 13 }}>{String(i + 1).padStart(2, '0')}</span>
                  <b style={{ fontSize: 17 }}>{c.name}</b>
                  <span style={{ opacity: 0.5, fontSize: 13 }}>{c.hanja}</span>
                  {c.alias && <span style={{ opacity: 0.7, fontSize: 13 }}>= {c.alias}</span>}
                  <span style={{ fontSize: 12, color: TONE_COLOR[c.tone], marginLeft: 'auto' }}>{TONE_LABEL[c.tone]}</span>
                </div>
                <p style={{ margin: '6px 0 0', fontSize: 14, opacity: 0.85, lineHeight: 1.6 }}>{c.oneLine}</p>
              </Link>
            );
          })}
        </div>
      </div>

      <div className="card" style={{ textAlign: 'center' }}>
        <h2>내 사주엔 어떤 살이 걸렸을까</h2>
        <p className="meta" style={{ marginBottom: 14 }}>
          띠만 알면 배치는 정해지지만, 네 기둥 중 어디에 걸렸는지에 따라 의미가 완전히 달라집니다.
          헤아림은 년지·일지 두 기준으로 모두 계산해서 보여줍니다.
        </p>
        <Link href="/" className="btn share-btn" style={{ textDecoration: 'none', display: 'inline-block' }}>내 12신살 무료로 확인하기 →</Link>
      </div>

      <div className="card">
        <p className="meta">
          더 보기: <Link href="/iljoo" style={{ color: 'var(--gold)' }}>60일주 사전 →</Link>
          {'  '}·{'  '}
          <Link href="/gunghap" style={{ color: 'var(--gold)' }}>사주 궁합 보기 →</Link>
        </p>
      </div>
    </main>
  );
}

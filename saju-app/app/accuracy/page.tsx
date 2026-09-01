// 정확도·검증 페이지 — 헤아림이 명식을 어떻게 검증하는지 숫자 그대로 공개
import Link from 'next/link';
import type { Metadata } from 'next';
import { ENGINE_VERSION } from '@/lib/saju/version';

export const metadata: Metadata = {
  title: '정확도·검증 — 헤아림 만세력은 이렇게 검증합니다 | 헤아림',
  description:
    'NASA JPL 행성력 대비 절기 오차 평균 6.8초, 1900~2100년 71,733일 만세력 교차검증 100% 일치. 헤아림이 명식 계산을 검증하는 방법과 결과를 숫자 그대로 공개합니다.',
};

const stat = { border: '1px solid rgba(230,200,120,0.25)', borderRadius: 14, padding: '18px 16px', textAlign: 'center' as const, background: 'rgba(230,200,120,0.04)' };
const statNum = { fontSize: 'clamp(22px, 4.5vw, 30px)', fontWeight: 800 as const, color: 'var(--gold)', fontFamily: 'var(--serif)', lineHeight: 1.2 };
const statLabel = { fontSize: 13, opacity: 0.75, marginTop: 6, lineHeight: 1.5 };
const row = { display: 'flex', gap: 10, alignItems: 'baseline', flexWrap: 'wrap' as const };
const num = { color: 'var(--gold)', fontWeight: 700 as const };

export default function AccuracyPage() {
  return (
    <main className="wrap">
      <div className="hero" style={{ paddingTop: 40 }}>
        <div className="hero-kr">檢證</div>
        <h1 style={{ fontSize: 'clamp(26px, 5.5vw, 40px)' }}>틀린 사주로 인생을 정할 순 없으니까, <span>이렇게 검증합니다</span></h1>
        <p>
          같은 생년월일을 넣어도 앱마다 명식이 다릅니다. 절기 경계 몇 분, 자시 처리 방식 하나로
          월주·일주가 통째로 바뀌기 때문입니다. 헤아림은 &ldquo;믿어 달라&rdquo;고 말하는 대신 —
          측정하고, 그 숫자를 그대로 공개합니다.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 26 }}>
        <div style={stat}>
          <div style={statNum}>평균 6.8초</div>
          <div style={statLabel}>절기 시각 오차<br />(NASA JPL 행성력 대비, 1900~2100)</div>
        </div>
        <div style={stat}>
          <div style={statNum}>71,733일 100%</div>
          <div style={statLabel}>만세력 교차검증 일치<br />(1900~2100 전 일자, 독립 구현 대조)</div>
        </div>
        <div style={stat}>
          <div style={statNum}>고전 59命 대조</div>
          <div style={statLabel}>『자평진전』·『적천수천미』 원전 명식으로<br />판정 로직을 채점·공개</div>
        </div>
      </div>

      <div className="card">
        <h2>1. 만세력(천문 계산) — 3중으로 검증합니다</h2>
        <p style={{ lineHeight: 1.8 }}>
          사주의 출발점은 명식(팔자) 계산입니다. 여기가 틀리면 그 위의 모든 해석이 무의미해서,
          헤아림은 이 층을 세 방향에서 검증합니다.
        </p>
        <div style={{ display: 'grid', gap: 14, marginTop: 14 }}>
          <div style={{ borderLeft: '3px solid var(--gold)', paddingLeft: 14 }}>
            <div style={row}><b>① 절대 정확도 — 천문학계 표준과 직접 비교</b></div>
            <p style={{ margin: '6px 0 0', fontSize: 14.5, lineHeight: 1.8, opacity: 0.9 }}>
              절기 시각을 NASA JPL의 행성력(DE440)으로 계산한 값과 대조했습니다.
              1900~2100년 24절기 <b style={num}>4,824개 전부</b>, 오차 <b style={num}>평균 6.8초 · 최대 29.4초</b>.
              절기 경계가 몇 분만 어긋나도 그 근처 출생자의 월주가 통째로 바뀌는데, 이 오차 수준이면
              월주가 잘못 계산될 확률은 <b style={num}>약 38만 분의 1</b>입니다.
              한국천문연구원(KASI) 공표 절기 시각과도 ±1분 이내로 일치합니다.
            </p>
          </div>
          <div style={{ borderLeft: '3px solid var(--gold)', paddingLeft: 14 }}>
            <div style={row}><b>② 교차 검증 — 독립 구현과 전 일자 대조</b></div>
            <p style={{ margin: '6px 0 0', fontSize: 14.5, lineHeight: 1.8, opacity: 0.9 }}>
              1900~2100년의 <b style={num}>71,733일 전부</b>에 대해 년주·월주·일주를 널리 쓰이는
              공개 만세력 구현체와 대조해 <b style={num}>100% 일치</b>를 확인했습니다.
              표본 추출이 아니라 두 세기 전체입니다.
            </p>
          </div>
          <div style={{ borderLeft: '3px solid var(--gold)', paddingLeft: 14 }}>
            <div style={row}><b>③ 불변식 테스트 — 내부 논리 일관성</b></div>
            <p style={{ margin: '6px 0 0', fontSize: 14.5, lineHeight: 1.8, opacity: 0.9 }}>
              &ldquo;일주는 60일마다 정확히 순환한다&rdquo; &ldquo;입춘 직전·직후의 년주가 올바르게 갈린다&rdquo; 같은
              명리학의 기본 규칙 <b style={num}>26가지</b>를 자동 테스트로 만들어, 엔진을 고칠 때마다
              수천 개의 무작위 명식으로 전부 통과하는지 확인합니다.
            </p>
          </div>
        </div>
      </div>

      <div className="card">
        <h2>2. 대부분의 앱이 생략하는 보정, 전부 계산합니다</h2>
        <p style={{ lineHeight: 1.8 }}>
          시계가 가리키는 시각과 태양의 실제 위치는 다릅니다. 이 차이를 무시하면 시주는 물론,
          자정·절기 부근에서는 일주와 월주까지 틀립니다.
        </p>
        <ul style={{ margin: '10px 0 0', paddingLeft: 20, fontSize: 14.5, lineHeight: 2, opacity: 0.9 }}>
          <li><b>진태양시 보정</b> — 출생지 경도에 따른 시차를 분 단위로 계산 (서울과 강릉은 약 4분 다릅니다)</li>
          <li><b>균시차 보정</b> — 계절에 따라 최대 ±16분 벌어지는 시계시와 태양시의 차이</li>
          <li><b>서머타임 반영</b> — 1948~1960년, 1987~1988년 시행된 서머타임 기간 출생 자동 보정</li>
          <li><b>표준자오선 이력</b> — 동경 127.5도(1908~1912, 1954~1961) 시기까지 반영</li>
          <li><b>야자시·조자시</b> — 밤 11시대 출생의 일주 처리, 학파 선택 가능 (기본: 야자시 인정)</li>
        </ul>
      </div>

      <div className="card">
        <h2>3. 해석(명리 판정) — 고전 원전으로 채점하고, 결과를 그대로 공개합니다</h2>
        <p style={{ lineHeight: 1.8 }}>
          계산과 달리 해석에는 &lsquo;하나의 정답&rsquo;이 없습니다. 학파마다 강약·용신을 다르게 봅니다.
          그래서 헤아림은 명리학의 고전 — <b>『자평진전(子平眞詮)』</b>과 <b>『적천수천미(滴天髓闡微)』</b>
          1947년 간행본 원문 — 에 실린 실제 명식 <b style={num}>59건</b>으로 판정 로직을 채점하고,
          일치율을 숨기지 않고 공개합니다.
        </p>
        <div style={{ overflowX: 'auto', marginTop: 12 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.15)', textAlign: 'left' }}>
                <th style={{ padding: '8px 10px' }}>판정 항목</th>
                <th style={{ padding: '8px 10px' }}>고전 원전 일치율</th>
                <th style={{ padding: '8px 10px' }}>비고</th>
              </tr>
            </thead>
            <tbody style={{ opacity: 0.9 }}>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                <td style={{ padding: '8px 10px' }}>격국(格局)</td>
                <td style={{ padding: '8px 10px' }}><b style={num}>100%</b> (25/25)</td>
                <td style={{ padding: '8px 10px', fontSize: 13 }}>자평진전 원문 명식 기준</td>
              </tr>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                <td style={{ padding: '8px 10px' }}>신강·신약</td>
                <td style={{ padding: '8px 10px' }}><b style={num}>88%</b> (22/25)</td>
                <td style={{ padding: '8px 10px', fontSize: 13 }}>적천수천미 「旺衰」편 기준</td>
              </tr>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                <td style={{ padding: '8px 10px' }}>용신(用神)</td>
                <td style={{ padding: '8px 10px' }}><b style={num}>67%</b> (12/18)</td>
                <td style={{ padding: '8px 10px', fontSize: 13 }}>개선 중 — 직전 버전 50%에서 상향</td>
              </tr>
              <tr>
                <td style={{ padding: '8px 10px' }}>조후(調候)</td>
                <td style={{ padding: '8px 10px' }}><b style={num}>100%</b> (2/2)</td>
                <td style={{ padding: '8px 10px', fontSize: 13 }}>표본 확충 중</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p style={{ lineHeight: 1.8, marginTop: 12, fontSize: 14, opacity: 0.8 }}>
          100%가 아닌 숫자를 그대로 적는 이유 — 해석 영역에서 &ldquo;다 맞힌다&rdquo;는 말은 검증을 안 했다는
          뜻이기 쉽습니다. 헤아림은 어긋난 케이스를 하나씩 문헌과 대조해 엔진을 고치고, 고칠 때마다
          이 숫자를 갱신합니다. 위 일치율은 판정 엔진 v{ENGINE_VERSION} 기준입니다.
        </p>
      </div>

      <div className="card">
        <h2>4. 판정 엔진 버전을 남깁니다</h2>
        <p style={{ lineHeight: 1.8 }}>
          해석 로직을 고치면 같은 사주의 풀이가 달라질 수 있습니다. 헤아림은 판정 엔진에
          버전 번호를 붙여 모든 리포트에 어떤 기준으로 쓰였는지 기록합니다. 현재 <b style={num}>v{ENGINE_VERSION}</b>.
        </p>
        <ul style={{ margin: '10px 0 0', paddingLeft: 20, fontSize: 14, lineHeight: 1.9, opacity: 0.85 }}>
          <li><b>v2</b> — 조후용신 자격 규칙: 원국에 뿌리 없는 조후는 억부로 전환</li>
          <li><b>v3</b> — 격국 취용을 자평진전 원칙(월지 본기 우선)대로 교정 → 격국 일치율 80%→100%</li>
          <li><b>v4</b> — 억부용신 중화 구간을 적천수천미 원전 집계에 맞춰 교정 → 용신 일치율 50%→67%</li>
          <li><b>v5</b> — 신살 길흉반전: 같은 살도 용신 글자에 앉으면 길하게, 기신 글자면 흉하게 — 사주마다 다르게 판정</li>
        </ul>
      </div>

      <div className="card">
        <h2>5. AI는 문장만 씁니다</h2>
        <p style={{ lineHeight: 1.8 }}>
          헤아림의 AI 풀이에서 명식·강약·용신·신살 판정은 전부 위의 결정론 엔진이 계산한 사실이고,
          AI는 그 사실을 읽기 쉬운 문장으로 풀어내는 역할만 합니다. AI가 팔자를 &lsquo;추측&rsquo;하는 일은
          구조적으로 불가능하게 설계했습니다.
        </p>
      </div>

      <div style={{ textAlign: 'center', margin: '30px 0 10px' }}>
        <Link href="/" className="btn" style={{ display: 'inline-block', textDecoration: 'none' }}>
          이 엔진으로 내 사주 보기 →
        </Link>
      </div>

      <div className="foot">
        ※ 절기·만세력 검증 수치는 자동 테스트로 측정한 값이며, 엔진이 바뀔 때마다 재측정합니다.<br />
        경계 시각(절기 전후·자정 무렵) 출생은 한국천문연구원(KASI) 교차 확인을 권장합니다.
      </div>
    </main>
  );
}

// 정확도·검증 페이지 — 헤아림이 명식을 어떻게 검증하는지 숫자 그대로 공개
import Link from 'next/link';
import type { Metadata } from 'next';
import { ENGINE_VERSION } from '@/lib/saju/version';
import { yongsinRows, rate, newSampleRows, unseenRows, totalCases } from '@/lib/goldenReport';

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
  const nCases = totalCases();
  const rPrev = '75.0';  // v9 재현율 — 변경 폭을 그대로 보여주기 위한 고정값
  // 표는 손으로 쓰지 않는다 — 지금 배포된 엔진으로 원전 명식을 다시 판정해 만든다.
  const rows = yongsinRows();
  const r = rate(rows);
  // 엔진을 맞출 때 쓴 표본과, 그 뒤 원전에서 새로 캔 표본을 나눠 본다.
  const rNew = rate(newSampleRows(rows));
  const rUnseen = rate(unseenRows(rows));
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
          <div style={statNum}>고전 {nCases}命 대조</div>
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
          1947년 간행본 원문 — 에 실린 실제 명식 <b style={num}>{nCases}건</b>으로 판정 로직을 채점하고,
          일치율을 숨기지 않고 공개합니다.
        </p>
        <div style={{ overflowX: 'auto', marginTop: 12 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.15)', textAlign: 'left' }}>
                <th style={{ padding: '8px 10px' }}>판정 항목</th>
                <th style={{ padding: '8px 10px' }}>고전 원전 재현율 (적중/표본)</th>
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
                <td style={{ padding: '8px 10px' }}><b style={num}>{r.pct}%</b> ({r.hit}/{r.total})</td>
                <td style={{ padding: '8px 10px', fontSize: 13 }}>적천수천미 계열 · 아래 케이스별 전체 공개</td>
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
          이 숫자를 갱신합니다. 위 수치는 판정 엔진 v{ENGINE_VERSION} 기준입니다.
        </p>
        <p style={{ lineHeight: 1.8, marginTop: 10, fontSize: 13.5, color: 'var(--text-mute)' }}>
          ⚠️ 이 숫자는 <b>&lsquo;원전 재현율&rsquo;</b>입니다 — 고전에 실린 <b>{r.total}건</b>의 명식에서 원문이
          지목한 용신을 엔진이 다시 짚어내는 비율이고, 세상 모든 사주에 대한 &lsquo;정확도&rsquo;가 아닙니다.
          표본이 작다는 점을 그대로 밝히고, 표본은 계속 늘리는 중입니다.
          {rNew.total > 0 && (
            <> 그중 <b>엔진을 고친 뒤에 원전에서 새로 캔 {rNew.total}건</b>만 따로 보면{' '}
            <b>{rNew.pct}%</b>({rNew.hit}/{rNew.total})입니다 — 규칙을 맞출 때 쓰지 않은 명식이라,
            이 숫자가 실제 성능에 더 가깝습니다. 낮아 보여도 이렇게 나눠 적는 편이 정직합니다.</>
          )}
        </p>
        {rUnseen.total > 0 && (
          <p style={{ lineHeight: 1.8, marginTop: 10, fontSize: 13.5, color: 'var(--text-mute)' }}>
            더 엄격하게, <b>지금 엔진(v{ENGINE_VERSION})을 확정한 뒤에 원전에서 캔 {rUnseen.total}건</b>만 보면{' '}
            <b>{rUnseen.pct}%</b>({rUnseen.hit}/{rUnseen.total})입니다. 규칙을 만들 때 이 명식들은 존재하지도 않았으니,
            어떤 규칙도 이 케이스를 본 적이 없다는 뜻입니다. <b>{rUnseen.total}건뿐이라 비율로 읽을 숫자는 아니지만</b>,
            다음에 손댈 곳이 어디인지 알려주는 값이라 그대로 적습니다.
          </p>
        )}
        <p style={{ lineHeight: 1.8, marginTop: 10, fontSize: 13.5, color: 'var(--text-mute)' }}>
          같은 사주가 논문과 원전에 각각 실려 있는 경우가 있어, <b>중복 명식은 한 번만 셉니다.</b>{' '}
          세 쌍을 찾아 채점에서 뺐고, 그만큼 재현율이 내려갔습니다(용신 74.2%→{r.pct}%).
          숫자가 내려가는 쪽이라도 같은 사주를 두 번 세지 않는 편이 맞습니다.
        </p>
      </div>

      <div className="card">
        <h2>3-B. 용신 {r.total}건, 케이스마다 전부 공개합니다</h2>
        <p style={{ lineHeight: 1.8 }}>
          위 재현율의 근거 전체입니다. 맞은 것도 틀린 것도 숨기지 않고, <b>어느 책 어느 편 몇 쪽</b>의
          명식인지까지 적습니다. 이 표는 손으로 쓴 게 아니라 <b>지금 배포된 엔진이 원전 명식을 다시 판정해</b>
          만든 것이라, 엔진이 바뀌면 이 표도 함께 바뀝니다.
        </p>
        <div className="acc-gist">
          <span>고전 명식 <b>{r.total}건</b></span>
          <span>엔진이 같은 답 <b>{r.hit}건</b></span>
          <span>다른 답 <b>{r.total - r.hit}건</b></span>
          <span>재현율 <b>{r.pct}%</b></span>
        </div>
        <div className="acc-plain">
          <b>쉽게 말하면</b> — 100년 전 명리학 고전에는 실제 사주와, 그 사주를 저자가 어떻게 풀었는지가
          함께 실려 있습니다. 그 <b>{r.total}건</b>을 헤아림 엔진에 그대로 넣어 보고,
          저자와 같은 결론이 나오는지 한 건씩 대조한 결과가 아래 표입니다.
          <br />
          <span style={{ opacity: 0.85 }}>
            ※ <b>용신(用神)</b>은 그 사주에 가장 필요한 기운 한 가지를 말합니다.
            운의 좋고 나쁨을 읽는 기준점이라, 여기가 어긋나면 풀이 전체가 어긋납니다.
          </span>
        </div>
        <details className="acc-fold">
          <summary>케이스 {r.total}건 전부 펼쳐 보기</summary>
          <div className="acc-fold-body">
        <div style={{ overflowX: 'auto', marginTop: 14 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5, minWidth: 600 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.15)', textAlign: 'left', whiteSpace: 'nowrap' }}>
                <th style={{ padding: '8px 10px' }}>케이스</th>
                <th style={{ padding: '8px 10px' }}>출전(판본 · 편 · 쪽)</th>
                <th style={{ padding: '8px 6px' }}>원전 결론</th>
                <th style={{ padding: '8px 6px' }}>엔진 결론</th>
                <th style={{ padding: '8px 6px' }}>판정 방법</th>
                <th style={{ padding: '8px 6px' }}>일치</th>
                <th style={{ padding: '8px 6px' }}>버전</th>
              </tr>
            </thead>
            <tbody style={{ opacity: 0.9 }}>
              {rows.map((row) => (
                <tr key={row.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                  <td style={{ padding: '8px 10px', whiteSpace: 'nowrap' }}>{row.id}</td>
                  <td style={{ padding: '8px 10px', fontSize: 12.5, lineHeight: 1.5 }}>
                    {row.book}<br />
                    <span style={{ opacity: 0.7 }}>{row.chapter} · {row.page}</span>
                  </td>
                  <td style={{ padding: '8px 6px' }}>{row.expected}</td>
                  <td style={{ padding: '8px 6px', color: row.match ? undefined : 'var(--mystic)' }}>{row.got}</td>
                  <td style={{ padding: '8px 6px', fontSize: 12.5 }}>{row.method}</td>
                  <td style={{ padding: '8px 6px', color: row.match ? 'var(--gold)' : 'var(--mystic)', whiteSpace: 'nowrap' }}>
                    {row.match ? '일치' : '불일치'}
                  </td>
                  <td style={{ padding: '8px 6px', fontSize: 12.5, opacity: 0.7, whiteSpace: 'nowrap' }}>v{row.engine}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p style={{ lineHeight: 1.8, marginTop: 12, fontSize: 13.5, color: 'var(--text-mute)' }}>
          불일치가 남아 있는 케이스는 &lsquo;아직 못 고친 것&rsquo;이 맞습니다. 다만 한 건을 맞히려고 그 한 건에만
          맞는 규칙을 넣지는 않습니다 — 같은 조건의 원전 사례가 여러 건 모여 규칙으로 확인될 때 반영합니다.
          (직전에 보류해 두었던 <b>종격(從格) 문턱</b> 가설은 원전에서 근거 3건이 모여 v10에 반영했습니다.
          지금 보류 중인 것: 원문이 &lsquo;작용하지 않는다&rsquo;고 못 박은 지지 속 기운을 세지 않는 기준.)
        </p>
          </div>
        </details>
      </div>

      <div className="card">
        <h2>4. 판정 엔진 버전을 남깁니다</h2>
        <p style={{ lineHeight: 1.8 }}>
          해석 로직을 고치면 같은 사주의 풀이가 달라질 수 있습니다. 헤아림은 판정 엔진에
          버전 번호를 붙여 모든 리포트에 어떤 기준으로 쓰였는지 기록합니다. 현재 <b style={num}>v{ENGINE_VERSION}</b>.
        </p>
        <div className="acc-plain">
          <b>쉽게 말하면</b> — 판정 규칙을 고칠 때마다 번호를 하나씩 올립니다.
          예전에 받은 리포트에는 그때의 번호가 찍혀 있어서, <b>어떤 기준으로 쓰인 풀이인지</b> 나중에도 알 수 있고
          기준이 바뀌면 &lsquo;리포트함&rsquo;에 표시가 뜹니다. 아래는 지금까지 무엇을 왜 고쳤는지의 전체 기록입니다 —
          <b>읽지 않으셔도 됩니다.</b> 고친 내역을 감추지 않는다는 것 자체가 요점입니다.
        </div>
        <details className="acc-fold">
          <summary>고친 내역 전체 보기 (v2 ~ v{ENGINE_VERSION})</summary>
          <div className="acc-fold-body">
        <ul style={{ margin: '10px 0 0', paddingLeft: 20, fontSize: 14, lineHeight: 1.9, opacity: 0.85 }}>
          <li><b>v2</b> — 조후용신 자격 규칙: 원국에 뿌리 없는 조후는 억부로 전환</li>
          <li><b>v3</b> — 격국 취용을 자평진전 원칙(월지 본기 우선)대로 교정 → 격국 일치율 80%→100%</li>
          <li><b>v4</b> — 억부용신 중화 구간을 적천수천미 원전 집계에 맞춰 교정 → 용신 일치율 50%→67%</li>
          <li><b>v5</b> — 신살 길흉반전: 같은 살도 용신 글자에 앉으면 길하게, 기신 글자면 흉하게 — 사주마다 다르게 판정</li>
          <li><b>v6</b> — 용신을 &lsquo;후보 평가&rsquo;로: 원국에 실제로 쓸 수 있는 기운인지(뿌리·투출·합·극) 따져
            하나씩 지워 나가는 방식으로 교체 → 규칙을 맞출 때 쓴 18건에서 67%→94.4%.
            그 뒤 원전에서 표본을 계속 캐 44건까지 늘리자 63.6%로 내려갔습니다 —
            표본이 늘어 어려워졌다는 뜻이라, 올라간 숫자만 남기지 않고 그대로 적습니다.</li>
          <li><b>v7</b> — 상관격을 한 갈래가 아니라 다섯 갈래(用財·用印·用刦·用傷官·用官)로 봅니다.
            『적천수천미』 상관편에 임철초가 직접 적어 둔 판정 조건을 그대로 옮겼습니다.
            같은 판본 종상(從象)편에 실린 종격 기준도 함께 옮겼습니다 — 종왕격이라도 인성이 가벼우면
            흘려보내는 쪽을 쓰고, 판이 한 기세로 굳으면 종기격(從氣格)으로 봅니다.
            조후 &lsquo;자격&rsquo;의 뿌리 정의도 좁혔습니다(지장간에만 숨은 기운은 천간에 드러났을 때만 인정)
            → 용신 원전 재현율 63.6%→81.8%</li>
          <li><b>v8</b> — 관살(官殺)을 여섯 갈래로 봅니다(財滋弱殺·殺重用印·食神制殺·合官留殺·官殺混雜·制殺太過).
            핵심은 <b>일간의 강약과 관살의 압력을 따로 본다</b>는 것 — 몸이 중화라도 관살이 거세면
            바로 인성·식상을 방어 카드로 엽니다. 원전이 「眾殺橫行, 一仁可化」라 한 자리입니다.
            여섯 갈래를 <b>하나씩 켜 가며 따로 측정</b>했고, 근거는 있지만 우리 표본에서 손해가 난
            한 갈래(制殺太過)는 <b>켜지 않았습니다</b>
            → 용신 원전 재현율 72.7%</li>
          <li><b>v8.1</b> — 통관(通關)을 계산은 하되 <b>채택 순위에서 뒤로</b> 옮겼습니다.
            저희 채점 기준인 『적천수천미』는 통관을 &lsquo;다리 오행을 용신으로 삼는 법&rsquo;이 아니라
            &lsquo;기운이 막히지 않고 흐르는가&rsquo;라는 <b>상태 평가</b>로 씁니다(卷二 通神論 通關).
            실제로 통관으로 결정됐던 원전 케이스 3건이 모두 어긋나 있었습니다
            → 용신 원전 재현율 74.2%, 그중 신규 표본은 66.7%</li>
          <li><b>v8.2</b> — <b>판정은 그대로이고, 채점을 고쳤습니다.</b> 같은 사주가 논문 재인용과
            원전 판본에 각각 실려 있는 경우를 세 쌍 찾아 <b>한 번만 세도록</b> 했습니다.
            둘 다 채점하면 그 한 사주의 정오답이 재현율에 두 번 반영됩니다.
            케이스는 표에 남겨 둡니다 — 논문과 원전이 같은 판정을 내렸다는 교차검증이기 때문입니다
            → 용신 원전 재현율 74.2%→{r.pct}%, 적천수 강약 88.0%→87.5%.
            <b>숫자가 내려가는 쪽이지만 이게 맞습니다.</b></li>
          <li><b>v9</b> — 식상(食傷)이 판을 덮어 <b>기운이 새어 나가 몸이 무너지는</b> 경우에도
            인성(印)을 방어 카드로 엽니다. v8에서 관살이 거셀 때 하던 것과 같은 처리를,
            &lsquo;극(剋)&rsquo;이 아니라 &lsquo;설(洩)&rsquo;로 무너지는 자리에도 적용한 것입니다 —
            원전이 「傷官太旺, 過於洩氣, 用神在土」라 한 자리입니다. 근거 명식 3건에서 결론이 모두 인성이었고,
            그중 <b>중화 구간</b>의 1건만 못 맞히고 있었습니다(억부가 중화·신강에서 인성 후보를 만들지 않아서)
            → 용신 원전 재현율 {r.pct}%, 그중 신규 표본은 {rNew.pct}%.
            무작위 2만 건에서 이 규칙이 켜지는 비율은 5.4%로, 기본값이 아니라 예외입니다.</li>
          <li><b>v10</b> — <b>&lsquo;대세를 따르는 사주(종격)&rsquo;로 보지 <u>않는</u> 조건</b>을 원전에서 옮겼습니다.
            일간이 아무 데도 기댈 곳이 없을 때만 대세를 따르는 건데, 저희 엔진은 지지 속에 희미하게 남은
            뿌리를 못 보고 너무 쉽게 &lsquo;따른다&rsquo;고 판정하고 있었습니다.
            원전은 세 자리에서 <b>따르지 않는 이유를 직접</b> 밝힙니다 — 「通根身庫」·「火有餘氣」.
            무엇이 그 셋을 가르는지는 지지 속 기운의 <b>깊이</b>가 정해 줬습니다
            → 용신 원전 재현율 {rPrev}%→{r.pct}%, <b>가장 엄격한 &lsquo;미확인 세트&rsquo;는 59.1%→{rUnseen.pct}%</b>.
            강약 판정은 한 자리도 건드리지 않았습니다.</li>
        </ul>
          </div>
        </details>
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

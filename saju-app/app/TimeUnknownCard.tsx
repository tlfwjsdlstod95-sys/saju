'use client';
// 시각 미상 분기 화면 (§E-4 ③) — 「확정된 것 / 시각을 알아야 정해지는 것」을 나눠 보여준다.
// 계산은 전부 lib/saju/timeUnknown.ts(서버에서 그날 하루 시계 시각을 훑은 결과). 이 파일은 그리기만 한다.
//
// 가독성 규칙(결과 화면 공통):
//   · 문장 하나는 두 줄 안 · 한 덩어리에 요소 3개 이하 · 요약은 늘 보이고 긴 표는 접는다
//   · 여백 크게, 대비 강하게 · 한자는 괄호 속 보조로만
//   · 시각 후보에 순위·확률을 붙이지 않는다(우리는 모른다) — 구간 길이만 사실로
import type { TimeUnknownScan, TimeSpan } from '@/lib/saju/timeUnknown';

const kor = (v: string) => v.replace(/\(.*\)/, '');          // 「신미(辛未)」 → 「신미」
const han = (v: string) => (v.match(/\((.*)\)/)?.[1] ?? '');

function Gz({ v }: { v: string }) {
  return <b className="tu-gz">{kor(v)}<small>{han(v)}</small></b>;
}

/** 「00:00~00:20」 — 자정을 넘기지 않는 구간 */
const range = (s: TimeSpan) => `${s.from}~${s.to}`;

export default function TimeUnknownCard({ scan, onEnterTime }: { scan: TimeUnknownScan; onEnterTime: () => void }) {
  const sure = scan.pillars.filter((p) => p.status !== 'split');
  const split = scan.pillars.filter((p) => p.status === 'split');
  const mostly = scan.pillars.filter((p) => p.status === 'mostly');
  const ageVaries = scan.startAge.min !== scan.startAge.max;
  const strVaries = scan.strength.length > 1;

  return (
    <div className="card tu-card" id="time-unknown">
      <h2>시각 없이 알 수 있는 것</h2>
      <p className="tu-lead">태어난 시각을 모르셔서, 그날 하루 <b>00:00부터 23:59까지</b> 전부 계산해 봤어요.</p>

      {/* ── 확정 ── */}
      {sure.length > 0 && (
        <section className="tu-block tu-sure">
          <h3>✓ 확정 <span>몇 시에 태어났든 같아요</span></h3>
          <div className="tu-row">
            {sure.map((p) => (
              <div className="tu-cell" key={p.pillar}>
                <em>{p.pillar}{p.status === 'mostly' && <sup>*</sup>}</em>
                <Gz v={p.main!} />
              </div>
            ))}
          </div>
          {mostly.map((p) => {
            const ex = p.spans.filter((s) => s.value !== p.main);
            return (
              <p className="tu-foot" key={p.pillar}>
                * {p.pillar}: {ex.map((s, i) => <span key={i}>{i > 0 && ', '}<b>{range(s)}</b> 출생이면 {kor(s.value)}</span>)}
                {' '}— {p.pillar === '일주' ? '진태양시로 날짜가 넘어가는 경계라서예요.' : '절기가 그 시각에 바뀌어서예요.'}
              </p>
            );
          })}
        </section>
      )}

      {/* ── 시각을 알아야 정해지는 것 ── */}
      <section className="tu-block tu-open">
        <h3>? 시각을 알아야 정해져요</h3>
        <ul className="tu-list">
          <li><b>시주</b> — 약 2시간마다 바뀌어요. 아래 「시각별 시주」에서 전부 볼 수 있어요.</li>
          {split.map((p) => (
            <li key={p.pillar}>
              <b>{p.pillar}</b> — 그날 절기가 바뀌어서, 태어난 시각에 따라 둘 중 하나예요.
              <div className="tu-split">
                {p.spans.map((s, i) => (
                  <div key={i}><span>{range(s)}</span><Gz v={s.value} /></div>
                ))}
              </div>
            </li>
          ))}
          {ageVaries && <li><b>대운 시작 나이</b> — {scan.startAge.min}~{scan.startAge.max}세 사이예요.</li>}
          {strVaries && <li><b>일간 강약</b> — 시주에 따라 {scan.strength[0]}~{scan.strength[scan.strength.length - 1]} 사이에서 달라져요.</li>}
        </ul>
        {split.length > 0 && (
          <p className="tu-warn">위 명식표의 {split.map((p) => p.pillar).join('·')}는 <b>정오(12시) 기준</b> 값이에요. 시각을 넣으면 바로잡혀요.</p>
        )}
      </section>

      {/* ── 다음 행동 ── */}
      <div className="tu-cta">
        <button type="button" className="btn tu-btn" onClick={onEnterTime}>태어난 시각 넣고 다시 보기</button>
        <p>산모수첩 · 출생 병원 기록 · 가족의 기억에서 찾을 수 있어요. <b>대략(○시쯤)</b>만 알아도 후보가 확 줄어요.</p>
      </div>

      {/* ── 긴 표는 접는다 ── */}
      <details className="tu-fold">
        <summary>시각별 시주 전부 보기 ({scan.hour.length}구간)</summary>
        <div className="tu-table">
          {scan.hour.map((h, i) => (
            <div key={i}><span>{range(h)}</span><Gz v={h.value} /></div>
          ))}
        </div>
        <p className="tu-foot">시계 시각 기준이에요. 출생지 경도·균시차·서머타임을 반영해 경계가 정각에서 조금씩 밀려 있어요.</p>
      </details>
    </div>
  );
}

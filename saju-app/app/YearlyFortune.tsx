'use client';

import { useMemo, useState } from 'react';
import type { SajuResult } from '@/lib/saju/types';
import { computeYearlyFortune } from '@/lib/saju/yearly';

const GRADE_COLOR: Record<string, string> = {
  대길: '#22c55e', 길: '#86c33a', 평: '#eab308', 주의: '#ef8a4d',
};

export default function YearlyFortune({
  result, premium, onLocked, reqBody,
}: {
  result: SajuResult; premium: boolean; onLocked: () => void; reqBody: () => any;
}) {
  const thisYear = new Date().getFullYear();
  const [year, setYear] = useState(thisYear);
  const y = useMemo(() => computeYearlyFortune(result, year), [result, year]);
  const name = result.input.name;

  // 연도별 AI 총평 캐시
  const [comments, setComments] = useState<Record<number, string>>({});
  const [streaming, setStreaming] = useState(false);
  const [aiErr, setAiErr] = useState('');

  async function askAI() {
    if (streaming) return;
    setAiErr('');
    setStreaming(true);
    setComments((c) => ({ ...c, [year]: '' }));
    try {
      const res = await fetch('/api/yearly-reading', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...reqBody(), targetYear: year }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error ?? 'AI 총평 오류');
      }
      if (!res.body) throw new Error('스트림을 받지 못했어요.');
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let acc = '';
      const yr = year;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += dec.decode(value, { stream: true });
        setComments((c) => ({ ...c, [yr]: acc }));
      }
    } catch (e: any) {
      setAiErr(e.message);
      setComments((c) => { const n = { ...c }; delete n[year]; return n; });
    } finally {
      setStreaming(false);
    }
  }

  if (!premium) {
    return (
      <div className="card yearly-locked">
        <h2>🗓️ {thisYear}·{thisYear + 1} 신년운세 <span className="lock-tag">프리미엄</span></h2>
        <p className="meta" style={{ margin: '10px 0 20px' }}>
          올해와 내년, 1월부터 12월까지 <b>월별 길흉 캘린더</b>로 한눈에. 기회가 열리는 달과 조심할 달을 미리 짚어드려요.
        </p>
        <div className="yearly-teaser">
          {Array.from({ length: 12 }).map((_, i) => (
            <div className="yt-cell" key={i}><span>{i + 1}월</span><i /></div>
          ))}
        </div>
        <button className="btn" onClick={onLocked} style={{ marginTop: 20 }}>🔒 잠금 해제하고 신년운세 보기</button>
      </div>
    );
  }

  return (
    <div className="card yearly-card">
      <div className="yearly-top">
        <h2 style={{ margin: 0 }}>🗓️ 신년운세 · 월별 길흉</h2>
        <div className="year-toggle">
          <button className={year === thisYear ? 'on' : ''} onClick={() => setYear(thisYear)}>{thisYear} 올해</button>
          <button className={year === thisYear + 1 ? 'on' : ''} onClick={() => setYear(thisYear + 1)}>{thisYear + 1} 내년</button>
        </div>
      </div>

      <div className="yearly-summary">
        <div className="ys-badge" style={{ borderColor: GRADE_COLOR[y.yearGrade] }}>
          <b className="ys-gz">{y.yearGanjiHanja}</b>
          <span className="ys-score" style={{ color: GRADE_COLOR[y.yearGrade] }}>{y.yearScore}</span>
          <span className="ys-grade" style={{ color: GRADE_COLOR[y.yearGrade] }}>{y.yearGrade}</span>
        </div>
        <div className="ys-txt">
          <p className="ys-head">{name ? `${name}님, ` : ''}{y.headline}</p>
          <p className="ys-sum">{y.summary}</p>
        </div>
      </div>

      <div className="ym-grid">
        {y.months.map((m) => (
          <div className="ym-cell" key={m.month} style={{ borderTopColor: GRADE_COLOR[m.grade] }}>
            <div className="ym-row1"><span className="ym-m">{m.month}월</span><span className="ym-gz">{m.ganjiHanja}</span></div>
            <div className="ym-score" style={{ color: GRADE_COLOR[m.grade] }}>{m.score}<small>{m.grade}</small></div>
            <div className="ym-bar"><div style={{ width: `${m.score}%`, background: GRADE_COLOR[m.grade] }} /></div>
            <div className="ym-theme">{m.theme}</div>
          </div>
        ))}
      </div>

      <div className="ym-highlights">
        {y.bestMonths.length > 0 && (
          <div className="ymh ok"><span>기회의 달</span><b>{y.bestMonths.map((m) => `${m}월`).join(' · ')}</b></div>
        )}
        {y.cautionMonths.length > 0 && (
          <div className="ymh warn"><span>조심할 달</span><b>{y.cautionMonths.map((m) => `${m}월`).join(' · ')}</b></div>
        )}
      </div>

      <div className="yearly-ai">
        {comments[year] !== undefined ? (
          <div className="yearly-ai-box">
            <div className="yearly-ai-head">✨ 선배의 {year}년 총평{streaming && <span className="caret" />}</div>
            {comments[year]
              ? comments[year].split('\n').filter(Boolean).map((p, i) => <p key={i}>{p}</p>)
              : <div className="read-wait">✍️ {year}년 흐름을 읽는 중…<span className="caret" /></div>}
          </div>
        ) : (
          <button className="btn ai-btn" onClick={askAI} disabled={streaming}>
            ✨ AI 선배에게 {year}년 총평 듣기 →
          </button>
        )}
        {aiErr && <div className="warn" style={{ marginTop: 12 }}>{aiErr}</div>}
      </div>

      <p className="daily-foot">월운은 절기(節氣) 기준 월지에 세운 천간을 대입해 계산했습니다. 큰 흐름의 참고로 활용하세요.</p>
    </div>
  );
}

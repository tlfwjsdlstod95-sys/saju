'use client';

import { useEffect, useMemo, useState } from 'react';

import type { FreeSajuResult as SajuResult } from '@/lib/saju/gate';
import { computeDailyFortune, dailyFormula, kstDate, msToNextKstMidnight } from '@/lib/saju/daily';

const GRADE_COLOR: Record<string, string> = {
  대길: '#22c55e', 길: '#86c33a', 평: '#eab308', 주의: '#ef8a4d',
};
function barColor(s: number): string {
  return s >= 75 ? '#22c55e' : s >= 50 ? '#86c33a' : s >= 35 ? '#eab308' : '#ef8a4d';
}

/** 오늘의 운세 — 원국 × 오늘 일진. AI 호출 없음, 무작위 없음. 일진은 한국 날짜 00:00에 바뀐다. */
export default function DailyFortune({ result }: { result: SajuResult }) {
  // 한국 날짜가 키다. 페이지를 켜 둔 채 자정(한국)을 넘기면 다시 계산한다.
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setTimeout(() => setNow(new Date()), msToNextKstMidnight(now) + 1000);
    return () => clearTimeout(t);
  }, [now]);
  const k = kstDate(now);
  const dayKey = `${k.y}-${k.m}-${k.d}`;
  // 캐시 키 = {명식}:{YYYY-MM-DD} — 날짜가 바뀌면 어제 계산을 쓰지 않는다
  const f = useMemo(() => computeDailyFortune(result, now), [result, dayKey]); // eslint-disable-line
  const formula = useMemo(() => dailyFormula(result.input.sex ?? 'M'), [result.input.sex]);

  const name = result.input.name;
  return (
    <div className="card daily-card" data-cache-key={f.cacheKey}>
      <div className="daily-head">
        <div>
          <div className="daily-eyebrow">오늘의 운세</div>
          <h2 className="daily-title">{name ? `${name}님, ` : ''}{f.dateLabel}</h2>
        </div>
        <div className="daily-iljin">
          <span className="daily-iljin-hanja">{f.iljinHanja}</span>
          <span className="daily-iljin-sub">오늘 일진 {f.iljinKor} · {f.todaySipsin}의 날</span>
          <span className="daily-iljin-sub">한국 시각 00:00에 다음 일진으로 바뀝니다</span>
        </div>
      </div>

      <div className="daily-total">
        <div className="daily-score-ring" style={{ ['--g' as any]: GRADE_COLOR[f.grade], ['--p' as any]: `${f.total}%` }}>
          <div className="daily-score-inner">
            <b style={{ color: GRADE_COLOR[f.grade] }}>{f.total}</b>
            <span>총운</span>
          </div>
        </div>
        <div className="daily-total-txt">
          <div className="daily-grade" style={{ color: GRADE_COLOR[f.grade] }}>{f.grade}</div>
          <p className="daily-headline">{f.headline}</p>
          <p className="daily-advice">{f.lines.join(' ')}</p>
        </div>
      </div>

      <div className="daily-cats">
        {f.categories.map((c) => (
          <div className="daily-cat" key={c.key}>
            <div className="daily-cat-top">
              <span className="daily-cat-label">{c.emoji} {c.label}</span>
              <span className="daily-cat-score" style={{ color: barColor(c.score) }}>{c.score}</span>
            </div>
            <div className="daily-cat-track">
              <div className="daily-cat-fill" style={{ width: `${c.score}%`, background: barColor(c.score) }} />
            </div>
            <p className="daily-cat-msg">{c.msg}</p>
          </div>
        ))}
      </div>

      <details className="daily-fold">
        <summary>원국과의 관계 {f.tags.length ? `(${f.tags.length})` : '(없음)'}</summary>
        {f.tags.length ? (
          <ul className="daily-tags">{f.tags.map((t) => <li key={t}>{t}</li>)}</ul>
        ) : (
          <p className="daily-fold-p">오늘 일진은 원국 어느 자리와도 합·충·형·해·원진을 이루지 않습니다.</p>
        )}
        {!f.structure.hour_pillar_known && <p className="daily-fold-p">출생 시각을 몰라 시주와의 관계는 보지 않았습니다.</p>}
      </details>

      <details className="daily-fold">
        <summary>계산</summary>
        <ul className="daily-formula">{formula.map((l) => <li key={l}>{l}</li>)}</ul>
        <table className="daily-parts">
          <thead><tr><th>분야</th><th>기본</th><th>십신</th><th>관계</th><th>점수</th></tr></thead>
          <tbody>
            {f.categories.map((c) => (
              <tr key={c.key}>
                <td>{c.label}</td><td>{c.parts.base}</td><td>+{c.parts.tenGod}</td>
                <td>{c.parts.relations > 0 ? `+${c.parts.relations}` : c.parts.relations}</td><td><b>{c.score}</b></td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>

      <p className="daily-foot">한국 날짜의 일진(日辰) 기준입니다. 오늘 일진과 원국 네 기둥의 관계만 계산합니다.</p>
    </div>
  );
}

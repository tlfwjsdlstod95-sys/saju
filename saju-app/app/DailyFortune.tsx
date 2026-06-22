'use client';

import { useMemo } from 'react';
import type { SajuResult } from '@/lib/saju/types';
import { computeDailyFortune } from '@/lib/saju/daily';

const GRADE_COLOR: Record<string, string> = {
  대길: '#22c55e', 길: '#86c33a', 평: '#eab308', 주의: '#ef8a4d',
};
function barColor(s: number): string {
  return s >= 75 ? '#22c55e' : s >= 50 ? '#86c33a' : s >= 35 ? '#eab308' : '#ef8a4d';
}

export default function DailyFortune({ result }: { result: SajuResult }) {
  // 오늘 날짜 기준(자정에 일진이 바뀜). useMemo 키에 날짜를 넣어 날짜 바뀌면 갱신.
  const todayKey = new Date().toDateString();
  const f = useMemo(() => computeDailyFortune(result), [result, todayKey]); // eslint-disable-line

  const name = result.input.name;
  return (
    <div className="card daily-card">
      <div className="daily-head">
        <div>
          <div className="daily-eyebrow">오늘의 운세</div>
          <h2 className="daily-title">{name ? `${name}님, ` : ''}{f.dateLabel}</h2>
        </div>
        <div className="daily-iljin">
          <span className="daily-iljin-hanja">{f.iljinHanja}</span>
          <span className="daily-iljin-sub">{f.iljinKor} · {f.animal}띠 날 · {f.todaySipsin}</span>
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
          <p className="daily-advice">{f.advice}</p>
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

      <div className="daily-lucky">
        <div className="daily-lucky-item">
          <span className="dl-k">행운의 색</span>
          <span className="dl-v"><i className="dl-swatch" style={{ background: f.lucky.colorHex }} />{f.lucky.color}</span>
        </div>
        <div className="daily-lucky-item"><span className="dl-k">행운의 숫자</span><span className="dl-v">{f.lucky.number}</span></div>
        <div className="daily-lucky-item"><span className="dl-k">행운의 방위</span><span className="dl-v">{f.lucky.direction}</span></div>
      </div>

      <p className="daily-foot">매일 자정, 오늘의 일진(日辰)에 맞춰 새로 계산됩니다.</p>
    </div>
  );
}

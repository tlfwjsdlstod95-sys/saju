'use client';

import { useMemo } from 'react';
import type { SajuResult } from '@/lib/saju/types';
import { computeNaming } from '@/lib/saju/naming';

const OHAENG_COLOR: Record<string, string> = {
  목: '#22c55e', 화: '#ef4444', 토: '#eab308', 금: '#e2e8f0', 수: '#3b82f6',
};

export default function NamingCard({ result }: { result: SajuResult }) {
  const n = useMemo(() => computeNaming(result), [result]);
  const name = result.input.name;

  return (
    <div className="card naming-card">
      <h2>✍️ 이름 · 작명 도움말</h2>
      <div className="meta" style={{ marginBottom: 18 }}>
        한글 이름의 첫소리(초성)는 오행 기운을 담습니다. 사주에 부족한 기운을 <b>소리로 채우는</b> 것이 발음오행 작명이에요.
      </div>

      <div className="naming-need">
        <div className="naming-need-badge" style={{ borderColor: OHAENG_COLOR[n.needPrimary] }}>
          <span>보완하면 좋은 오행</span>
          <b style={{ color: OHAENG_COLOR[n.needPrimary] }}>{n.needPrimary}</b>
        </div>
        <p className="naming-reason">{n.reason}</p>
      </div>

      <div className="naming-sound">
        <div className="naming-row">
          <span className="naming-k">추천 첫소리(초성)</span>
          <div className="naming-cho">
            {n.recommendChoseong.map((c, i) => <span className="cho-chip" key={i}>{c}</span>)}
          </div>
        </div>
        <div className="naming-row">
          <span className="naming-k">추천 이름 음절</span>
          <div className="naming-syll">
            {n.suggestSyllables.map((s, i) => <span className="syll-chip" key={i}>{s}</span>)}
          </div>
        </div>
      </div>

      {n.nameAnalysis && (
        <div className="naming-analysis">
          <div className="naming-k" style={{ marginBottom: 10 }}>{name ? `'${name}' ` : ''}이름의 소리오행</div>
          <div className="name-chars">
            {n.nameAnalysis.map((c, i) => (
              <div className="name-char" key={i}>
                <span className="nc-char">{c.char}</span>
                <span className="nc-cho">{c.choseong}</span>
                <span className="nc-oh" style={{ color: c.ohaeng ? OHAENG_COLOR[c.ohaeng] : '#64748b' }}>{c.ohaeng ?? '—'}</span>
              </div>
            ))}
          </div>
          {n.nameVerdict && <p className="name-verdict">{n.nameVerdict}</p>}
        </div>
      )}

      <p className="daily-foot">발음오행(소리) 기준의 참고용 안내입니다. 한자 자원오행·획수(수리) 길흉까지 보려면 전문 작명을 권합니다.</p>
    </div>
  );
}

'use client';

import { useMemo, useState } from 'react';
import type { SajuResult } from '@/lib/saju/types';
import { pickAuspicious, topAuspicious, PURPOSES, type Purpose } from '@/lib/saju/auspicious';

function barColor(s: number) { return s >= 80 ? '#22c55e' : s >= 65 ? '#86c33a' : '#eab308'; }

export default function AuspiciousDates({
  result, premium, onLocked,
}: {
  result: SajuResult; premium: boolean; onLocked: () => void;
}) {
  const now = new Date();
  const [purpose, setPurpose] = useState<Purpose>('wedding');
  const [offset, setOffset] = useState(0); // 0=이번달,1,2

  const { top, avoided, label, ty, tm } = useMemo(() => {
    const base = new Date(now.getFullYear(), now.getMonth() + offset, 1);
    const ty = base.getFullYear(), tm = base.getMonth() + 1;
    let all = pickAuspicious(result, purpose, ty, tm);
    if (offset === 0) all = all.filter((d) => d.day >= now.getDate()); // 지난 날 제외
    const top = topAuspicious(all, 6);
    const avoided = all.filter((d) => d.warn);
    const label = PURPOSES.find((p) => p.key === purpose)!.label;
    return { top, avoided, label, ty, tm };
  }, [result, purpose, offset]); // eslint-disable-line

  if (!premium) {
    return (
      <div className="card yearly-locked">
        <h2>📅 좋은 날 택일(擇日) <span className="lock-tag">프리미엄</span></h2>
        <p className="meta" style={{ margin: '10px 0 20px' }}>
          결혼·이사·계약 같은 중요한 일에, 당신 사주에 맞는 <b>길일(吉日)</b>을 골라드려요. 일진·합충·손없는날까지 따져서.
        </p>
        <div className="yearly-teaser">{Array.from({ length: 6 }).map((_, i) => <div className="yt-cell" key={i}><span>{i + 1}일</span><i /></div>)}</div>
        <button className="btn" onClick={onLocked} style={{ marginTop: 20 }}>🔒 잠금 해제하고 택일 보기</button>
      </div>
    );
  }

  return (
    <div className="card yearly-card">
      <div className="yearly-top">
        <h2 style={{ margin: 0 }}>📅 좋은 날 택일(擇日)</h2>
        <div className="year-toggle">
          {[0, 1, 2].map((o) => {
            const dt = new Date(now.getFullYear(), now.getMonth() + o, 1);
            return <button key={o} className={offset === o ? 'on' : ''} onClick={() => setOffset(o)}>{dt.getMonth() + 1}월</button>;
          })}
        </div>
      </div>

      <div className="ausp-purposes">
        {PURPOSES.map((p) => (
          <button key={p.key} className={`ausp-chip ${purpose === p.key ? 'on' : ''}`} onClick={() => setPurpose(p.key)}>
            {p.emoji} {p.label}
          </button>
        ))}
      </div>

      <div className="meta" style={{ margin: '4px 0 14px' }}>{ty}년 {tm}월 · <b>{label}</b>에 좋은 날 (점수 높은 순)</div>

      {top.length === 0 ? (
        <p className="meta">이 달에는 추천할 만한 길일이 마땅치 않아요. 다른 달을 확인해 보세요.</p>
      ) : (
        <div className="ausp-list">
          {top.map((d) => (
            <div className="ausp-day" key={d.date}>
              <div className="ausp-date">
                <b>{d.month}/{d.day}</b><span>{d.weekday}</span>
              </div>
              <div className="ausp-mid">
                <div className="ausp-gz">{d.ganjiHanja} <small>{d.ganji}</small></div>
                <div className="ausp-reasons">{d.reasons.slice(0, 2).join(' · ') || '무난하게 좋은 날'}</div>
              </div>
              <div className="ausp-score" style={{ color: barColor(d.score) }}>{d.score}<small>점</small></div>
            </div>
          ))}
        </div>
      )}

      {avoided.length > 0 && (
        <div className="ausp-avoid">⚠️ 피하면 좋은 날: {avoided.map((d) => `${d.day}일`).join(' · ')} <span>(일지와 충, 변동·마찰)</span></div>
      )}
      <p className="daily-foot">일진(日辰)을 당신 일간에 대입해 합충·손없는날까지 반영한 결과입니다. 큰 결정의 참고로 활용하세요.</p>
    </div>
  );
}

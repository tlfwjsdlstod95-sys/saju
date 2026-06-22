'use client';

import { useMemo } from 'react';
import type { SajuResult } from '@/lib/saju/types';
import { computeGaeun } from '@/lib/saju/gaeun';

export default function GaeunCard({
  result, premium, onLocked,
}: {
  result: SajuResult; premium: boolean; onLocked: () => void;
}) {
  const g = useMemo(() => computeGaeun(result), [result]);
  const name = result.input.name;

  if (!premium) {
    return (
      <div className="card yearly-locked">
        <h2>🍀 나만의 개운법 <span className="lock-tag">프리미엄</span></h2>
        <p className="meta" style={{ margin: '10px 0 20px' }}>
          당신 사주에 부족한 기운을 채우는 <b>맞춤 생활 처방</b> — 행운의 색·방위·음식·취미·어울리는 일·소품까지.
        </p>
        <button className="btn" onClick={onLocked}>🔒 잠금 해제하고 개운법 보기</button>
      </div>
    );
  }

  const rows: [string, string, string][] = [
    ['🎨', '행운의 색', g.primary.color],
    ['🧭', '행운의 방위', g.primary.direction],
    ['🍽️', '도움 되는 음식', g.primary.foods],
    ['🎯', '운을 키우는 활동', g.primary.activities],
    ['💼', '어울리는 일·환경', g.primary.careers],
    ['💎', '곁에 두면 좋은 소품', g.primary.items],
  ];

  return (
    <div className="card gaeun-card">
      <h2>🍀 {name ? `${name}님 ` : ''}맞춤 개운법</h2>
      <div className="gaeun-need">
        <div className="gaeun-badge" style={{ borderColor: g.primary.colorHex }}>
          <span>핵심 기운</span><b style={{ color: g.primary.colorHex }}>{g.yongsin}</b>
        </div>
        <p className="gaeun-reason">{g.reason}</p>
      </div>

      <div className="gaeun-rows">
        {rows.map(([emoji, k, v]) => (
          <div className="gaeun-row" key={k}>
            <div className="gaeun-k">{emoji} {k}</div>
            <div className="gaeun-v">{v}</div>
          </div>
        ))}
      </div>

      <div className="gaeun-extra">
        <span className="gaeun-extra-k">보조로 좋은 ‘{g.secondary}’ 기운</span>
        <span className="gaeun-extra-v">{g.secondaryReco.color} · {g.secondaryReco.direction} · {g.secondaryReco.activities.split(',')[0]}</span>
      </div>

      {g.cautionText && <div className="gaeun-caution">⚠️ {g.cautionText}</div>}

      <p className="daily-foot">사주의 오행 균형(용신)에 맞춘 생활 처방이에요. 무리 없이 일상에 하나씩 들여보세요.</p>
    </div>
  );
}

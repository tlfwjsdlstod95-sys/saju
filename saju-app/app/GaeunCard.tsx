"use client";

import type { SajuResult } from '@/lib/saju/types';
import type { GaeunResult } from '@/lib/saju/gaeun';   // 타입만 — 빌드 시 지워져 번들에 안 실린다
// 계산은 서버에서만 한다(/api/premium). 여기서 계산하면 잠금이 '화면 가리기'에 그친다.
// 같은 데이터를 가이드북 PDF 도 쓰므로, 요청은 페이지에서 한 번만 하고 결과를 내려받는다.
export default function GaeunCard({
  result, premium, onLocked, gaeun,
}: {
  result: SajuResult; premium: boolean; onLocked: () => void;
  gaeun: { data: GaeunResult | null; loading: boolean; locked: boolean; err: string };
}) {
  const name = result.input.name;
  const { data: g, loading, locked, err } = gaeun;

  if (!premium || locked) {
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

  if (loading || !g) {
    return (
      <div className="card gaeun-card">
        <h2>🍀 {name ? `${name}님 ` : ''}맞춤 개운법</h2>
        <p className="meta">{err || '처방을 불러오는 중이에요…'}</p>
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

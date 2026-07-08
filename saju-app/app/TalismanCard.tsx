'use client';

// 나의 행운 부적 — 용신 오행 기반 디지털 부적 카드 (무료, 인스타 스토리 1080×1920)
// 힙한 미니멀 타로 컨셉. computeGaeun(용신)에서 컬러/방위/아이템 도출.
import { useEffect, useRef, useState } from 'react';
import type { SajuResult } from '@/lib/saju/types';
import { computeGaeun } from '@/lib/saju/gaeun';
import { BIZ } from './biz';

const W = 1080, H = 1920;

const HANJA: Record<string, string> = { 목: '木', 화: '火', 토: '土', 금: '金', 수: '水' };

const TALISMAN: Record<string, { keywords: string[]; mantra: string; itemShort: string; colorShort: string }> = {
  목: { keywords: ['성장', '시작', '회복'], mantra: '새로 심는 자리마다 뿌리가 내린다', itemShort: '작은 화분 · 초록 지갑', colorShort: '초록' },
  화: { keywords: ['열정', '표현', '확산'], mantra: '드러내는 만큼 운이 밝아진다', itemShort: '붉은 액세서리 · 캔들', colorShort: '레드' },
  토: { keywords: ['안정', '신뢰', '중심'], mantra: '중심을 지키면 사람이 모인다', itemShort: '세라믹 소품 · 황색 스톤', colorShort: '옐로·베이지' },
  금: { keywords: ['결단', '재물', '정리'], mantra: '끊어낼 때 비로소 길이 열린다', itemShort: '은 액세서리 · 백수정', colorShort: '화이트·실버' },
  수: { keywords: ['지혜', '유연', '흐름'], mantra: '흐르는 대로 두면 그게 길이 된다', itemShort: '남색 소품 · 블랙토르말린', colorShort: '네이비·블랙' },
};

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}

function hexA(hex: string, a: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

function draw(canvas: HTMLCanvasElement, r: SajuResult) {
  const ctx = canvas.getContext('2d')!;
  canvas.width = W; canvas.height = H;
  const g = computeGaeun(r);
  const t = TALISMAN[g.yongsin];
  const lucky = g.primary.colorHex;
  const name = r.input.name ? `${r.input.name}님` : '당신';

  // 배경 — 딥퍼플 그라데이션 + 용신 컬러 글로우
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#1d1336'); bg.addColorStop(0.55, '#120d24'); bg.addColorStop(1, '#0a0714');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
  const glow = ctx.createRadialGradient(W / 2, 700, 0, W / 2, 700, 760);
  glow.addColorStop(0, hexA(lucky, 0.16)); glow.addColorStop(1, hexA(lucky, 0));
  ctx.fillStyle = glow; ctx.fillRect(0, 0, W, H);

  // 이중 테두리 — 바깥 골드, 안쪽 용신 컬러
  ctx.strokeStyle = 'rgba(230,200,120,0.4)'; ctx.lineWidth = 2;
  roundRect(ctx, 30, 30, W - 60, H - 60, 44); ctx.stroke();
  ctx.strokeStyle = hexA(lucky, 0.5); ctx.lineWidth = 1.5;
  roundRect(ctx, 48, 48, W - 96, H - 96, 34); ctx.stroke();

  // 별 장식
  ctx.fillStyle = 'rgba(230,200,120,.6)';
  [[160, 260], [930, 300], [220, 1180], [880, 1140], [130, 620], [950, 660]].forEach(([x, y], i) => {
    ctx.beginPath(); ctx.arc(x, y, i % 2 ? 2.5 : 3.5, 0, Math.PI * 2); ctx.fill();
  });

  ctx.textAlign = 'center';

  // 상단 라벨
  ctx.fillStyle = '#bfae8a'; ctx.font = '500 26px "Noto Sans KR", sans-serif';
  ctx.fillText('H E A R I M · L U C K Y   C H A R M', W / 2, 156);
  ctx.fillStyle = '#ffffff'; ctx.font = '800 62px "Nanum Myeongjo", serif';
  ctx.fillText('나의 행운 부적', W / 2, 246);

  // 인장(Seal) — 이중 링 + 용신 한자
  const cx = W / 2, cy = 640, R = 250;
  ctx.strokeStyle = hexA(lucky, 0.9); ctx.lineWidth = 5;
  ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = hexA(lucky, 0.4); ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.arc(cx, cy, R - 18, 0, Math.PI * 2); ctx.stroke();
  // 링 안 은은한 채움
  const fillG = ctx.createRadialGradient(cx, cy, 0, cx, cy, R);
  fillG.addColorStop(0, hexA(lucky, 0.12)); fillG.addColorStop(1, hexA(lucky, 0.02));
  ctx.fillStyle = fillG; ctx.beginPath(); ctx.arc(cx, cy, R - 20, 0, Math.PI * 2); ctx.fill();
  // 한자
  ctx.shadowColor = hexA(lucky, 0.55); ctx.shadowBlur = 46;
  ctx.fillStyle = lucky; ctx.font = '800 240px "Nanum Myeongjo", serif';
  ctx.fillText(HANJA[g.yongsin], cx, cy + 86);
  ctx.shadowBlur = 0;
  // 링 상하 포인트
  ctx.fillStyle = hexA(lucky, 0.9);
  [[cx, cy - R], [cx, cy + R]].forEach(([x, y]) => { ctx.beginPath(); ctx.arc(x, y, 6, 0, Math.PI * 2); ctx.fill(); });

  // 부제
  ctx.fillStyle = '#e6c878'; ctx.font = '500 36px "Noto Sans KR", sans-serif';
  ctx.fillText(`${name}을 지키는 '${g.yongsin}(${HANJA[g.yongsin]})'의 기운`, W / 2, 1000);

  // 키워드 칩 3개
  ctx.font = '700 30px "Noto Sans KR", sans-serif';
  const chipGap = 18;
  const widths = t.keywords.map((k) => ctx.measureText(k).width + 56);
  const totalW = widths.reduce((s, w) => s + w, 0) + chipGap * (t.keywords.length - 1);
  let px = (W - totalW) / 2;
  const chipY = 1070;
  t.keywords.forEach((k, i) => {
    const w = widths[i];
    ctx.fillStyle = hexA(lucky, 0.1); ctx.strokeStyle = hexA(lucky, 0.55); ctx.lineWidth = 1.5;
    roundRect(ctx, px, chipY - 36, w, 56, 28); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#f0eaf8'; ctx.textAlign = 'center';
    ctx.fillText(k, px + w / 2, chipY + 4);
    px += w + chipGap;
  });

  // 구분선
  ctx.strokeStyle = 'rgba(230,200,120,0.25)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(180, 1170); ctx.lineTo(W - 180, 1170); ctx.stroke();

  // 행운 정보 3행 — 컬러 / 방위 / 아이템
  ctx.textAlign = 'center';
  const rows: Array<{ label: string; value: string; swatch?: boolean }> = [
    { label: 'LUCKY COLOR', value: `${t.colorShort} (${g.primary.color})`, swatch: true },
    { label: 'LUCKY DIRECTION', value: g.primary.direction },
    { label: 'LUCKY ITEM', value: t.itemShort },
  ];
  let ry = 1264;
  rows.forEach((row) => {
    ctx.fillStyle = '#8a82a6'; ctx.font = '600 24px "Noto Sans KR", sans-serif';
    ctx.fillText(row.label, W / 2, ry);
    ctx.fillStyle = '#ffffff'; ctx.font = '500 38px "Noto Sans KR", sans-serif';
    if (row.swatch) {
      const vw = ctx.measureText(row.value).width;
      const sx = (W - vw) / 2 - 34;
      ctx.fillStyle = lucky; ctx.beginPath(); ctx.arc(sx, ry + 40, 16, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = '#ffffff';
      ctx.fillText(row.value, W / 2 + 12, ry + 52);
    } else {
      ctx.fillText(row.value, W / 2, ry + 52);
    }
    ry += 138;
  });

  // 만트라
  ctx.fillStyle = '#d7cfe6'; ctx.font = '400 40px "Nanum Myeongjo", serif';
  ctx.fillText(`“${t.mantra}”`, W / 2, ry + 40);

  // 푸터
  ctx.fillStyle = '#ffffff'; ctx.font = '700 40px "Noto Sans KR", sans-serif';
  ctx.fillText('내 행운 부적 만들기 ✨', W / 2, H - 150);
  ctx.fillStyle = '#bfae8a'; ctx.font = '500 27px "Noto Sans KR", sans-serif';
  ctx.fillText(`${BIZ.name} · 틀린 사주로 인생을 정할 순 없으니까`, W / 2, H - 96);
}

export default function TalismanCard({ result }: { result: SajuResult }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [toast, setToast] = useState('');
  const gaeun = computeGaeun(result);
  const t = TALISMAN[gaeun.yongsin];

  useEffect(() => {
    (async () => { try { await (document as any).fonts?.ready; } catch {} if (canvasRef.current) draw(canvasRef.current, result); })();
  }, [result]);

  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(''), 2000); };
  const getBlob = (): Promise<Blob | null> => new Promise((res) => canvasRef.current?.toBlob((b) => res(b), 'image/png') ?? res(null));

  async function save() {
    const blob = await getBlob(); if (!blob) return;
    const url = URL.createObjectURL(blob); const a = document.createElement('a');
    a.href = url; a.download = `행운부적_${gaeun.yongsin}.png`; a.click(); URL.revokeObjectURL(url); flash('부적을 저장했어요');
  }
  async function share() {
    const blob = await getBlob(); if (!blob) return;
    const file = new File([blob], 'lucky-charm.png', { type: 'image/png' });
    const nav = navigator as any;
    if (nav.canShare && nav.canShare({ files: [file] })) {
      try { await nav.share({ files: [file], title: '나의 행운 부적', text: `내 행운의 기운은 '${gaeun.yongsin}(${HANJA[gaeun.yongsin]})' — 행운 컬러는 ${t.colorShort}! ✨` }); return; } catch {}
    }
    save();
  }
  async function copyText() {
    try {
      await navigator.clipboard.writeText(`내 행운의 기운은 '${gaeun.yongsin}(${HANJA[gaeun.yongsin]})' ✨\n행운 컬러 ${t.colorShort} · 행운 방위 ${gaeun.primary.direction}\n“${t.mantra}” #행운부적 #헤아림`);
      flash('공유 문구를 복사했어요');
    } catch { flash('복사 실패'); }
  }

  return (
    <div className="card">
      <h2>나의 행운 부적</h2>
      <div className="meta" style={{ marginBottom: 14 }}>
        {result.input.name ? `${result.input.name}님` : '당신'}에게 필요한 기운 <b>{gaeun.yongsin}({HANJA[gaeun.yongsin]})</b>을 담은 부적이에요.
        배경화면·스토리에 올려 행운 컬러를 곁에 두세요.
      </div>
      <canvas ref={canvasRef} className="share-canvas" style={{ maxWidth: 300 }} />
      <div className="share-actions">
        <button className="btn share-btn" onClick={share}>📤 공유하기</button>
        <button className="btn share-btn ghost" onClick={save}>💾 배경화면 저장</button>
        <button className="btn share-btn ghost" onClick={copyText}>🔗 문구 복사</button>
      </div>
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

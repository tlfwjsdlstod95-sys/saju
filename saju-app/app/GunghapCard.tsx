'use client';

import { useEffect, useRef, useState } from 'react';
import type { SajuResult } from '@/lib/saju/types';
import type { CompatResult } from '@/lib/saju/compatibility';

const W = 1080, H = 1350;

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
function wrapText(ctx: CanvasRenderingContext2D, text: string, maxW: number): string[] {
  const words = text.split(' '); const lines: string[] = []; let cur = '';
  for (const w of words) {
    const t = cur ? `${cur} ${w}` : w;
    if (ctx.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t;
  }
  if (cur) lines.push(cur); return lines;
}

function tierColor(total: number) { return total >= 75 ? '#e6c878' : total >= 60 ? '#c9a14a' : '#d98ab0'; }

function drawCard(
  canvas: HTMLCanvasElement,
  a: SajuResult, b: SajuResult, compat: CompatResult, nameA: string, nameB: string,
) {
  const ctx = canvas.getContext('2d')!;
  canvas.width = W; canvas.height = H;
  const tc = tierColor(compat.total);

  // 배경
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#1a1230'); bg.addColorStop(1, '#05030a');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
  const g1 = ctx.createRadialGradient(W * 0.25, 300, 0, W * 0.25, 300, 560);
  g1.addColorStop(0, 'rgba(239,68,68,0.16)'); g1.addColorStop(1, 'rgba(239,68,68,0)');
  ctx.fillStyle = g1; ctx.fillRect(0, 0, W, H);
  const g2 = ctx.createRadialGradient(W * 0.78, 320, 0, W * 0.78, 320, 560);
  g2.addColorStop(0, 'rgba(230,200,120,0.16)'); g2.addColorStop(1, 'rgba(230,200,120,0)');
  ctx.fillStyle = g2; ctx.fillRect(0, 0, W, H);

  ctx.strokeStyle = 'rgba(230,200,120,0.5)'; ctx.lineWidth = 2;
  roundRect(ctx, 28, 28, W - 56, H - 56, 44); ctx.stroke();

  ctx.textAlign = 'center';
  ctx.fillStyle = '#64748b'; ctx.font = '700 28px "Noto Sans KR", sans-serif';
  try { (ctx as any).letterSpacing = '6px'; } catch {}
  ctx.fillText('헤아림 · 사주 궁합', W / 2, 122);
  try { (ctx as any).letterSpacing = '0px'; } catch {}

  // 두 사람 심볼
  ctx.font = '110px serif';
  ctx.fillText(a.archetype.symbol, W / 2 - 200, 290);
  ctx.fillText(b.archetype.symbol, W / 2 + 200, 290);
  ctx.font = '64px serif';
  ctx.fillText('💞', W / 2, 278);
  // 이름·유형
  ctx.fillStyle = '#e2e8f0'; ctx.font = '700 34px "Noto Sans KR", sans-serif';
  ctx.fillText(nameA || '나', W / 2 - 200, 350);
  ctx.fillText(nameB || '상대', W / 2 + 200, 350);
  ctx.fillStyle = '#94a3b8'; ctx.font = '400 22px "Noto Sans KR", sans-serif';
  ctx.fillText(a.archetype.title, W / 2 - 200, 384);
  ctx.fillText(b.archetype.title, W / 2 + 200, 384);

  // 점수 링
  const cx = W / 2, cy = 580, R = 118;
  ctx.lineWidth = 24; ctx.lineCap = 'round';
  ctx.strokeStyle = '#1e293b';
  ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = tc;
  ctx.beginPath(); ctx.arc(cx, cy, R, -Math.PI / 2, -Math.PI / 2 + (compat.total / 100) * Math.PI * 2); ctx.stroke();
  ctx.fillStyle = '#fff'; ctx.font = '700 92px "Urbanist", sans-serif';
  ctx.fillText(String(compat.total), cx, cy + 18);
  ctx.fillStyle = '#94a3b8'; ctx.font = '400 26px "Noto Sans KR", sans-serif';
  ctx.fillText('점', cx, cy + 58);

  // 등급 · 헤드라인
  ctx.fillStyle = tc; ctx.font = '700 50px "Noto Sans KR", sans-serif';
  ctx.fillText(compat.tier, W / 2, cy + 160);
  ctx.fillStyle = '#cbd5e1'; ctx.font = '400 30px "Noto Sans KR", sans-serif';
  wrapText(ctx, compat.headline, W - 220).forEach((ln, i) => ctx.fillText(ln, W / 2, cy + 210 + i * 42));

  // 항목 막대
  ctx.textAlign = 'left';
  const left = 130, right = W - 130, trackW = right - left;
  let by = cy + 300;
  compat.items.forEach((it) => {
    ctx.fillStyle = '#cbd5e1'; ctx.font = '500 26px "Noto Sans KR", sans-serif';
    ctx.fillText(it.label, left, by);
    ctx.textAlign = 'right'; ctx.fillStyle = tc;
    ctx.fillText(`${it.score}/${it.max}`, right, by); ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    roundRect(ctx, left, by + 14, trackW, 22, 11); ctx.fill();
    ctx.fillStyle = tc;
    roundRect(ctx, left, by + 14, Math.max(22, (trackW * it.score) / it.max), 22, 11); ctx.fill();
    by += 74;
  });

  // 푸터
  ctx.textAlign = 'center';
  ctx.fillStyle = '#fff'; ctx.font = '700 38px "Noto Sans KR", sans-serif';
  ctx.fillText('너희 궁합도 확인해봐 →', W / 2, H - 104);
  ctx.fillStyle = '#e6c878'; ctx.font = '500 27px "Noto Sans KR", sans-serif';
  ctx.fillText('헤아림 · 정밀 만세력 사주', W / 2, H - 60);
}

export default function GunghapCard(
  { a, b, compat, nameA, nameB }: { a: SajuResult; b: SajuResult; compat: CompatResult; nameA: string; nameB: string },
) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [toast, setToast] = useState('');
  useEffect(() => {
    (async () => {
      try { await (document as any).fonts?.ready; } catch {}
      if (ref.current) drawCard(ref.current, a, b, compat, nameA, nameB);
    })();
  }, [a, b, compat, nameA, nameB]);

  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(''), 2000); };
  const getBlob = (): Promise<Blob | null> =>
    new Promise((res) => ref.current?.toBlob((bl) => res(bl), 'image/png') ?? res(null));

  async function save() {
    const blob = await getBlob(); if (!blob) return;
    const url = URL.createObjectURL(blob); const el = document.createElement('a');
    el.href = url; el.download = `사주궁합_${compat.total}점.png`; el.click();
    URL.revokeObjectURL(url); flash('이미지를 저장했어요');
  }
  async function share() {
    const blob = await getBlob(); if (!blob) return;
    const file = new File([blob], 'gunghap.png', { type: 'image/png' });
    const nav = navigator as any;
    if (nav.canShare && nav.canShare({ files: [file] })) {
      try { await nav.share({ files: [file], title: '사주 궁합', text: `${nameA || '나'} ♥ ${nameB || '상대'} 궁합 ${compat.total}점 — ${compat.tier}!` }); return; } catch {}
    }
    save();
  }
  async function copyText() {
    const t = `${nameA || '나'} ♥ ${nameB || '상대'} 사주 궁합 ${compat.total}점 — ${compat.tier} ${compat.headline}\n#정통사주 #사주궁합 #TheScientificOracle`;
    try { await navigator.clipboard.writeText(t); flash('공유 문구를 복사했어요'); } catch { flash('복사 실패'); }
  }

  return (
    <div className="card">
      <h2>궁합 공유 카드</h2>
      <div className="meta" style={{ marginBottom: 14 }}>두 사람의 궁합 결과를 카드로 저장해 카톡·인스타에 공유하세요.</div>
      <canvas ref={ref} className="share-canvas" />
      <div className="share-actions">
        <button className="btn share-btn" onClick={share}>📤 공유하기</button>
        <button className="btn share-btn ghost" onClick={save}>💾 이미지 저장</button>
        <button className="btn share-btn ghost" onClick={copyText}>🔗 문구 복사</button>
      </div>
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

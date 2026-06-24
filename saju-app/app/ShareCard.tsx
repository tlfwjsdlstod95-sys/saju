'use client';

import { useEffect, useRef, useState } from 'react';
import type { SajuResult } from '@/lib/saju/types';

const W = 1080, H = 1350;
const OHAENG_HANJA: Record<string, string> = { 목: '木', 화: '火', 토: '土', 금: '金', 수: '水' };

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
function wrap(ctx: CanvasRenderingContext2D, text: string, maxW: number): string[] {
  const out: string[] = []; let cur = '';
  for (const ch of text) { const t = cur + ch; if (ctx.measureText(t).width > maxW && cur) { out.push(cur); cur = ch; } else cur = t; }
  if (cur) out.push(cur); return out;
}

function draw(canvas: HTMLCanvasElement, r: SajuResult) {
  const ctx = canvas.getContext('2d')!;
  canvas.width = W; canvas.height = H;
  const a = r.archetype;
  const strong = r.dayMasterStrength >= 0.55;

  // 배경 — 따뜻한 보랏빛
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#231640'); bg.addColorStop(0.6, '#150f2a'); bg.addColorStop(1, '#0a0714');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
  const g1 = ctx.createRadialGradient(W * 0.5, 430, 0, W * 0.5, 430, 560);
  g1.addColorStop(0, 'rgba(230,200,120,.18)'); g1.addColorStop(1, 'rgba(230,200,120,0)');
  ctx.fillStyle = g1; ctx.fillRect(0, 0, W, H);

  ctx.strokeStyle = 'rgba(230,200,120,0.45)'; ctx.lineWidth = 2;
  roundRect(ctx, 28, 28, W - 56, H - 56, 48); ctx.stroke();

  ctx.textAlign = 'center';
  // 상단 라벨
  ctx.fillStyle = '#bfae8a'; ctx.font = '500 30px "Noto Sans KR", sans-serif';
  ctx.fillText('나의 일간 물상', W / 2, 138);

  // 별 장식
  ctx.fillStyle = 'rgba(230,200,120,.7)';
  [[170, 210], [910, 230], [250, 360], [840, 380], [120, 520], [960, 540]].forEach(([x, y], i) => {
    ctx.beginPath(); ctx.arc(x, y, i % 2 ? 2 : 3, 0, Math.PI * 2); ctx.fill();
  });

  // 동물 이모지 (메인)
  ctx.font = '230px serif';
  ctx.fillText(a.motif.emoji, W / 2, 460);

  // 유형명
  ctx.fillStyle = '#ffffff'; ctx.font = '800 66px "Nanum Myeongjo", serif';
  let nameLines = wrap(ctx, a.motif.name, W - 200);
  if (nameLines.length > 1) { ctx.font = '800 54px "Nanum Myeongjo", serif'; nameLines = wrap(ctx, a.motif.name, W - 160); }
  const nfs = nameLines.length > 1 ? 54 : 66;
  let y = 580;
  nameLines.forEach((ln) => { ctx.fillText(ln, W / 2, y); y += nfs + 8; });
  y += 6;

  // 부제 (한 줄 캐릭터 설명)
  ctx.fillStyle = '#e6c878'; ctx.font = '500 30px "Noto Sans KR", sans-serif';
  ctx.fillText(`${r.input.name ? r.input.name + '님' : '당신'}은 "${a.title}" 타입`, W / 2, y);
  y += 56;

  // 한 줄 성격
  ctx.fillStyle = '#d7cfe6'; ctx.font = '400 34px "Noto Sans KR", sans-serif';
  wrap(ctx, a.motif.desc, W - 220).forEach((ln) => { ctx.fillText(ln, W / 2, y); y += 50; });
  y += 24;

  // 트레잇 핀 (3개)
  ctx.font = '700 30px "Noto Sans KR", sans-serif';
  const gap = 16;
  const widths = a.traits.map((t) => ctx.measureText(t).width + 44);
  const totalW = widths.reduce((s, w) => s + w, 0) + gap * (a.traits.length - 1);
  let px = (W - totalW) / 2;
  a.traits.forEach((t, i) => {
    const w = widths[i];
    ctx.fillStyle = 'rgba(230,200,120,.12)'; ctx.strokeStyle = 'rgba(230,200,120,.5)'; ctx.lineWidth = 1.5;
    roundRect(ctx, px, y - 34, w, 52, 26); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#e6c878'; ctx.textAlign = 'center';
    ctx.fillText(t, px + w / 2, y);
    px += w + gap;
  });
  y += 70;

  // 작은 사주 한 줄 (정확함 시그널, 과하지 않게)
  ctx.textAlign = 'center';
  ctx.fillStyle = '#8a82a6'; ctx.font = '400 26px "Noto Sans KR", sans-serif';
  ctx.fillText(`기운 ${r.dayMaster.ohaeng}(${OHAENG_HANJA[r.dayMaster.ohaeng]}) · ${strong ? '신강' : r.dayMasterStrength <= 0.38 ? '신약' : '중화'} · 일주 ${r.pillars.day.ganKor}${r.pillars.day.jiKor}`, W / 2, y);

  // 푸터
  ctx.fillStyle = '#ffffff'; ctx.font = '700 40px "Noto Sans KR", sans-serif';
  ctx.fillText('내 일간 물상은? 🔮', W / 2, H - 116);
  ctx.fillStyle = '#e6c878'; ctx.font = '500 28px "Noto Sans KR", sans-serif';
  ctx.fillText('헤아림 · 정밀 만세력 사주', W / 2, H - 66);
}

export default function ShareCard({ result }: { result: SajuResult }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [toast, setToast] = useState('');

  useEffect(() => {
    (async () => { try { await (document as any).fonts?.ready; } catch {} if (canvasRef.current) draw(canvasRef.current, result); })();
  }, [result]);

  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(''), 2000); };
  const getBlob = (): Promise<Blob | null> => new Promise((res) => canvasRef.current?.toBlob((b) => res(b), 'image/png') ?? res(null));

  async function save() {
    const blob = await getBlob(); if (!blob) return;
    const url = URL.createObjectURL(blob); const a = document.createElement('a');
    a.href = url; a.download = `일간물상_${result.archetype.motif.name}.png`; a.click(); URL.revokeObjectURL(url); flash('이미지를 저장했어요');
  }
  async function share() {
    const blob = await getBlob(); if (!blob) return;
    const file = new File([blob], 'saju-motif.png', { type: 'image/png' });
    const nav = navigator as any;
    if (nav.canShare && nav.canShare({ files: [file] })) {
      try { await nav.share({ files: [file], title: '내 일간 물상', text: `내 일간 물상은 "${result.archetype.motif.name}" ${result.archetype.motif.emoji}` }); return; } catch {}
    }
    save();
  }
  async function copyText() {
    const a = result.archetype;
    try { await navigator.clipboard.writeText(`내 일간 물상은 "${a.motif.name}" ${a.motif.emoji}\n${a.motif.desc}\n${a.traits.join(' ')} #일간물상`); flash('공유 문구를 복사했어요'); }
    catch { flash('복사 실패'); }
  }

  return (
    <div className="card">
      <h2>내 일간 물상</h2>
      <div className="meta" style={{ marginBottom: 14 }}>
        {result.input.name ? `${result.input.name}님` : '당신'}은 <b>{result.archetype.motif.emoji} {result.archetype.motif.name}</b>! 친구에게 공유하고 물상 맞춰보세요.
      </div>
      <canvas ref={canvasRef} className="share-canvas" />
      <div className="share-actions">
        <button className="btn share-btn" onClick={share}>📤 공유하기</button>
        <button className="btn share-btn ghost" onClick={save}>💾 이미지 저장</button>
        <button className="btn share-btn ghost" onClick={copyText}>🔗 문구 복사</button>
      </div>
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

'use client';

import { useEffect, useRef, useState } from 'react';

const W = 1080, H = 1350;

interface Sec { key: string; icon: string; label: string; title: string; body: string; }

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
function wrap(ctx: CanvasRenderingContext2D, text: string, maxW: number): string[] {
  const out: string[] = []; let cur = '';
  for (const ch of text) {
    const t = cur + ch;
    if (ctx.measureText(t).width > maxW && cur) { out.push(cur); cur = ch; } else cur = t;
  }
  if (cur) out.push(cur); return out;
}
function firstSentence(body: string): string {
  const flat = body.replace(/\n+/g, ' ').trim();
  const m = flat.match(/^[^.!?。]*[.!?。]/);
  let s = (m ? m[0] : flat).trim();
  if (s.length > 46) s = s.slice(0, 45) + '…';
  return s;
}

function draw(canvas: HTMLCanvasElement, name: string, lead: string, secs: Sec[], symbol: string) {
  const ctx = canvas.getContext('2d')!;
  canvas.width = W; canvas.height = H;

  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#1a1230'); bg.addColorStop(1, '#05030a');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
  const g1 = ctx.createRadialGradient(W * 0.5, 180, 0, W * 0.5, 180, 640);
  g1.addColorStop(0, 'rgba(155,127,212,.22)'); g1.addColorStop(1, 'rgba(155,127,212,0)');
  ctx.fillStyle = g1; ctx.fillRect(0, 0, W, H);
  const g2 = ctx.createRadialGradient(W * 0.82, H * 0.2, 0, W * 0.82, H * 0.2, 520);
  g2.addColorStop(0, 'rgba(230,200,120,.12)'); g2.addColorStop(1, 'rgba(230,200,120,0)');
  ctx.fillStyle = g2; ctx.fillRect(0, 0, W, H);

  ctx.strokeStyle = 'rgba(230,200,120,0.5)'; ctx.lineWidth = 2;
  roundRect(ctx, 28, 28, W - 56, H - 56, 44); ctx.stroke();

  ctx.textAlign = 'center';
  // 命理
  ctx.fillStyle = '#e6c878'; ctx.font = '800 60px "Nanum Myeongjo", serif';
  ctx.fillText('命理', W / 2, 150);
  ctx.fillStyle = '#8a82a6'; ctx.font = '400 26px "Noto Sans KR", sans-serif';
  ctx.fillText(name ? `${name}님 사주` : '당신의 사주', W / 2, 200);

  // 별자리 점선 장식
  ctx.fillStyle = '#9b7fd4';
  [[180, 250], [300, 290], [820, 260], [920, 320], [500, 240]].forEach(([x, y]) => {
    ctx.beginPath(); ctx.arc(x, y, 2.5, 0, Math.PI * 2); ctx.fill();
  });

  // 한 줄 정의 (메인 후킹)
  ctx.fillStyle = '#ffffff'; ctx.font = '700 52px "Nanum Myeongjo", serif';
  let lines = wrap(ctx, lead, W - 200);
  if (lines.length > 4) { ctx.font = '700 44px "Nanum Myeongjo", serif'; lines = wrap(ctx, lead, W - 180); }
  const fs = lines.length > 4 ? 44 : 52;
  let y = 380;
  lines.forEach((ln) => { ctx.fillText(ln, W / 2, y); y += fs + 16; });

  // 구분선
  y += 24;
  ctx.strokeStyle = 'rgba(230,200,120,.4)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(W / 2 - 60, y); ctx.lineTo(W / 2 + 60, y); ctx.stroke();
  y += 56;

  // 티저 섹션 3개 (essence/연애 또는 올해/돈)
  const order = ['essence', 'love', 'money', 'thisyear', 'weapon'];
  const chosen: Sec[] = [];
  for (const k of order) { const s = secs.find((x) => x.key === k); if (s && chosen.length < 3) chosen.push(s); }
  for (const s of secs) { if (chosen.length >= 3) break; if (!chosen.includes(s)) chosen.push(s); }

  ctx.textAlign = 'left';
  const lx = 120, lw = W - 240;
  for (const s of chosen) {
    ctx.fillStyle = '#e6c878'; ctx.font = '700 30px "Noto Sans KR", sans-serif';
    ctx.fillText(`${s.icon} ${s.label}`, lx, y);
    y += 46;
    ctx.fillStyle = '#efe9dc'; ctx.font = '700 32px "Nanum Myeongjo", serif';
    const tl = wrap(ctx, s.title, lw);
    for (const ln of tl.slice(0, 2)) { ctx.fillText(ln, lx, y); y += 42; }
    ctx.fillStyle = '#c7bedb'; ctx.font = '400 26px "Noto Sans KR", sans-serif';
    ctx.fillText(firstSentence(s.body), lx, y); y += 36;
    y += 28;
  }

  // 푸터 CTA
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff'; ctx.font = '700 38px "Noto Sans KR", sans-serif';
  ctx.fillText('내 사주, 선배가 이렇게 풀어줬다 →', W / 2, H - 108);
  ctx.fillStyle = '#e6c878'; ctx.font = '500 28px "Noto Sans KR", sans-serif';
  ctx.fillText('命理 · 사주, 나를 꿰뚫다', W / 2, H - 62);
}

export default function ReadingCard(
  { name, lead, sections, symbol }: { name?: string; lead: string; sections: Sec[]; symbol: string },
) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [toast, setToast] = useState('');
  useEffect(() => {
    (async () => { try { await (document as any).fonts?.ready; } catch {} if (ref.current) draw(ref.current, name || '', lead, sections, symbol); })();
  }, [name, lead, sections, symbol]);

  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(''), 2000); };
  const getBlob = (): Promise<Blob | null> => new Promise((res) => ref.current?.toBlob((b) => res(b), 'image/png') ?? res(null));

  async function save() {
    const b = await getBlob(); if (!b) return;
    const url = URL.createObjectURL(b); const a = document.createElement('a');
    a.href = url; a.download = `사주풀이_${name || '나'}.png`; a.click(); URL.revokeObjectURL(url); flash('이미지를 저장했어요');
  }
  async function share() {
    const b = await getBlob(); if (!b) return;
    const file = new File([b], 'saju-reading.png', { type: 'image/png' });
    const nav = navigator as any;
    if (nav.canShare && nav.canShare({ files: [file] })) {
      try { await nav.share({ files: [file], title: '내 사주 풀이', text: lead }); return; } catch {}
    }
    save();
  }
  async function copyText() {
    try { await navigator.clipboard.writeText(`${lead}\n\n— 命理 · 사주, 나를 꿰뚫다\n#사주 #정통사주 #사주풀이`); flash('한 줄 정의를 복사했어요'); }
    catch { flash('복사 실패'); }
  }

  return (
    <div className="card">
      <h2>풀이 공유 카드</h2>
      <div className="meta" style={{ marginBottom: 14 }}>당신의 한 줄 정의와 핵심 풀이를 담은 카드예요. 인스타·X·카톡에 공유해보세요.</div>
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

"use client";

// 한 줄 후기 받기 — 결과 페이지 맨 아래.
//
// 왜 여기인가: 풀이를 끝까지 본 사람만 도달하는 위치라 "읽지도 않고 남기는 후기"가 걸러진다.
// 왜 로그인을 요구하지 않는가: 지금 단계에선 수집량이 먼저다. 대신 서버에서
// 명식+작성자당 1행·레이트리밋·스팸 필터로 막고, 기본값이 비공개(승인제)다.
//
// 가짜 후기를 쓰지 않기로 한 이상, 마케팅에 쓸 문장은 여기서만 나온다.

import { useEffect, useState } from 'react';
import { ENGINE_VERSION } from '@/lib/saju/version';

const KEY = 'saju_review_v1:';

export default function ReviewPrompt({ chart, premium }: { chart: string | null; premium?: boolean }) {
  const [done, setDone] = useState(false);
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [body, setBody] = useState('');
  const [nickname, setNickname] = useState('');
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (!chart) return;
    try { setDone(localStorage.getItem(KEY + chart) === '1'); } catch {}
  }, [chart]);

  if (!chart) return null;

  if (done) {
    return (
      <div className="card review-card">
        <div className="review-thanks">
          <b>후기 고맙습니다.</b>
          <span>검토 후 사이트에 익명으로 실릴 수 있어요. 남겨 주신 문장이 다음 사람의 판단 기준이 됩니다.</span>
        </div>
      </div>
    );
  }

  async function submit() {
    setErr('');
    if (rating < 1) { setErr('별점을 골라 주세요.'); return; }
    if (body.trim().length < 4) { setErr('후기를 4자 이상 적어 주세요.'); return; }
    setBusy(true);
    try {
      const r = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          chart, rating, body, nickname, consent,
          tier: premium ? 'premium' : 'free',
          engine: ENGINE_VERSION,
        }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { setErr(d?.error || '잠시 후 다시 시도해 주세요.'); setBusy(false); return; }
      // 서버가 200을 주면서 saved:false 를 돌려주는 경우 = 저장소 문제.
      // '고맙습니다'만 띄우고 조용히 흘려보내면 후기가 사라지므로, 다시 시도하게 둔다.
      if (d?.saved !== true) { setErr('지금은 저장이 안 되네요. 잠시 후 다시 시도해 주세요.'); setBusy(false); return; }
      try { localStorage.setItem(KEY + chart, '1'); } catch {}
      setDone(true);
    } catch {
      setErr('네트워크가 불안정해요. 잠시 후 다시 시도해 주세요.');
    }
    setBusy(false);
  }

  return (
    <div className="card review-card">
      <h2>한 줄 후기</h2>
      <p className="meta" style={{ marginBottom: 14 }}>
        헤아림은 <b>지어낸 후기를 쓰지 않습니다.</b> 그래서 실제로 보신 분의 문장만 모아요.
        맞은 것도, 안 맞은 것도 그대로 적어 주세요. (로그인 없이 가능)
      </p>

      <div className="review-stars" role="radiogroup" aria-label="별점">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            className={`star ${(hover || rating) >= n ? 'on' : ''}`}
            onClick={() => setRating(n)}
            onMouseEnter={() => setHover(n)}
            onMouseLeave={() => setHover(0)}
            aria-label={`${n}점`}
            aria-pressed={rating === n}
          >
            ★
          </button>
        ))}
        <span className="review-rate-txt">
          {rating === 0 ? '별점을 골라 주세요' : ['','아쉬웠어요','그저 그랬어요','괜찮았어요','좋았어요','정확했어요'][rating]}
        </span>
      </div>

      <textarea
        className="review-body"
        value={body}
        maxLength={300}
        rows={3}
        placeholder="예) 일주 설명이 저랑 너무 비슷해서 놀랐어요. 대운 부분은 아직 잘 모르겠고요."
        onChange={(e) => setBody(e.target.value)}
      />
      <div className="review-row">
        <input
          className="review-nick"
          value={nickname}
          maxLength={12}
          placeholder="닉네임(선택)"
          onChange={(e) => setNickname(e.target.value)}
        />
        <span className="review-count">{body.length}/300</span>
      </div>

      <label className="chk review-consent">
        <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
        인스타그램 등 헤아림 홍보에 이 후기를 <b>닉네임만</b> 붙여 인용해도 좋아요 (선택)
      </label>

      {err && <div className="warn" style={{ marginTop: 10 }}>{err}</div>}

      <button className="btn review-submit" onClick={submit} disabled={busy}>
        {busy ? '보내는 중…' : '후기 남기기'}
      </button>
      <p className="meta review-note">
        남긴 후기는 바로 공개되지 않아요. 확인 후 사이트에 익명(또는 닉네임)으로 실립니다.
        생년월일·이름 같은 개인정보는 후기에 적지 말아 주세요.
      </p>
    </div>
  );
}

'use client';

import { useEffect, useRef, useState } from 'react';

interface Msg { role: 'user' | 'assistant'; content: string }

const SUGGESTIONS = [
  '제 성격을 한마디로 정리하면요?',
  '올해 조심해야 할 게 있을까요?',
  '저는 어떤 사람을 만나야 잘 맞아요?',
  '돈은 어떻게 버는 게 저랑 맞을까요?',
  '지금 이직/도전해도 괜찮은 시기인가요?',
];

export default function ChatPanel({
  reqBody, name, premium, onLocked,
}: {
  reqBody: () => any;
  name?: string;
  premium: boolean;
  onLocked: () => void;
}) {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [err, setErr] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const who = name ? `${name}님` : '당신';

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [msgs, streaming]);

  async function send(text: string) {
    const q = text.trim();
    if (!q || streaming) return;
    if (!premium) { onLocked(); return; }
    setErr('');
    setInput('');
    const history: Msg[] = [...msgs, { role: 'user', content: q }];
    setMsgs([...history, { role: 'assistant', content: '' }]);
    setStreaming(true);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...reqBody(), messages: history }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error ?? 'AI 상담 오류');
      }
      if (!res.body) throw new Error('스트림을 받지 못했어요.');
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let acc = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += dec.decode(value, { stream: true });
        setMsgs((m) => { const c = [...m]; c[c.length - 1] = { role: 'assistant', content: acc }; return c; });
      }
      if (!acc.trim()) {
        setMsgs((m) => { const c = [...m]; c[c.length - 1] = { role: 'assistant', content: '(답을 받지 못했어요. 다시 한 번 물어봐 주세요.)' }; return c; });
      }
    } catch (e: any) {
      setErr(e.message);
      setMsgs((m) => m.slice(0, -1)); // 빈 assistant 거품 제거
    } finally {
      setStreaming(false);
    }
  }

  return (
    <div className="card chat-card">
      <h2>🔮 AI 사주 상담 {!premium && <span className="lock-tag">프리미엄</span>}</h2>
      <div className="meta" style={{ marginBottom: 16 }}>
        {who}의 명식을 다 꿰고 있는 선배에게 직접 물어보세요. 연애·돈·진로·올해 운, 뭐든 편하게.
      </div>

      <div className="chat-window" ref={scrollRef}>
        {msgs.length === 0 && (
          <div className="chat-empty">
            <div className="chat-empty-mark">✦</div>
            <p>무엇이든 물어보세요. {who}의 사주를 근거로 답해드릴게요.</p>
          </div>
        )}
        {msgs.map((m, i) => (
          <div key={i} className={`bubble-row ${m.role}`}>
            {m.role === 'assistant' && <div className="chat-ava">선배</div>}
            <div className={`bubble ${m.role}`}>
              {m.content
                ? m.content.split('\n').map((line, j) => <p key={j}>{line || ' '}</p>)
                : <span className="typing"><i /><i /><i /></span>}
            </div>
          </div>
        ))}
      </div>

      {err && <div className="warn" style={{ marginTop: 12 }}>{err}</div>}

      <div className="chat-suggest">
        {SUGGESTIONS.map((s) => (
          <button key={s} className="suggest-chip" onClick={() => send(s)} disabled={streaming}>{s}</button>
        ))}
      </div>

      <form
        className="chat-input"
        onSubmit={(e) => { e.preventDefault(); send(input); }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={premium ? '궁금한 걸 물어보세요…' : '🔒 잠금 해제하면 상담을 시작할 수 있어요'}
          disabled={streaming}
        />
        <button type="submit" className="chat-send" disabled={streaming || !input.trim()}>
          {streaming ? '…' : '보내기'}
        </button>
      </form>
    </div>
  );
}

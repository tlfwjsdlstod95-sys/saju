'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { listProfiles, type Profile } from '@/lib/profiles';
import type { SajuResult } from '@/lib/saju/types';
import type { CompatResult } from '@/lib/saju/compatibility';
import { parseReadingStream, GUNGHAP_KEYS, GUNGHAP_ICONS, GUNGHAP_LABELS } from '@/lib/saju/readingMeta';
import GunghapCard from '../GunghapCard';
import Paywall, { usePremium } from '../Paywall';
import { CITY_GROUPS, CITIES } from '../cities';
import AccountButton from '../AccountButton';

const OHAENG_COLOR: Record<string, string> = {
  목: '#22c55e', 화: '#ef4444', 토: '#eab308', 금: '#e2e8f0', 수: '#3b82f6',
};
// 출생 도시는 app/cities.ts 공용 목록 사용 (메인과 동일 60여 개)

type P = { name: string; year: string; month: string; day: string; hour: string; minute: string; city: string; unknownTime: boolean; sex: 'M' | 'F' };
const empty = (sex: 'M' | 'F'): P => ({ name: '', year: '', month: '', day: '', hour: '', minute: '0', city: '서울', unknownTime: false, sex });

// 초대 링크 페이로드 — URL 해시(#p=)에 담아 서버 로그에 남지 않게 (UTF-8 안전 base64)
function encodeP(p: P): string { return btoa(unescape(encodeURIComponent(JSON.stringify(p)))); }
function decodeP(s: string): P | null {
  try {
    const o = JSON.parse(decodeURIComponent(escape(atob(decodeURIComponent(s)))));
    if (!o || !o.year) return null;
    return { ...empty('F'), ...o };
  } catch { return null; }
}

function profileToP(prof: Profile): P {
  return { name: prof.name, year: String(prof.year), month: String(prof.month), day: String(prof.day), hour: prof.hour === null ? '' : String(prof.hour), minute: String(prof.minute), city: prof.city, unknownTime: prof.unknownTime, sex: prof.sex };
}

function PersonForm({ p, set, idx, profiles, onPick }: { p: P; set: (k: string, v: any) => void; idx: number; profiles: Profile[]; onPick: (prof: Profile) => void }) {
  return (
    <div className="card">
      <h2>{idx === 0 ? '나' : '상대방'}</h2>
      {profiles.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <label>보관함에서 불러오기</label>
          <select value="" onChange={(e) => { const f = profiles.find((x) => x.id === e.target.value); if (f) onPick(f); }}>
            <option value="">— 저장한 사주 선택 —</option>
            {profiles.map((pr) => <option key={pr.id} value={pr.id}>{pr.summary?.emoji ?? '🔮'} {pr.name} ({pr.year}.{pr.month}.{pr.day})</option>)}
          </select>
        </div>
      )}
      <div className="form-grid">
        <div><label>이름(선택)</label><input value={p.name} placeholder={idx === 0 ? '나' : '상대'} onChange={(e) => set('name', e.target.value)} /></div>
        <div><label>연도(양력)</label><input type="number" value={p.year} onChange={(e) => set('year', e.target.value)} /></div>
        <div><label>월</label><input type="number" value={p.month} onChange={(e) => set('month', e.target.value)} /></div>
        <div><label>일</label><input type="number" value={p.day} onChange={(e) => set('day', e.target.value)} /></div>
        <div><label>시 (0~23)</label><input type="number" value={p.hour} disabled={p.unknownTime} onChange={(e) => set('hour', e.target.value)} /></div>
        <div><label>출생도시</label>
          <select value={p.city} onChange={(e) => set('city', e.target.value)}>
            {CITY_GROUPS.map((g) => (
              <optgroup key={g.region} label={g.region}>
                {Object.keys(g.cities).map((c) => <option key={c} value={c}>{c}</option>)}
              </optgroup>
            ))}
          </select>
        </div>
      </div>
      <div className="row">
        <label className="chk"><input type="checkbox" checked={p.unknownTime} onChange={(e) => set('unknownTime', e.target.checked)} /> 시간 모름</label>
        <label className="chk"><input type="radio" checked={p.sex === 'M'} onChange={() => set('sex', 'M')} /> 남</label>
        <label className="chk"><input type="radio" checked={p.sex === 'F'} onChange={() => set('sex', 'F')} /> 여</label>
      </div>
    </div>
  );
}

function MiniMyeongsik({ s, name }: { s: SajuResult; name: string }) {
  const ps = [s.pillars.hour, s.pillars.day, s.pillars.month, s.pillars.year];
  return (
    <div>
      <div style={{ fontSize: 13, color: '#94a3b8', marginBottom: 8 }}>{name || '—'} · {s.archetype.symbol} {s.archetype.title}</div>
      <div style={{ display: 'flex', gap: 8 }}>
        {ps.map((p, i) => (
          <div key={i} style={{ flex: 1, textAlign: 'center', background: '#0b1220', border: '1px solid #334155', borderRadius: 10, padding: '8px 0' }}>
            {p ? <>
              <div style={{ fontSize: 22, fontWeight: 700, color: OHAENG_COLOR[p.ganOhaeng] }}>{p.ganHanja}</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: OHAENG_COLOR[p.jiOhaeng] }}>{p.jiHanja}</div>
            </> : <div style={{ fontSize: 22, color: '#475569' }}>—</div>}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Gunghap() {
  const [a, setA] = useState<P>(empty('M'));
  const [b, setB] = useState<P>(empty('F'));
  const [res, setRes] = useState<{ a: SajuResult; b: SajuResult; compat: CompatResult } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [ai, setAi] = useState<{ lead: string; sections: any[] } | null>(null);
  const [aiStreaming, setAiStreaming] = useState(false);
  const [aiErr, setAiErr] = useState('');
  const [premium, unlock] = usePremium();
  const [payOpen, setPayOpen] = useState(false);
  const [pendingAi, setPendingAi] = useState(false);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  useEffect(() => {
    setProfiles(listProfiles());
    const onSync = () => setProfiles(listProfiles());
    window.addEventListener('saju:synced', onSync);
    return () => window.removeEventListener('saju:synced', onSync);
  }, []);
  const [notice, setNotice] = useState('');
  const [fromInvite, setFromInvite] = useState<string | null>(null);

  // 초대 특전: ?invite=1 로 유입 + 미사용이면 AI 궁합 심층 풀이 1회 무료 (바이럴 루프 인센티브)
  const [inviteFree, setInviteFree] = useState(false);
  useEffect(() => {
    try {
      const sp = new URLSearchParams(window.location.search);
      if (sp.get('invite') && !localStorage.getItem('saju_gh_invite_used_v1')) setInviteFree(true);
      // 초대 링크 페이로드: 보낸 사람 정보를 '상대방' 칸에 자동 입력
      const m = window.location.hash.match(/#p=([^&]+)/);
      if (m) {
        const d = decodeP(m[1]);
        if (d) { setB({ ...d, name: d.name || '상대' }); setFromInvite(d.name || '상대'); }
      }
    } catch {}
  }, []);

  function onGunghapAiClick() {
    if (premium) { askGunghapAI(); return; }
    if (inviteFree) {
      try { localStorage.setItem('saju_gh_invite_used_v1', '1'); } catch {}
      setInviteFree(false);
      askGunghapAI();
      return;
    }
    setPendingAi(true); setPayOpen(true);
  }
  function handleUnlock() { unlock(); setPayOpen(false); if (pendingAi) { setPendingAi(false); askGunghapAI(); } }

  // 상대 정보 없이도 궁합: 내 정보만 담은 링크를 만들어 보낸다 (진짜 바이럴 루프)
  function copyPairLink() {
    if (!a.year || !a.month || !a.day) { setError("링크를 만들려면 먼저 위 '나' 칸에 내 정보부터 입력하세요."); return; }
    setError('');
    const url = `${window.location.origin}/gunghap?invite=1#p=${encodeURIComponent(encodeP(a))}`;
    navigator.clipboard.writeText(`우리 궁합 몇 점인지 볼래?ㅋㅋ 내 정보는 미리 넣어놨어 — 너는 네 것만 입력하면 바로 나와 💞 (AI 심층 궁합도 1번 무료) ${url}`)
      .then(() => setNotice('초대 문구를 복사했어요 — 카톡에 붙여넣어 보내세요!'))
      .catch(() => setNotice('복사 실패 — 주소창의 링크를 직접 공유해주세요.'));
    setTimeout(() => setNotice(''), 4000);
  }

  const body = (p: P) => ({
    name: p.name,
    year: +p.year, month: +p.month, day: +p.day,
    hour: p.unknownTime || p.hour === '' ? null : +p.hour, minute: +p.minute,
    unknownTime: p.unknownTime || p.hour === '', longitude: CITIES[p.city], sex: p.sex,
  });

  async function askGunghapAI() {
    setAiErr(''); setAiStreaming(true); setAi({ lead: '', sections: [] });
    try {
      const r = await fetch('/api/gunghap-reading', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ a: body(a), b: body(b) }) });
      if (!r.ok) { const d = await r.json().catch(() => ({})); throw new Error(d.error ?? 'AI 궁합 오류'); }
      if (!r.body) throw new Error('스트림 없음');
      const reader = r.body.getReader(); const dec = new TextDecoder(); let acc = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += dec.decode(value, { stream: true });
        setAi(parseReadingStream(acc, GUNGHAP_KEYS, GUNGHAP_ICONS, GUNGHAP_LABELS));
      }
      setAi(parseReadingStream(acc, GUNGHAP_KEYS, GUNGHAP_ICONS, GUNGHAP_LABELS));
    } catch (e: any) { setAiErr(e.message); setAi(null); }
    finally { setAiStreaming(false); }
  }

  async function submit() {
    setError(''); setRes(null); setAi(null); setAiErr('');
    if (!a.year || !a.month || !a.day || !b.year || !b.month || !b.day) { setError('두 사람의 생년월일을 입력하세요.'); return; }
    setLoading(true);
    try {
      const r = await fetch('/api/gunghap', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ a: body(a), b: body(b) }) });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error);
      setRes(data);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }

  const ring = res ? `conic-gradient(${res.compat.total >= 75 ? '#22c55e' : res.compat.total >= 60 ? '#eab308' : '#ef4444'} ${res.compat.total * 3.6}deg, #1e293b 0deg)` : '';

  return (
    <main className="wrap">
      <div className="hero">
        <h1>사주 <span>궁합</span></h1>
        <p>천간합·지지 육합/삼합·오행 보완으로 보는 두 사람의 상성</p>
        <Link href="/" className="backlink">← 내 사주 분석으로</Link>
      </div>

      {fromInvite && (
        <div className="card" style={{ borderColor: 'var(--gold)' }}>
          <div className="meta">💌 <b>{fromInvite}</b>님이 궁합 정보를 보내왔어요 — &lsquo;상대방&rsquo; 칸에 이미 채워져 있어요. <b>내 정보만 입력</b>하고 궁합 분석을 누르면 끝!</div>
        </div>
      )}
      <PersonForm p={a} idx={0} profiles={profiles} onPick={(pr) => setA(profileToP(pr))} set={(k, v) => setA((s) => ({ ...s, [k]: v }))} />
      <div className="card" style={{ textAlign: 'center' }}>
        <div className="meta" style={{ marginBottom: 12 }}>상대방 생일을 몰라도 돼요 — <b>내 정보만 넣고 링크를 보내면</b>, 상대가 자기 정보를 입력하는 순간 둘의 궁합이 완성됩니다.</div>
        <button className="btn share-btn ghost" onClick={copyPairLink} style={{ width: 'auto' }}>🔗 내 정보 담은 궁합 링크 복사</button>
        {notice && <div className="meta" style={{ marginTop: 10, color: 'var(--gold)' }}>{notice}</div>}
      </div>

      <PersonForm p={b} idx={1} profiles={profiles} onPick={(pr) => setB(profileToP(pr))} set={(k, v) => setB((s) => ({ ...s, [k]: v }))} />
      <button className="btn" onClick={submit} disabled={loading}>{loading ? '두 사주를 비교하는 중…' : '💞 궁합 분석하기'}</button>
      {error && <div className="warn error" style={{ marginTop: 16 }}>{error}</div>}

      {res && (
        <>
          <div className="card" style={{ textAlign: 'center', marginTop: 22 }}>
            <div className="score-ring" style={{ background: ring }}>
              <div className="score-inner">
                <div className="score-num">{res.compat.total}</div>
                <div className="score-unit">점</div>
              </div>
            </div>
            <div className="tier">{res.compat.tier}</div>
            <div className="headline">{res.compat.headline}</div>
          </div>

          <div className="card reading">
            <h2>AI 궁합 풀이</h2>
            {!ai && (
              <div className="ai-cta">
                <div className="ai-cta-txt"><b>💞 AI 궁합 심층 풀이 {!premium && (inviteFree ? <span className="lock-tag">🎁 초대 특전 1회 무료</span> : <span className="lock-tag">프리미엄</span>)}</b><span>{inviteFree && !premium ? '친구 초대로 오셨네요! AI 심층 궁합 풀이 1회가 무료예요.' : '두 사람의 명식을 AI가 연애 고수 선배처럼 풀어드려요. (소름 주의)'}</span></div>
                <button className="btn ai-btn" onClick={onGunghapAiClick} disabled={aiStreaming}>{premium ? 'AI로 궁합 풀기 →' : inviteFree ? '🎁 무료로 AI 궁합 풀기 →' : '🔒 잠금 해제하고 AI로 풀기'}</button>
                {aiErr && <div className="warn" style={{ marginTop: 12 }}>{aiErr}</div>}
              </div>
            )}
            {ai && (
              <>
                <div className="ai-switch">
                  <span>{aiStreaming ? '● 선배가 두 사람을 보는 중…' : '✨ AI 궁합 풀이'}</span>
                  {!aiStreaming && <button className="mini-btn" onClick={() => setAi(null)}>닫기</button>}
                </div>
                {ai.lead && <p className="lead-quote" style={{ fontSize: 21, margin: '6px 0 20px' }}>{ai.lead}{aiStreaming && !ai.sections.length && <span className="caret" />}</p>}
                {ai.sections.length === 0 && !ai.lead && <div className="read-wait">✍️ 두 사람의 명식을 읽는 중…<span className="caret" /></div>}
                {ai.sections.map((it: any, i: number) => {
                  const isLast = aiStreaming && i === ai.sections.length - 1;
                  const paras = String(it.body).split('\n\n');
                  return (
                    <section className="read-sec" key={it.key}>
                      <div className="read-head"><span className="read-num">{i + 1}</span><div><div className="read-label">{it.icon} {it.label}</div><div className="read-title">{it.title || <span className="caret" />}</div></div></div>
                      <div className="read-body">{paras.map((p: string, j: number) => <p key={j}>{p}{isLast && j === paras.length - 1 && <span className="caret" />}</p>)}</div>
                    </section>
                  );
                })}
              </>
            )}
          </div>

          <div className="card">
            <h2>두 사람의 명식</h2>
            <div style={{ display: 'grid', gap: 18 }}>
              <MiniMyeongsik s={res.a} name={a.name || '나'} />
              <MiniMyeongsik s={res.b} name={b.name || '상대방'} />
            </div>
          </div>

          <div className="card">
            <h2>항목별 상성</h2>
            {res.compat.items.map((it, i) => (
              <div key={i} style={{ marginBottom: 18 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, marginBottom: 6 }}>
                  <b>{it.label}</b><span style={{ color: '#22c55e' }}>{it.score}/{it.max}</span>
                </div>
                <div className="bar-track"><div className="bar-fill" style={{ width: `${(it.score / it.max) * 100}%` }} /></div>
                <div style={{ fontSize: 13, color: '#94a3b8', marginTop: 6 }}>{it.comment}</div>
              </div>
            ))}
          </div>

          <div className="card">
            <h2>강점 & 주의</h2>
            <div style={{ marginBottom: 12 }}>
              {res.compat.strengths.map((s, i) => <div key={i} className="point good">＋ {s}</div>)}
            </div>
            <div>
              {res.compat.cautions.map((s, i) => <div key={i} className="point warnp">! {s}</div>)}
            </div>
          </div>

          <GunghapCard a={res.a} b={res.b} compat={res.compat} nameA={a.name} nameB={b.name} />

          <button className="btn ghost-btn" onClick={() => { setRes(null); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>다른 궁합 보기</button>
        </>
      )}

      <div className="account-inline">
        <AccountButton />
      </div>

      <div className="foot">결과는 명리학적 상성 참고용이며, 실제 관계는 두 사람의 노력으로 만들어집니다.</div>
      <Paywall open={payOpen} onClose={() => setPayOpen(false)} onUnlock={handleUnlock} />
    </main>
  );
}

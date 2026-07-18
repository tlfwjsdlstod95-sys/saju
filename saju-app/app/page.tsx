'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import type { SajuResult, Pillar, LuckPillar } from '@/lib/saju/types';
import { parseReadingStream } from '@/lib/saju/readingMeta';
import { lunarToSolar, solarToLunar } from '@/lib/saju/lunar';
import { computeHapchung } from '@/lib/saju/hapchung';
import ShareCard from './ShareCard';
import TalismanCard from './TalismanCard';
import ReadingCard from './ReadingCard';
import DailyFortune from './DailyFortune';
import YearlyFortune from './YearlyFortune';
import AuspiciousDates from './AuspiciousDates';
import GaeunCard from './GaeunCard';
import ChatPanel from './ChatPanel';
import NamingCard from './NamingCard';
import Receipts from './Receipts';
import GuidebookPrint from './GuidebookPrint';
import Paywall, { usePremium } from './Paywall';
import AccountButton from './AccountButton';
import { listProfiles, saveProfile, removeProfile, type Profile } from '@/lib/profiles';

const OHAENG_COLOR: Record<string, string> = {
  목: '#22c55e', 화: '#ef4444', 토: '#eab308', 금: '#e2e8f0', 수: '#3b82f6',
};

// 지역별 도시 경도 프리셋 (시도 광역 단위로 그룹화)
const CITY_GROUPS: { region: string; cities: Record<string, number> }[] = [
  { region: '서울·경기·인천', cities: {
    '서울': 126.978, '인천': 126.705, '수원': 127.029, '성남': 127.138, '용인': 127.178,
    '고양': 126.832, '부천': 126.766, '안양': 126.957, '평택': 127.113, '의정부': 127.045,
    '파주': 126.780, '김포': 126.716, '안산': 126.832, '시흥': 126.803, '남양주': 127.216, '이천': 127.442,
  } },
  { region: '강원', cities: { '춘천': 127.734, '원주': 127.920, '강릉': 128.896, '속초': 128.591, '동해': 129.114, '태백': 128.986, '삼척': 129.165, '홍천': 127.889, '횡성': 127.985, '영월': 128.462 } },
  { region: '충청·대전·세종', cities: {
    '대전': 127.385, '세종': 127.289, '천안': 127.114, '청주': 127.489, '충주': 127.926, '아산': 127.004, '서산': 126.450,
    '제천': 128.191, '공주': 127.119, '논산': 127.099, '당진': 126.646, '보령': 126.613,
  } },
  { region: '경상·부산·대구·울산', cities: {
    '부산': 129.075, '대구': 128.601, '울산': 129.311, '창원': 128.681, '김해': 128.889, '진주': 128.107,
    '포항': 129.365, '경주': 129.225, '안동': 128.727, '구미': 128.344, '통영': 128.433,
    '거제': 128.621, '양산': 129.037, '경산': 128.741, '상주': 128.159, '문경': 128.187,
  } },
  { region: '전라·광주', cities: {
    '광주': 126.851, '전주': 127.148, '목포': 126.392, '여수': 127.662, '순천': 127.487, '군산': 126.737, '익산': 126.957, '남원': 127.390,
    '정읍': 126.856, '나주': 126.711, '광양': 127.696, '김제': 126.881,
  } },
  { region: '제주', cities: { '제주': 126.531, '서귀포': 126.560 } },
];
// 경도 조회용 평탄화 맵
const CITIES: Record<string, number> = Object.assign({}, ...CITY_GROUPS.map((g) => g.cities));

function scoreColor(s: number): string {
  return s >= 20 ? '#22c55e' : s <= -20 ? '#ef4444' : '#eab308';
}

// 대운/세운 운세 흐름 그래프 (SVG)
function LuckGraph({ items, mode, nowYear }: { items: LuckPillar[]; mode: 'age' | 'year'; nowYear?: number }) {
  const W = 820, H = 250, padX = 38, padTop = 26, padBot = 64;
  const innerW = W - padX * 2, innerH = H - padTop - padBot, mid = padTop + innerH / 2;
  const n = items.length;
  const x = (i: number) => padX + (n === 1 ? innerW / 2 : (innerW * i) / (n - 1));
  const y = (s: number) => mid - (s / 100) * (innerH / 2);
  const line = items.map((d, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(d.score).toFixed(1)}`).join(' ');
  const area = `${line} L${x(n - 1).toFixed(1)},${mid} L${x(0).toFixed(1)},${mid} Z`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="luck-svg" role="img">
      <defs>
        <linearGradient id="luckArea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#22c55e" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#22c55e" stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* 길/흉 영역 가이드 */}
      <line x1={padX} y1={mid} x2={W - padX} y2={mid} stroke="#475569" strokeDasharray="4 4" />
      <text x={padX - 6} y={padTop + 8} fill="#22c55e" fontSize="11" textAnchor="end">길</text>
      <text x={padX - 6} y={H - padBot} fill="#ef4444" fontSize="11" textAnchor="end">흉</text>
      <path d={area} fill="url(#luckArea)" />
      <path d={line} fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinejoin="round" />
      {items.map((d, i) => {
        const isNow = mode === 'year' && nowYear !== undefined && d.year === nowYear;
        return (
          <g key={i}>
            {isNow && <line x1={x(i)} y1={padTop - 6} x2={x(i)} y2={H - padBot + 30} stroke="#3b82f6" strokeWidth="1" strokeDasharray="3 3" />}
            <circle cx={x(i)} cy={y(d.score)} r={isNow ? 6 : 4.5} fill={scoreColor(d.score)} stroke="#0f172a" strokeWidth="1.5" />
            <text x={x(i)} y={H - padBot + 22} fill="#e2e8f0" fontSize="17" fontWeight="700" textAnchor="middle">{d.ganHanja}{d.jiHanja}</text>
            <text x={x(i)} y={H - padBot + 40} fill="#94a3b8" fontSize="11" textAnchor="middle">{d.ganKor}{d.jiKor}</text>
            <text x={x(i)} y={H - padBot + 56} fill={isNow ? '#60a5fa' : '#64748b'} fontSize="11" textAnchor="middle">
              {mode === 'age' ? `${d.age}세` : `${d.year}`}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// 천문 정밀 분석 로딩 연출
function Analyzing({ corr }: { corr: string }) {
  const steps = [
    '출생 시각 → 진태양시(眞太陽時) 변환',
    `출생지 경도 보정 ${corr}`,
    '24절기 태양황경 계산 · 균시차 보정',
    '사주팔자 년·월·일·시 도출',
    '오행·십신·신살 정밀 분석',
  ];
  const [n, setN] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setN((v) => (v < steps.length ? v + 1 : v)), 360);
    return () => clearInterval(id);
  }, []); // eslint-disable-line
  return (
    <div className="analyzing-overlay">
      <div className="analyzing-card">
        <svg className="orbit" viewBox="0 0 120 120" width="110" height="110">
          <circle cx="60" cy="60" r="52" fill="none" stroke="#2c2444" strokeWidth="1" />
          <circle cx="60" cy="60" r="38" fill="none" stroke="#2c2444" strokeWidth="1" />
          <circle cx="60" cy="60" r="24" fill="none" stroke="#2c2444" strokeWidth="1" />
          <g className="orbit-spin">
            <circle cx="60" cy="8" r="4" fill="#e6c878" />
            <circle cx="112" cy="60" r="2.5" fill="#9b7fd4" />
          </g>
          <circle cx="60" cy="60" r="6" fill="#e6c878" />
        </svg>
        <div className="analyzing-title">天文 정밀 분석 중</div>
        <ul className="analyzing-steps">
          {steps.map((s, i) => (
            <li key={i} className={i < n ? 'done' : i === n ? 'active' : ''}>
              <span className="step-mark">{i < n ? '✓' : '·'}</span>{s}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function GzCell({ pos, p }: { pos: string; p: Pillar | null }) {
  if (!p) return (
    <div className="gz-cell"><div className="pos">{pos}</div><div className="char">—</div><div className="sub">시간 미상</div></div>
  );
  return (
    <div className="gz-cell">
      <div className="pos">{pos}</div>
      <div className="char" style={{ color: OHAENG_COLOR[p.ganOhaeng] }}>{p.ganHanja}</div>
      <div className="sub">{p.ganKor} · {p.ganSipsin ?? '일간(나)'}</div>
      <div className="char" style={{ color: OHAENG_COLOR[p.jiOhaeng], marginTop: 6 }}>{p.jiHanja}</div>
      <div className="sub">{p.jiKor} · {p.jiSipsin}</div>
    </div>
  );
}

export default function Home() {
  const [form, setForm] = useState({
    name: '', year: '', month: '', day: '', hour: '', minute: '0',
    city: '서울', unknownTime: false, sex: 'M' as 'M' | 'F',
    calType: 'solar' as 'solar' | 'lunar', isLeapMonth: false,
    jasiMode: 'yaja' as 'yaja' | 'jeongja', // 자시 학파 (23시대 출생 시에만 노출)
  });
  const [result, setResult] = useState<SajuResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [ai, setAi] = useState<{ lead: string; sections: any[] } | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiStreaming, setAiStreaming] = useState(false);
  const [aiErr, setAiErr] = useState('');
  const [premium, unlock] = usePremium();
  const [payOpen, setPayOpen] = useState(false);
  const [pendingAi, setPendingAi] = useState(false);
  // 풀이 톤(문체) — default 선배 톤 / blunt 팩폭 / warm 따뜻한 상담
  const [tone, setTone] = useState<'default' | 'blunt' | 'warm'>('default');

  // 무료는 결과와 함께 AI 풀이가 자동 생성됨. 이 버튼은 '프리미엄 심층(Sonnet) 재생성'.
  function onAiClick() { if (premium) askAI('premium'); else { setPendingAi(true); setPayOpen(true); } }
  function handleUnlock() { unlock(); setPayOpen(false); if (pendingAi) { setPendingAi(false); askAI('premium'); } }

  const set = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }));

  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [notice, setNotice] = useState('');
  useEffect(() => {
    setProfiles(listProfiles());
    const onSync = () => setProfiles(listProfiles()); // 로그인·다른기기 동기화 후 갱신
    window.addEventListener('saju:synced', onSync);
    return () => window.removeEventListener('saju:synced', onSync);
  }, []);
  const flash = (m: string) => { setNotice(m); setTimeout(() => setNotice(''), 2000); };

  const reqBody = (override?: { year: number; month: number; day: number }) => ({
    tone, // 풀이·상담 말투 (api/saju 등에선 무시됨)
    jasiMode: form.jasiMode,
    name: form.name,
    year: override?.year ?? +form.year, month: override?.month ?? +form.month, day: override?.day ?? +form.day,
    hour: form.unknownTime ? null : (form.hour === '' ? null : +form.hour),
    minute: +form.minute,
    unknownTime: form.unknownTime || form.hour === '',
    longitude: CITIES[form.city],
    sex: form.sex,
  });

  // 같은 명식이면 AI 풀이를 재호출하지 않도록 캐시 키 (브라우저 localStorage)
  const chartKey = (b: any, tier: string, tn: string) =>
    `saju_ai_v1:${b.year}-${b.month}-${b.day}-${b.hour}-${b.minute}-${b.sex}-${Math.round((b.longitude || 126.978) * 100)}-${(b.name || '').trim()}-${b.jasiMode || 'yaja'}:${tier}:${tn}`;

  async function runAnalysis(bodyObj: any) {
    setError(''); setResult(null); setAi(null); setAiErr('');
    setLoading(true);
    const started = Date.now();
    try {
      const res = await fetch('/api/saju', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(bodyObj) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? '오류');
      const elapsed = Date.now() - started;
      if (elapsed < 2000) await sleep(2000 - elapsed); // 정밀 분석 연출 최소 노출
      setResult(data);
      // 비용 원칙: AI 실시간 호출은 결제 사용자만. 무료는 규칙 엔진 풀이 즉시 표시(API 0원).
      // 프리미엄이면 심층 풀이 자동 생성(명식+톤별 캐시라 재방문 0원).
      if (premium) askAI('premium', bodyObj);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }

  function validateForm(): string | null {
    if (!form.year || !form.month || !form.day) return '생년월일을 입력하세요.';
    const y = +form.year, m = +form.month, d = +form.day;
    if (!Number.isInteger(y) || y < 1900 || y > 2100) return '연도는 1900~2100 사이로 입력하세요.';
    if (!Number.isInteger(m) || m < 1 || m > 12) return '월은 1~12 사이로 입력하세요.';
    if (!Number.isInteger(d) || d < 1 || d > 31) return '일은 1~31 사이로 입력하세요.';
    if (!form.unknownTime && form.hour !== '') {
      const h = +form.hour;
      if (!Number.isInteger(h) || h < 0 || h > 23) return '시는 0~23 사이로 입력하세요.';
    }
    if (!form.unknownTime && form.minute !== '') {
      const mi = +form.minute;
      if (!Number.isInteger(mi) || mi < 0 || mi > 59) return '분은 0~59 사이로 입력하세요.';
    }
    return null;
  }

  function submit() {
    const err = validateForm();
    if (err) { setError(err); return; }
    if (form.calType === 'lunar') {
      const r = lunarToSolar(+form.year, +form.month, +form.day, form.isLeapMonth);
      if (!r.ok) { setError(r.error); return; }
      const s = r.solar;
      // 변환된 양력으로 폼을 갱신(이후 AI/궁합/운세 호출도 모두 양력 사용)
      setForm((f) => ({ ...f, calType: 'solar', isLeapMonth: false, year: String(s.year), month: String(s.month), day: String(s.day) }));
      flash(`음력 ${form.year}.${form.month}.${form.day}${form.isLeapMonth ? '(윤달)' : ''} → 양력 ${s.year}.${String(s.month).padStart(2, '0')}.${String(s.day).padStart(2, '0')}`);
      runAnalysis(reqBody({ year: s.year, month: s.month, day: s.day }));
      return;
    }
    runAnalysis(reqBody());
  }

  function saveCurrent() {
    if (!result) return;
    setProfiles(saveProfile({
      name: form.name || '이름없음',
      year: +form.year, month: +form.month, day: +form.day,
      hour: form.unknownTime || form.hour === '' ? null : +form.hour, minute: +form.minute,
      city: form.city, sex: form.sex, unknownTime: form.unknownTime || form.hour === '',
      summary: { emoji: result.archetype.motif.emoji, motif: result.archetype.motif.name, ilju: result.pillars.day.ganKor + result.pillars.day.jiKor },
    }));
    flash('보관함에 저장했어요');
  }

  function loadProfile(p: Profile) {
    setForm({ name: p.name, year: String(p.year), month: String(p.month), day: String(p.day), hour: p.hour === null ? '' : String(p.hour), minute: String(p.minute), city: p.city, unknownTime: p.unknownTime, sex: p.sex, calType: 'solar', isLeapMonth: false, jasiMode: 'yaja' });
    runAnalysis({ name: p.name, year: p.year, month: p.month, day: p.day, hour: p.unknownTime ? null : p.hour, minute: p.minute, unknownTime: p.unknownTime, longitude: CITIES[p.city] ?? 126.978, sex: p.sex });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function deleteProfile(id: string) { setProfiles(removeProfile(id)); }

  // 궁합 초대 문구 복사 — CAC 0원 바이럴 루프
  async function copyInviteLink() {
    const who = result?.archetype?.motif?.name;
    try {
      await navigator.clipboard.writeText(`나 사주 봤는데 완전 소름이야${who ? ` (나 "${who}"래ㅋㅋ)` : ''}. 우리 궁합도 볼래? 이 링크로 오면 AI 심층 궁합도 1번 무료래 👉 ${window.location.origin}/gunghap?invite=1`);
      flash('초대 문구를 복사했어요 — 붙여넣어 보내세요!');
    } catch { flash('복사 실패'); }
  }

  async function askAI(tier: 'free' | 'premium' = 'free', bodyObj?: any, toneArg?: 'default' | 'blunt' | 'warm') {
    const tn = toneArg ?? tone;
    const base = bodyObj ?? reqBody();
    const key = chartKey(base, tier, tn);
    // 캐시 확인 — 같은 명식 같은 티어면 재호출 없이 즉시 표시
    try {
      const cached = typeof window !== 'undefined' ? localStorage.getItem(key) : null;
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed?.sections?.length) { setAi(parsed); setAiErr(''); setAiLoading(false); setAiStreaming(false); return; }
      }
    } catch {}
    setAiErr(''); setAiLoading(true); setAiStreaming(true);
    setAi({ lead: '', sections: [] });
    try {
      const res = await fetch('/api/reading', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...base, tier, tone: tn }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error ?? 'AI 풀이 오류');
      }
      if (!res.body) throw new Error('스트림을 받지 못했어요.');
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let acc = '';
      setAiLoading(false); // 첫 응답 도착 → 스트리밍 UI로
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += dec.decode(value, { stream: true });
        setAi(parseReadingStream(acc));
      }
      const final = parseReadingStream(acc);
      setAi(final);
      try { if (final.sections.length) localStorage.setItem(key, JSON.stringify(final)); } catch {}
    } catch (e: any) { setAiErr(e.message); setAi(null); }
    finally { setAiLoading(false); setAiStreaming(false); }
  }

  const maxOhaeng = result ? Math.max(...(['목','화','토','금','수'] as const).map((o) => (result.ohaeng as any)[o])) : 1;
  const gmp = result?.advanced.gongmang.pillars;
  const gmPos = gmp ? ([gmp.year && '년', gmp.month && '월', gmp.day && '일', gmp.hour && '시'].filter(Boolean) as string[]) : undefined;
  const hapchung = result ? computeHapchung(result.pillars, gmPos) : [];
  const lunarBirth = result ? solarToLunar(result.input.year, result.input.month, result.input.day) : null;

  return (
    <main className="wrap">
      <div className="hero">
        <div className="brand-name">헤아림</div>
        <div className="hero-kr">命理</div>
        <h1>사주, <span>나를 꿰뚫다</span></h1>
        <p>틀린 사주로 인생을 정할 순 없으니까 — 천문 데이터로 계산한 진짜 명식 위에서, 인생의 결정을 돕습니다</p>
      </div>

      <div className="trust">
        <div className="trust-badges">
          <span className="tb">⚙ VSOP87 천문 알고리즘</span>
          <span className="tb">🛰 한국천문연구원(KASI) 기준 검증</span>
          <span className="tb">◷ 절기·균시차·경도·야자시 보정</span>
          <span className="tb">◎ 일주 정밀도 99.999%</span>
          <span className="tb">🧪 만세력 1,000건 교차 검증 통과</span>
        </div>
        <p className="trust-sub">대부분의 무료 만세력이 놓치는 진태양시·야자시·서머타임까지 보정해, 역술가가 직접 뽑은 명식과 일치합니다.</p>
      </div>

      {loading && <Analyzing corr={`${(((CITIES[form.city] ?? 126.978) - 135) * 4).toFixed(1)}분`} />}

      <div className="card">
        <h2>생년월일시 입력</h2>
        <div style={{ marginBottom: 14 }}><label>이름 (선택 · 풀이에 반영)</label><input value={form.name} onChange={(e) => set('name', e.target.value)} /></div>
        <div className="cal-toggle">
          <button type="button" className={form.calType === 'solar' ? 'on' : ''} onClick={() => set('calType', 'solar')}>양력</button>
          <button type="button" className={form.calType === 'lunar' ? 'on' : ''} onClick={() => set('calType', 'lunar')}>음력</button>
          {form.calType === 'lunar' && (
            <label className="chk leap-chk"><input type="checkbox" checked={form.isLeapMonth} onChange={(e) => set('isLeapMonth', e.target.checked)} /> 윤달</label>
          )}
        </div>
        <div className="form-grid">
          <div><label>연도({form.calType === 'lunar' ? '음력' : '양력'})</label><input type="number" value={form.year} onChange={(e) => set('year', e.target.value)} /></div>
          <div><label>월</label><input type="number" value={form.month} onChange={(e) => set('month', e.target.value)} /></div>
          <div><label>일</label><input type="number" value={form.day} onChange={(e) => set('day', e.target.value)} /></div>
          <div><label>시 (0~23)</label><input type="number" value={form.hour} disabled={form.unknownTime} onChange={(e) => set('hour', e.target.value)} /></div>
          <div><label>분</label><input type="number" value={form.minute} disabled={form.unknownTime} onChange={(e) => set('minute', e.target.value)} /></div>
          <div><label>출생도시 <span className="hint">· 목록에 없으면 가장 가까운 도시를 선택</span></label>
            <select value={form.city} onChange={(e) => set('city', e.target.value)}>
              {CITY_GROUPS.map((g) => (
                <optgroup label={g.region} key={g.region}>
                  {Object.keys(g.cities).map((c) => <option key={c} value={c}>{c}</option>)}
                </optgroup>
              ))}
            </select>
          </div>
        </div>
        <div className="row">
          <label className="chk"><input type="checkbox" checked={form.unknownTime} onChange={(e) => set('unknownTime', e.target.checked)} /> 태어난 시간 모름</label>
          <label className="chk"><input type="radio" name="sex" checked={form.sex === 'M'} onChange={() => set('sex', 'M')} /> 남</label>
          <label className="chk"><input type="radio" name="sex" checked={form.sex === 'F'} onChange={() => set('sex', 'F')} /> 여</label>
        </div>
        {!form.unknownTime && form.hour === '23' && (
          <div className="row" style={{ marginTop: 10, alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 13, color: 'var(--text-mute)' }}>자시(子時) 학파</span>
            <select value={form.jasiMode} onChange={(e) => set('jasiMode', e.target.value)}>
              <option value="yaja">야자시 인정 — 당일 일주 (기본·통용)</option>
              <option value="jeongja">정자시 — 23시부터 다음날 일주</option>
            </select>
          </div>
        )}
        <button className="btn" onClick={submit} disabled={loading}>{loading ? '천문 데이터 분석 중…' : '내 사주 분석하기 →'}</button>
        {error && <div className="warn error">{error}</div>}
      </div>

      <div className="card shelf-card">
        <h2>📁 내 사주 보관함{profiles.length > 0 && <span className="shelf-count">{profiles.length}</span>}</h2>
        {profiles.length > 0 ? (
          <>
            <div className="meta" style={{ marginBottom: 14 }}>저장한 사주를 눌러 바로 다시 보고, <a href="/gunghap" style={{ color: 'var(--gold)' }}>궁합</a>에도 쓸 수 있어요.</div>
            <div className="shelf">
              {profiles.map((p) => (
                <div className="shelf-chip" key={p.id} onClick={() => loadProfile(p)}>
                  <span className="shelf-emoji">{p.summary?.emoji ?? '🔮'}</span>
                  <span className="shelf-info"><b>{p.name}</b><small>{p.year}.{p.month}.{p.day} · {p.summary?.ilju ?? ''}</small></span>
                  <button className="shelf-x" onClick={(e) => { e.stopPropagation(); deleteProfile(p.id); }} aria-label="삭제">✕</button>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="shelf-empty">
            <div className="shelf-empty-ic">🗂️</div>
            <p className="shelf-empty-t">아직 저장된 사주가 없어요</p>
            <p className="shelf-empty-s">위에서 사주를 분석한 뒤 <b>‘💾 이 사주 보관함에 저장’</b>을 누르면 여기에 모여요.<br/>로그인하면 다른 기기에서도 보관함이 그대로 유지돼요.</p>
          </div>
        )}
      </div>

      {result && (
        <>
          <div className="lead-card">
            <div className="lead-mark">✦ {result.input.name ? `${result.input.name}님 사주` : '당신의 사주'}{ai && <span className="ai-badge">✨ AI 심층 풀이</span>}</div>
            <p className="lead-quote">{ai && ai.lead ? ai.lead : result.readingLead}{aiStreaming && ai && !ai.lead && <span className="caret" />}</p>
            <button className="save-btn" onClick={saveCurrent}>💾 이 사주 보관함에 저장</button>
          </div>

          {/* 바이럴 루프: 궁합은 상대를 데려와야 완성 — 결과 직후 최상단 배치 */}
          <div className="card" style={{ textAlign: 'center' }}>
            <h2>💞 이 사주, 그 사람이랑은?</h2>
            <div className="meta" style={{ marginBottom: 14 }}>사주는 혼자 보지만 궁합은 둘이 봐야 완성돼요. 초대 문구를 보내서 서로의 명식으로 확인해 보세요. 궁합 점수는 무료!</div>
            <div className="share-actions" style={{ justifyContent: 'center' }}>
              <Link href="/gunghap" className="btn share-btn" style={{ textDecoration: 'none' }}>💞 우리 궁합 보러 가기</Link>
              <button className="btn share-btn ghost" onClick={copyInviteLink}>🔗 초대 문구 복사</button>
            </div>
          </div>

          <DailyFortune result={result} />

          <YearlyFortune result={result} premium={premium} onLocked={() => setPayOpen(true)} reqBody={reqBody} />

          <AuspiciousDates result={result} premium={premium} onLocked={() => setPayOpen(true)} />

          <div className="card">
            <h2>사주 명식 (四柱)</h2>
            <div className="saju-table">
              <div className="h">구분</div><div className="h">시주</div><div className="h">일주</div><div className="h">월주</div><div className="h">년주</div>
              <div className="h">천간<br/>지지</div>
              <GzCell pos="時" p={result.pillars.hour} />
              <GzCell pos="日 (나)" p={result.pillars.day} />
              <GzCell pos="月" p={result.pillars.month} />
              <GzCell pos="年" p={result.pillars.year} />
            </div>
            {result.warnings.map((w, i) => <div className="warn" key={i}>⚠️ {w}</div>)}
            <div className="adv">
              <div className="adv-row"><span className="adv-k">십이운성</span>
                <span>시 {result.advanced.unseong.hour ?? '—'} · 일 {result.advanced.unseong.day} · 월 {result.advanced.unseong.month} · 년 {result.advanced.unseong.year}</span>
              </div>
              <div className="adv-row"><span className="adv-k">공망(空亡)</span><span>{result.advanced.gongmang.branches.join(' · ')}</span></div>
              {lunarBirth && (
                <div className="adv-row"><span className="adv-k">음력 생일</span><span>{lunarBirth.year}년 {lunarBirth.isLeap ? '윤' : ''}{lunarBirth.month}월 {lunarBirth.day}일</span></div>
              )}
            </div>
            {result.advanced.sinsal.length > 0 && (
              <div className="sinsal-wrap">
                {result.advanced.sinsal.map((s, i) => (
                  <div className={`sinsal ${s.tone}`} key={i}><div className="sinsal-h"><b>{s.name}</b> <span>{s.targets}</span></div><p>{s.desc}</p></div>
                ))}
              </div>
            )}
            <div className="hapchung-wrap">
              <h3 className="hapchung-title">합충(合沖) 관계</h3>
              {hapchung.length === 0 ? (
                <p className="meta">네 기둥 사이에 두드러진 합·충·형·해가 없는 담백한 구조예요.</p>
              ) : (
                <div className="hapchung-list">
                  {hapchung.map((h, i) => (
                    <div className={`hapchung ${h.tone}`} key={i}>
                      <div className="hapchung-h"><b>{h.name}</b><span className="hapchung-type">{h.type}</span><span className="hapchung-pos">{h.positions.join('·')}</span></div>
                      <p>{h.desc}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="card reading">
            <h2>사주 풀이</h2>
            <div className="meta" style={{ marginBottom: 12 }}>{result.input.name ? `${result.input.name}님` : '당신'}을 꿰뚫어 보는 선배의 시선으로, 따뜻하지만 솔직하게 풀었습니다.</div>

            {/* 풀이 톤 선택 — 같은 명식, 다른 말투 (톤별 캐시) */}
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 18 }}>
              <span style={{ fontSize: 13, color: 'var(--text-mute)' }}>말투{premium ? '' : ' 🔒'}</span>
              {([['default', '🎓 선배 톤'], ['blunt', '🔥 팩폭'], ['warm', '🍵 따뜻하게']] as const).map(([k, label]) => (
                <button
                  key={k}
                  className="mini-btn"
                  style={tone === k ? { background: 'var(--gold)', color: '#14101f', borderColor: 'transparent', fontWeight: 700 } : undefined}
                  disabled={aiLoading || aiStreaming}
                  onClick={() => { if (tone === k) return; if (!premium) { setPayOpen(true); return; } setTone(k); askAI('premium', undefined, k); }}
                >{label}</button>
              ))}
            </div>

            {!ai && (
              <div className="ai-cta">
                <div className="ai-cta-txt"><b>✨ AI 심층 풀이</b><span>{aiErr ? 'AI 풀이 생성에 실패했어요. 잠시 후 다시 시도해 주세요. (지금은 기본 풀이를 보여드려요)' : '지금 보시는 건 기본 풀이예요. 프리미엄은 당신 명식만을 위해 AI가 매번 새로 쓰고, 말투(선배/팩폭/따뜻)도 고를 수 있어요.'}</span></div>
                <button className="btn ai-btn" onClick={onAiClick} disabled={aiLoading}>{aiLoading ? '명식을 읽는 중…' : premium ? 'AI 심층 풀이 생성 →' : 'AI 심층 풀이 받기 🔒'}</button>
                {aiErr && <div className="warn" style={{ marginTop: 12 }}>{aiErr}</div>}
              </div>
            )}
            {ai && (
              <div className="ai-switch">
                <span>{aiStreaming ? '● 선배가 당신 사주를 읽는 중…' : '✨ AI 심층 풀이'}</span>
                {!aiStreaming && <button className="mini-btn" onClick={() => setAi(null)}>기본 풀이로 보기</button>}
              </div>
            )}

            {(() => {
              const secs = ai ? ai.sections : result.interpretations;
              if (ai && secs.length === 0) return <div className="read-wait">✍️ 명식을 깊이 읽고 있어요…<span className="caret" /></div>;
              return secs.map((it: any, i: number) => {
                const isLast = !!aiStreaming && !!ai && i === secs.length - 1;
                const paras = String(it.body).split('\n\n');
                return (
                  <section className="read-sec" key={it.key}>
                    <div className="read-head">
                      <span className="read-num">{i + 1}</span>
                      <div>
                        <div className="read-label">{it.icon} {it.label}</div>
                        <div className="read-title">{it.title || <span className="caret" />}</div>
                      </div>
                    </div>
                    <div className="read-body">
                      {paras.map((para: string, j: number) => (
                        <p key={j}>{para}{isLast && j === paras.length - 1 && <span className="caret" />}</p>
                      ))}
                    </div>
                  </section>
                );
              });
            })()}
          </div>

          {!aiStreaming && (
            <ReadingCard
              name={result.input.name}
              lead={ai && ai.lead ? ai.lead : result.readingLead}
              sections={ai && ai.sections.length ? ai.sections : result.interpretations}
              symbol={result.archetype.symbol}
            />
          )}

          <ChatPanel
            reqBody={reqBody}
            name={result.input.name}
            premium={premium}
            onLocked={() => setPayOpen(true)}
          />

          <div className="card premium">
            <h2>{premium ? '✓ 정밀 리포트 (이용 중)' : '🔒 정밀 리포트 (프리미엄)'}</h2>
            <p className="meta" style={{ marginBottom: 14 }}>이직·이사·계약·연애 — 진짜 결정을 앞뒀다면, 정밀 리포트에서 '언제, 어느 방향으로'까지 확인하세요.</p>
            <ul className="prem-list">
              <li>🔮 프리미엄 심층 AI 풀이 — 더 길고 깊게, 무제한 재생성</li>
              <li>📈 평생 대운 80년 상세 — 시기별 재물·직업·건강 변곡점</li>
              <li>🗓️ {new Date().getFullYear()}~{new Date().getFullYear() + 1} 신년운세 — 월별 길흉 캘린더</li>
              <li>🍀 나만의 개운법 · 결혼·이직·이사 택일</li>
            </ul>
            {premium
              ? <>
                  <div className="prem-unlocked">✓ 프리미엄 잠금이 해제되어 모든 기능을 이용 중이에요.</div>
                  <button className="btn ai-btn" onClick={onAiClick} disabled={aiLoading}>{aiLoading ? '심층 풀이 생성 중…' : '✨ 프리미엄 심층 풀이로 다시 풀기'}</button>
                </>
              : <button className="btn" onClick={() => setPayOpen(true)}>정밀 리포트 받기 · <s style={{ opacity: .6, fontWeight: 400 }}>₩9,900</s> ₩5,900</button>}
            <button className="btn guidebook-btn" onClick={() => { if (premium) window.print(); else setPayOpen(true); }}>
              📕 인생 가이드북 PDF로 저장{!premium && ' 🔒'}
            </button>
            <p className="meta" style={{ marginTop: 10, fontSize: 12 }}>인쇄 창에서 ‘대상 → PDF로 저장’을 고르면 고품질 가이드북이 파일로 저장돼요.</p>
          </div>

          <Receipts />

          <div className="card">
            <h2>오행 분포 (五行)</h2>
            <div className="meta" style={{ marginBottom: 10 }}>천간·지지 8자 기준 — 지지 속에 숨은 지장간(支藏干)의 기운은 격국·풀이에 별도로 반영됩니다.</div>
            {(['목','화','토','금','수'] as const).map((o) => {
              const c = (result.ohaeng as any)[o] as number;
              const st = (result.ohaeng.status as any)[o];
              return (
                <div className="bar" key={o}>
                  <div className="bar-label" style={{ color: OHAENG_COLOR[o] }}>{o}</div>
                  <div className="bar-track">
                    <div className="bar-fill" style={{ width: `${(c / maxOhaeng) * 100}%`, background: `linear-gradient(90deg, ${OHAENG_COLOR[o]}aa, ${OHAENG_COLOR[o]})` }}>{c}</div>
                  </div>
                  <div className="bar-tag">{st ?? ''}</div>
                </div>
              );
            })}
          </div>

          <div className="card">
            <h2>일간 강약 (신강·신약)</h2>
            <div className="gauge"><div style={{ width: `${result.dayMasterStrength * 100}%` }} /></div>
            <div className="gauge-row"><span>신약 (관계·환경 활용형)</span><span>{Math.round(result.dayMasterStrength * 100)}%</span><span>신강 (주관·추진형)</span></div>
          </div>

          <div className="card">
            <h2>격국 · 용신 (格局 · 用神)</h2>
            <div className="chips">
              <div className="chip">그릇 <b>{result.gyeokYong.gyeokguk.name}</b></div>
              <div className="chip">용신 <b>{result.gyeokYong.yongsin.primary}(五行)</b></div>
              <div className="chip">조후 <b>{result.gyeokYong.johu.climate}</b></div>
            </div>
            <p style={{ marginTop: 10, opacity: 0.7, fontSize: 13 }}>판정 근거: {result.gyeokYong.gyeokguk.via} → {result.gyeokYong.gyeokguk.name}</p>
            <p style={{ marginTop: 10, opacity: 0.85, lineHeight: 1.6 }}>{result.gyeokYong.gyeokguk.desc}</p>
            <p style={{ marginTop: 6, opacity: 0.85, lineHeight: 1.6 }}>{result.gyeokYong.yongsin.desc}</p>
          </div>

          <div className="card">
            <div className="chips">
              {Object.entries(result.sipsinSummary).sort((a, b) => b[1] - a[1]).map(([k, v]) => (
                <div className="chip" key={k}>{k} <b>×{v}</b></div>
              ))}
            </div>
          </div>

          <NamingCard result={result} />

          <GaeunCard result={result} premium={premium} onLocked={() => setPayOpen(true)} />

          <ShareCard result={result} />

          <TalismanCard result={result} />

          <Link href="/gunghap" className="gunghap-cta">
            💞 친구·연인과 사주 궁합 확인하기 →
          </Link>

          <div className="card">
            <h2>10년 대운 흐름 (大運)</h2>
            <div className="meta" style={{ marginBottom: 6 }}>
              <b>{result.luck.direction}</b> · 대운수 <b>{result.luck.daewoonAge}</b> ·
              매 10년 단위로 바뀌는 인생의 큰 흐름입니다. 선이 위(길)일수록 일간에 우호적인 운입니다.
            </div>
            <LuckGraph items={result.luck.daewoon} mode="age" />
          </div>

          <div className="card">
            <h2>세운 흐름 (歲運) · 올해부터 10년</h2>
            <div className="meta" style={{ marginBottom: 6 }}>해마다 들어오는 1년 단위 운. 파란 선이 <b>올해</b>입니다.</div>
            <LuckGraph items={result.luck.sewoon} mode="year" nowYear={result.luck.sewoon[0]?.year} />
          </div>

          <div className="card">
            <h2>정밀 보정 내역</h2>
            <div className="meta">
              <b>표준자오선</b> {result.corrected.standardMeridian}°E ·
              <b> 경도보정</b> {result.corrected.longitudeCorrectionMin}분 ·
              <b> 균시차</b> {result.corrected.equationOfTimeMin}분<br />
              <b>서머타임</b> {result.corrected.summerTimeApplied ? '적용(-1h)' : '없음'} ·
              <b> 자시구분</b> {result.corrected.jasiType ?? '—'}<br />
              <b>진태양시</b> {result.corrected.apparentSolarDateTime}
            </div>
          </div>

          <GuidebookPrint result={result} ai={ai} />
        </>
      )}

      <div className="account-inline">
        <AccountButton />
      </div>

      <div className="foot">
        만세력 엔진: VSOP87 천문 알고리즘 기반 절기·균시차 자체 연산 · 절기 시각 KASI 공표값 1분 이내 일치 · 일주 60갑자 국제표준 보정<br />
        ※ 경계 시각(절기 전후·자정 무렵) 출생은 한국천문연구원(KASI) 교차검증 권장
      </div>

      <Paywall open={payOpen} onClose={() => setPayOpen(false)} onUnlock={handleUnlock} />
      {notice && <div className="toast">{notice}</div>}
    </main>
  );
}

'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import { chartId } from '@/lib/chartId';
import type { Pillar, LuckPillar } from '@/lib/saju/types';
// 클라이언트가 받는 건 **판정이 빠진** 결과다(무료 응답). 타입으로 그 사실을 못 박아 둔다 —
// 그래야 화면 코드가 실수로 `yongsin.primary` 를 참조하는 순간 컴파일이 막는다.
import type { FreeSajuResult } from '@/lib/saju/gate';
import { parseReadingStream, fixReadingHanja } from '@/lib/saju/readingMeta';
import { ENGINE_VERSION, READING_TAG } from '@/lib/saju/version';
import { cloudGetReport } from '@/lib/cloud';
import { lunarToSolar, solarToLunar } from '@/lib/saju/lunar';
import { computeHapchung } from '@/lib/saju/hapchung';
import { luckTone } from '@/lib/saju/luckTone';
import { daewoonSummary, peakSentence, nowSentence, ZERO_SENTENCE, APPROX_SENTENCE, LUCK_FORMULA } from '@/lib/saju/luckSummary';
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
import Paywall, { usePremium, PRICE } from './Paywall';
import ReportShelf from './ReportShelf';
import SummaryCard from './SummaryCard';
import TermNote from './TermNote';
import PlanCompare from './PlanCompare';
import ResultNav from './ResultNav';
import TimeUnknownCard from './TimeUnknownCard';
import { usePremiumData } from './usePremiumData';
import type { Gyeokguk, Yongsin, Johu } from '@/lib/saju/gyeokyong';
import type { GaeunResult } from '@/lib/saju/gaeun';
import Reviews from './Reviews';
import ReviewPrompt from './ReviewPrompt';
import { CITY_GROUPS, CITIES } from './cities';
import AccountButton from './AccountButton';
import { listProfiles, saveProfile, removeProfile, type Profile } from '@/lib/profiles';

const OHAENG_COLOR: Record<string, string> = {
  목: '#22c55e', 화: '#ef4444', 토: '#eab308', 금: '#e2e8f0', 수: '#3b82f6',
};

// 출생 도시 목록은 app/cities.ts에서 공용 관리 (궁합 페이지와 공유)

// 점 색 경계는 신년운세 등급과 같은 선(luck.ts LUCK_TONE) — 2026-09-23 대운 점수를 신년 식으로 통일하면서 맞췄다
function scoreColor(s: number): string {
  const t = luckTone(s);
  return t === 'good' ? '#22c55e' : t === 'bad' ? '#ef4444' : '#eab308';
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


/** 분 → 사람이 읽는 시간차 ('3일 4시간' · '2시간 12분' · '18분') */
function fmtDelta(min: number): string {
  const a = Math.abs(Math.round(min));
  const d = Math.floor(a / 1440), h = Math.floor((a % 1440) / 60), m = a % 60;
  if (d) return `${d}일 ${h}시간`;
  if (h) return `${h}시간 ${m}분`;
  return `${m}분`;
}

export default function Home() {
  const [form, setForm] = useState({
    name: '', year: '', month: '', day: '', hour: '', minute: '0',
    city: '서울', unknownTime: false, sex: 'M' as 'M' | 'F',
    calType: 'solar' as 'solar' | 'lunar', isLeapMonth: false,
    jasiMode: 'yaja' as 'yaja' | 'jeongja', // 자시 학파 (23시대 출생 시에만 노출)
  });
  const [result, setResult] = useState<FreeSajuResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [ai, setAi] = useState<{ lead: string; sections: any[] } | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiStreaming, setAiStreaming] = useState(false);
  const [aiErr, setAiErr] = useState('');
  // 실제로 분석한 입력값. 판매 단위가 "명식 1건"이라 이용권 판정의 기준이 된다.
  // (편집 중인 form 이 아니라 '분석된' 명식이어야 한다)
  const [analyzed, setAnalyzed] = useState<any>(null);
  const chart = useMemo(() => (analyzed ? chartId(analyzed) : null), [analyzed]);
  const [premium, unlock] = usePremium(chart);
  const [payOpen, setPayOpen] = useState(false);
  const [pendingAi, setPendingAi] = useState(false);
  // 풀이 톤(문체) — default 선배 톤 / blunt 팩폭 / warm 따뜻한 상담
  const [tone, setTone] = useState<'default' | 'blunt' | 'warm'>('default');

  // 무료는 규칙 풀이. 이 버튼은 구매한 명식의 '심층(Sonnet) 생성/재생성'.
  function onAiClick() { if (premium) askAI('premium', analyzed ?? undefined); else { setPendingAi(true); setPayOpen(true); } }
  function handleUnlock() { unlock(); setPayOpen(false); if (pendingAi) { setPendingAi(false); askAI('premium', analyzed ?? undefined); } }

  // 이용권이 확인된 명식은 심층 풀이를 자동 생성한다.
  // (서버 확인이 비동기라 분석 직후엔 아직 false 일 수 있어서 effect 로 처리)
  const autoAiFor = useRef<string | null>(null);
  useEffect(() => {
    if (!premium || !chart || !result || !analyzed) return;
    if (autoAiFor.current === chart) return; // 명식당 1회만
    autoAiFor.current = chart;
    askAI('premium', analyzed);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [premium, chart, result, analyzed]);

  const set = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }));
  // 시각 미상 카드의 「시각 넣고 다시 보기」 — 체크를 풀고 입력 폼의 「시」 칸으로 데려간다
  const enterTime = () => {
    setForm((f) => ({ ...f, unknownTime: false }));
    document.getElementById('birth-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setTimeout(() => (document.getElementById('birth-hour') as HTMLInputElement | null)?.focus({ preventScroll: true }), 450);
  };

  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [notice, setNotice] = useState('');
  // 누적 풀이 수 (실측 카운터 — 100 미만이면 표시 안 함)
  // 랜딩 사회적 증거 — 전부 서버 실측값. people=고유 명식 수(HLL), cases=/accuracy 와 같은 채점 표본 수.
  const [stats, setStats] = useState<{ people: number; cases: number }>({ people: 0, cases: 0 });
  useEffect(() => {
    fetch('/api/stats').then((r) => r.json()).then((d) => setStats({ people: d?.people ?? 0, cases: d?.cases ?? 0 })).catch(() => {});
  }, []);
  useEffect(() => {
    setProfiles(listProfiles());
    const onSync = () => setProfiles(listProfiles()); // 로그인·다른기기 동기화 후 갱신
    window.addEventListener('saju:synced', onSync);
    return () => window.removeEventListener('saju:synced', onSync);
  }, []);
  const flash = (m: string) => { setNotice(m); setTimeout(() => setNotice(''), 2000); };

  // 결과 화면 복원 — 12신살 사전 등 다른 페이지에 갔다 뒤로 오면 입력 화면으로 초기화되던 문제.
  // 결과가 React state에만 있어 페이지를 벗어나면 날아갔음. sessionStorage 스냅샷으로 되살린다.
  // ⚠️ 응답 모양이 바뀌면 **반드시 버전을 올린다.**
  //   v2 (2026-09-09): 세로 자르기로 `gyeokYong` 모양이 바뀌고 `boundary` 가 생겼다.
  //   옛 스냅샷(v1)을 복원하면 없는 필드를 읽어 결과 화면이 통째로 깨진다 — 배포 직후 재방문자가 정확히 그 경우다.
  const SESSION_KEY = 'saju_session_v2';
  const [restored, setRestored] = useState(false);
  useEffect(() => { try { const raw = sessionStorage.getItem(SESSION_KEY); if (raw) { const s = JSON.parse(raw); if (s?.form) setForm((f) => ({ ...f, ...s.form })); if (s?.result) setResult(s.result); if (s?.ai) setAi(fixReadingHanja(s.ai)); if (s?.tone) setTone(s.tone); if (s?.analyzed) setAnalyzed(s.analyzed); } } catch {} setRestored(true); }, []);
  useEffect(() => { if (!restored) return; try { if (result) sessionStorage.setItem(SESSION_KEY, JSON.stringify({ form, result, ai, tone, analyzed })); else sessionStorage.removeItem(SESSION_KEY); } catch {} }, [restored, result, ai, tone, form, analyzed]);

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

  // 유료 콘텐츠(개운법·택일·신년운세)는 서버에서만 계산한다(/api/premium).
  //   요청 본문은 **분석 시점의 명식**이어야 한다 — 결과를 본 뒤 폼을 만지작거려도
  //   결제한 명식과 어긋나지 않게. 개운법은 카드와 가이드북 PDF 가 같이 쓰므로 여기서 한 번만 받는다.
  const premiumBody = () => (analyzed ?? reqBody());
  const gaeunQ = usePremiumData<GaeunResult>(premium && !!analyzed, 'gaeun', analyzed ?? null);
  // 신살 길흉반전 — 무료 응답에는 아예 실려 오지 않는다(서버에서 뺀다). 결제 후 여기서 받아온다.
  type FlipItem = { name: string; baseTone: string; flip: null | { dir: 'positive' | 'negative'; label: string; spot: string; line: string; tone: string } };
  type Sin12Premium = { byYear: FlipItem[]; byDay: FlipItem[]; sinsal: FlipItem[]; yongsin: { primary: string; huisin: string; gisin: string } };
  const flipQ = usePremiumData<Sin12Premium>(premium && !!analyzed, 'sin12', analyzed ?? null);
  const flipOf = (name: string) => flipQ.data?.byYear.find((x) => x.name === name)?.flip ?? null;
  const flipLock = (result as any)?.advanced?.flipLock as { flips: number; names: string[]; total: number } | undefined;

  // 용신·격국 **확정 판정**도 무료 응답에는 실려 오지 않는다(`lib/saju/gate.ts`).
  //   무료 화면이 가진 건 후보와 「여기서 갈린다」는 사실뿐이고, 판정과 근거는 결제 후 여기서 받는다.
  type YongsinPremium = {
    gyeokguk: Gyeokguk; yongsin: Yongsin; johu: Johu;
    strength: number; paidLines: Record<string, string>;
  };
  const yongsinQ = usePremiumData<YongsinPremium>(premium && !!analyzed, 'yongsin', analyzed ?? null);
  const yq = yongsinQ.data;
  const yongLock = result?.gyeokYong?.yongsinLock;

  // 같은 명식이면 AI 풀이를 재호출하지 않도록 캐시 키 (브라우저 localStorage)
  //   ⚠️ READING_TAG 를 반드시 넣는다. 판정이 바뀌거나 **설명문만 바뀌어도**
  //      옛 문장으로 쓰인 캐시를 버려야 한다 (설명문은 프롬프트에 그대로 들어간다).
  const chartKey = (b: any, tier: string, tn: string) =>
    `saju_ai_${READING_TAG}:${b.year}-${b.month}-${b.day}-${b.hour}-${b.minute}-${b.sex}-${Math.round((b.longitude || 126.978) * 100)}-${(b.name || '').trim()}-${b.jasiMode || 'yaja'}:${tier}:${tn}`;

  async function runAnalysis(bodyObj: any) {
    setError(''); setResult(null); setAnalyzed(null); setAi(null); setAiErr('');
    setLoading(true);
    const started = Date.now();
    try {
      const res = await fetch('/api/saju', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(bodyObj) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? '오류');
      const elapsed = Date.now() - started;
      if (elapsed < 2000) await sleep(2000 - elapsed); // 정밀 분석 연출 최소 노출
      setResult(data);
      setAnalyzed(bodyObj); // 이용권 판정 기준이 되는 '분석된 명식'
      // 비용 원칙: AI 실시간 호출은 결제 사용자만. 무료는 규칙 엔진 풀이 즉시 표시(API 0원).
      // 이 명식의 리포트를 구매했는지는 서버 확인이 비동기라, 아래 useEffect 가 대신 띄운다.
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
        if (parsed?.sections?.length) { setAi(fixReadingHanja(parsed)); setAiErr(''); setAiLoading(false); setAiStreaming(false); return; }
      }
    } catch {}
    setAiErr(''); setAiLoading(true); setAiStreaming(true);
    setAi({ lead: '', sections: [] });

    // 서버 보관본 먼저 확인 — 폰에서 산 리포트를 PC에서 열어도 '그때 그 글'이 나와야 한다.
    // (localStorage 는 기기 종속이고, Redis 캐시는 60일 뒤 만료된다.)
    if (tier === 'premium') {
      try {
        const saved = await cloudGetReport('reading', chartId(base), tn);
        const parsed = saved ? parseReadingStream(saved) : null;
        if (parsed && parsed.sections.length) {
          setAi(fixReadingHanja(parsed)); setAiLoading(false); setAiStreaming(false);
          try { localStorage.setItem(key, JSON.stringify(parsed)); } catch {}
          return;
        }
      } catch {}
    }

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
        <h1 style={{ fontSize: 'clamp(28px, 6vw, 46px)', lineHeight: 1.3 }}>틀린 사주로 <span>인생을 정할 순 없으니까</span></h1>
        <p>사주, 나를 꿰뚫다 — 천문 데이터로 계산한 진짜 명식 위에서, 인생의 결정을 돕습니다</p>
      </div>

      {/* 히어로 신뢰 라인.
          ⚠️ 2026-09-09 — NASA JPL 6.8초 · 71,733일 같은 **스펙 숫자를 첫 화면에서 내렸다.**
             ① 「진태양시·야자시 보정합니다」는 경쟁 사이트(사주만세·척척사주·데이사주)도 똑같이 쓰는 말이라
                문장으로는 구분이 안 된다 — 이 자리에서 정확도를 '주장'해 봐야 값을 못 한다.
             ② 그 숫자들은 **결제 직전**("이거 믿어도 되나")과 `/accuracy` 에서 터뜨려야 값을 한다.
             차별점은 주장이 아니라 **명식을 넣은 뒤 나오는 개인화된 증거**(경계 진단)로 옮겼다. */}
      <div className="trust">
        <div className="trust-badges">
          <span className="tb">◷ 진태양시·야자시·서머타임까지 계산</span>
          <span className="tb">🔎 내 명식이 다른 곳과 갈리는 지점을 그대로 공개</span>
        </div>
        {stats.people >= 1000 && (
          <p style={{ marginTop: 12, fontSize: 14, color: 'var(--text-mute)', textAlign: 'center' }}>
            지금까지 <b style={{ color: 'var(--gold)' }}>{stats.people.toLocaleString()}명</b>이 명식을 확인했어요
          </p>
        )}
        <p className="trust-sub">
          같은 생년월일인데 앱마다 사주가 다른 이유, 당신 명식에서 직접 보여드립니다.
          {stats.cases > 0 && <> 저희 판정은 고전 원전 <b>{stats.cases}건</b>으로 채점해 <b>틀린 것까지</b> 공개하고 있어요.</>}
          {' '}<a href="/accuracy" style={{ color: 'var(--gold)' }}>검증 방법과 숫자 전부 보기 →</a>
        </p>
      </div>

      {loading && <Analyzing corr={`${(((CITIES[form.city] ?? 126.978) - 135) * 4).toFixed(1)}분`} />}

      <div className="card" id="birth-form">
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
          <div><label>시 (0~23)</label><input id="birth-hour" type="number" value={form.hour} disabled={form.unknownTime} onChange={(e) => set('hour', e.target.value)} /></div>
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
          {form.unknownTime && (
            <span style={{ fontSize: 12.5, color: 'var(--text-mute)' }}>→ 년·월·일 3개 기둥으로 풀이하고, 시주 관련 항목은 빼고 보여드려요. 아는 만큼만 정직하게.</span>
          )}
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
        <p style={{ marginTop: 12, fontSize: 12.5, color: 'var(--text-mute)', textAlign: 'center' }}>
          🔒 입력한 정보는 풀이 계산에만 쓰이고, 제3자에게 제공되지 않아요.
        </p>
        <p style={{ marginTop: 4, fontSize: 13, color: 'var(--text-mute)', textAlign: 'center' }}>
          {/* ⚠️ 2026-09-17 취소선(₩9,900)과 「런칭 기념·첫 500명 한정」 삭제.
              ① 9,900 은 판매한 기간이 없어 종전거래가격이 아니다 → 허위 종전가격.
              ② 구매자 수 카운터가 없어 500명을 셀 수도, 끝낼 수도 없다 → 종료되지 않는 수량 한정.
              둘 다 표시광고법 리스크이고 토스 「정찰제」와 부딪힌다. 근거: 카드사심사후_수정대기목록.md §D */}
          명식·기본 풀이·오늘의 운세는 <b>무료</b> · 정밀 리포트 <b style={{ color: 'var(--gold)' }}>₩{PRICE.toLocaleString()}</b> · 단건 결제
          {' '}<Link href="/pricing" style={{ color: 'var(--gold)' }}>이용권 안내 →</Link>
        </p>
        {error && <div className="warn error">{error}</div>}
      </div>

      <Link href="/gunghap" className="card gh-entry">
        <div className="gh-entry-t">💞 이 사람이랑, 진짜 괜찮은 걸까</div>
        <p>두 사람의 명식으로 보는 정통 사주 궁합 — <b>무료</b>예요.
          {' '}상대방 생일을 몰라도 <b>내 정보만 넣고 링크를 보내면</b> 상대가 채우는 순간 완성됩니다.</p>
        <span className="gh-entry-cta">궁합 보러 가기 →</span>
      </Link>

      {/* 결과 미리보기 — 입력 전 '시식 코너' (실제 생성된 풀이 문장 사용) */}
      {!result && (
        <div className="card">
          <h2>이런 풀이를 받아요</h2>
          <div className="meta" style={{ marginBottom: 12 }}>실제 무료 풀이 예시 — 무인(戊寅)일주 · 신약</div>
          <div className="lead-card" style={{ marginTop: 0 }}>
            <div className="lead-mark">✦ 당신의 사주</div>
            <p className="lead-quote">당신은 산처럼 버티면서 정작 자기 무게에 짓눌리는 사람입니다 — 혼자 버티려 하지만, 물이 흘러야 비로소 빛나는 구조로 태어났어요.</p>
          </div>
          <p style={{ marginTop: 12, fontSize: 13, color: 'var(--text-mute)', textAlign: 'center' }}>명식표 · 오행 개수 · 용신이 갈리는 지점 · 오늘의 운세는 무료입니다. 엔진의 확정 판정과 근거는 리포트에 있어요.</p>
        </div>
      )}

      <Reviews />

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

      {/* 받아본 리포트 원문 보관소 — 없으면 아무것도 그리지 않는다 */}
      <ReportShelf />

      {result && (
        <>
          {/* ── 결과 화면 카드 순서 (2026-09-17 재배치 · 카드사심사후_수정대기목록.md §E-4 ①) ──
              읽는 순서를 「무엇이 나왔나 → 어떻게 계산했나 → 어디서 갈리나 → 왜 그런가 → 그래서 언제」로 맞췄다.
              문구는 한 글자도 바꾸지 않았다. JSX 블록 위치만 옮겼다.
              바뀐 것 세 가지:
               ① 「정밀 보정 내역」이 맨 아래(26번째)에서 명식 바로 뒤로 올라왔다.
                  계산 투명성이 이 브랜드의 전부인데 아무도 안 보는 자리에 있었다.
               ② 결제 카드가 오행·강약·격국용신·십신 뒤로 내려갔다.
                  전에는 「뭐가 나왔나」보다 「사세요」가 먼저였다.
               ③ 궁합 CTA 카드가 첫 카드 자리에서 결제 뒤로 내려갔다.
                  결제 직전에 무료 CTA 를 놓으면 시선을 빼앗는다.
              ⚠️ 되돌리기 쉬운 판단 하나 — DailyFortune(오늘의 운세)을 3번째에서 대운·세운 뒤로 옮겼다.
                 시간축을 10년→1년→오늘 순으로 묶는 게 읽기 좋지만, 오늘의 운세는 재방문 훅이라
                 스크롤이 깊어지는 대가가 있다. 재방문율이 떨어지면 이 블록만 다시 위로 올리면 된다. ── */}

          <div className="lead-card">
            <div className="lead-mark">✦ {result.input.name ? `${result.input.name}님 사주` : '당신의 사주'}{ai && <span className="ai-badge">✨ AI 심층 풀이</span>}</div>
            <p className="lead-quote">{ai && ai.lead ? ai.lead : result.readingLead}{aiStreaming && ai && !ai.lead && <span className="caret" />}</p>
            <button className="save-btn" onClick={saveCurrent}>💾 이 사주 보관함에 저장</button>
          </div>

          {/* 결과 목차 칩 (2026-09-28) — 장 여섯 개. 앵커(sec-*)는 각 장 첫 카드 바로 앞 */}
          <ResultNav />
          <span id="sec-myeongsik" className="sec-anchor" />
          {/* 결과 상단 요약 (§E-4 ②) — 상태 태그 · 한 줄 진단 · 경계 알림 · 계산 기준 · 엔진 버전 */}
          <SummaryCard result={result} />

          {/* 시각 미상 분기 (§E-4 ③) — 시각을 모르는 사람에게만. 확정된 것 / 시각을 알아야 정해지는 것 */}
          {result.timeScan && <TimeUnknownCard scan={result.timeScan} onEnterTime={enterTime} />}

          <div className="card">
            <h2>사주 명식 (四柱)</h2>
            {/* 경계 배지는 2026-09-23 결과 상단 「이 명식 한눈에」 카드(SummaryCard)로 옮겼다 — 규칙·문구는 lib/saju/summary.ts */}
            <div className="saju-table">
              <div className="h">구분</div><div className="h">시주</div><div className="h">일주</div><div className="h">월주</div><div className="h">년주</div>
              <div className="h">천간<br/>지지</div>
              <GzCell pos="時" p={result.pillars.hour} />
              <GzCell pos="日 (나)" p={result.pillars.day} />
              <GzCell pos="月" p={result.pillars.month} />
              <GzCell pos="年" p={result.pillars.year} />
            </div>
            {/* 엔진 버전 띠도 요약 카드로 옮겼다(2026-09-23) */}
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
                {result.advanced.sinsal.map((s, i) => {
                  const f = flipQ.data?.sinsal.find((x) => x.name === s.name)?.flip ?? null;
                  return (
                    <div className={`sinsal ${f ? f.tone : s.tone}`} key={i}>
                      <div className="sinsal-h">
                        <b>{s.name}</b> <span>{s.targets}</span>
                        {f && <span className={`flip-badge ${f.dir}`}>{f.dir === 'positive' ? '길로 반전' : '흉으로 굳음'}</span>}
                      </div>
                      <p>{s.desc}</p>
                      {f && <p className={`flip-line ${f.dir}`}>※ {f.line}</p>}
                    </div>
                  );
                })}
              </div>
            )}
            {/* 12신살 — 삼합 기준 12개 체계 (도화=연살, 역마, 화개 포함) */}
            <div className="hapchung-wrap">
              <h3 className="hapchung-title">12신살(十二神殺)</h3>
              <div className="meta" style={{ marginBottom: 10 }}>띠(년지)를 기준으로 본 열두 가지 살. 명식에 실제로 걸린 것만 표시합니다.</div>
              <div className="sinsal-wrap">
                {result.advanced.sin12.byYear.map((x) => {
                  const f = flipOf(x.name);
                  const willFlip = flipLock?.names.includes(x.name);
                  return (
                    <div className={`sinsal ${f ? f.tone : x.tone}`} key={x.name}>
                      <div className="sinsal-h">
                        <b>{x.name}{x.alias ? ` (${x.alias})` : ''}</b> <span>{x.ji} · {x.at.join('·')}</span>
                        {f && <span className={`flip-badge ${f.dir}`}>{f.dir === 'positive' ? '길로 반전' : '흉으로 굳음'}</span>}
                      </div>
                      <p>{x.desc} <a href={`/sinsal/${x.name}`} style={{ color: 'var(--gold)', whiteSpace: 'nowrap' }}>{x.name} 자세히 →</a></p>
                      {f && <p className={`flip-line ${f.dir}`}>※ {f.line}</p>}
                      {!f && willFlip && (
                        <p className="flip-locked">
                          🔒 이 별은 당신 명식에서 <b>그대로 읽으면 안 됩니다</b> — 앉은 글자가 용신 편인지 기신 편인지에 따라 뜻이 뒤집혀요.
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
              {(result.advanced.sin12.byYear.some((x) => flipOf(x.name)) || (!premium && flipLock && flipLock.flips > 0)) && (
                <TermNote terms={['용신', '희신', '기신']} />
              )}
              {!premium && flipLock && flipLock.flips > 0 && (
                <div className="flip-gate">
                  <div className="flip-gate-h">
                    걸린 {flipLock.total}개 중 <b>{flipLock.flips}개</b>가 당신 명식에서 <b>뒤집힙니다</b>
                  </div>
                  <p>
                    12신살이 어떤 글자에 붙는지는 띠와 지지만 알면 어디서든 나와요. 그래서 위까지는 전부 열어뒀습니다.
                    <br />
                    하지만 <b>같은 장성살이라도 그 글자가 내 용신 편이면 힘이 되고, 기신 편이면 오히려 반감됩니다.</b>
                    {' '}이 판정은 용신이 서 있어야만 가능해서, 살 배치표만 가진 곳에서는 나올 수 없어요.
                  </p>
                  <p className="flip-gate-what">
                    정밀 리포트에서 열리는 것 — <b>{flipLock.names.join(' · ')}</b>가 각각 어느 쪽으로 뒤집히는지,
                    그 근거가 되는 글자(용신·희신·기신·구신)와 이유 한 줄씩.
                  </p>
                  <button className="btn" onClick={() => setPayOpen(true)}>내 신살이 어느 쪽인지 보기 →</button>
                </div>
              )}
              {premium && flipQ.loading && <p className="meta">길흉반전을 불러오는 중…</p>}
              <p style={{ marginTop: 10, fontSize: 12.5, color: 'var(--text-mute)', lineHeight: 1.6 }}>
                ※ 12신살은 <b>년지(띠) 기준</b>이 통설이라 위 목록은 년지로 잡았어요. 일지 기준으로 보는 학파도 있어 함께 적어둡니다 —{' '}
                <b>일지 기준</b>: {result.advanced.sin12.byDay.map((x) => `${x.name}(${x.ji})`).join(', ')}.
                {' '}천을귀인·문창·양인·괴강·백호·원진·귀문은 일간/일주 기준의 별도 신살입니다.
                {' '}<a href="/sinsal" style={{ color: 'var(--gold)' }}>12신살 사전 전체 보기 →</a>
              </p>
            </div>
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

          {/* ── 경계 진단 — 무료 구간의 '상품'. 자랑이 아니라 **당신 명식의 갈림길**을 보여준다 ── */}
          {result.boundary && (() => {
            const b = result.boundary!;
            const omit = b.variants.filter((v) => v.kind === '생략');
            const school = b.variants.filter((v) => v.kind === '학파');
            return (
              <div className="card bd-card" id="boundary">
                <h2>경계 진단 — 당신 명식이 갈릴 수 있는 지점</h2>
                <div className="meta" style={{ marginBottom: 14 }}>
                  같은 생년월일시인데 앱마다 사주가 다른 이유는 대개 아래 네 가지에서 갈립니다.
                  {' '}당신 명식이 그 경계의 어디에 서 있는지 그대로 보여드려요.
                </div>

                <div className="bd-facts">
                  <div><span>진태양시</span><b>{b.trueSolar.apparentSolarDateTime}</b>
                    <em>경도 보정 {b.trueSolar.longitudeCorrectionMin}분 · 균시차 {b.trueSolar.eotMin}분</em></div>
                  <div><span>가장 가까운 절입</span><b>{b.jeolgi.name}({b.jeolgi.hanja})</b>
                    <em>{b.jeolgi.whenKST} · {b.jeolgi.deltaMin >= 0 ? `${fmtDelta(b.jeolgi.deltaMin)} 지나서 출생` : `${fmtDelta(b.jeolgi.deltaMin)} 전에 출생`}</em></div>
                  <div><span>자시 · 서머타임</span><b>{b.jasiType ?? '시간 모름'}</b>
                    <em>{b.dstApplied ? '서머타임 기간 출생 — 1시간 되돌려 계산' : '서머타임 해당 없음'}</em></div>
                </div>

                {omit.length > 0 && (
                  <div className="bd-block">
                    <h3 className="bd-h">▸ 이 계산을 생략하면</h3>
                    {omit.map((v) => (
                      <div className="bd-row" key={v.key}>
                        <div className="bd-row-h"><b>{v.label}</b><span>{v.changed.join(' · ')}가 달라집니다</span></div>
                        <p className="bd-what">{v.what}</p>
                        <div className="bd-cmp">
                          <span className="bd-ours">헤아림 <b>{v.ours}</b></span>
                          <span className="bd-arrow">→</span>
                          <span className="bd-theirs">그 방식 <b>{v.theirs}</b></span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {school.map((v) => (
                  <div className="bd-block bd-school" key={v.key}>
                    <h3 className="bd-h">▸ 학파를 바꾸면 (정답이 둘)</h3>
                    <p className="bd-what">
                      자시는 <b>학파가 갈립니다.</b> 헤아림 기본값은 <b>야자시</b>(23시대도 그날 일주 유지)이고,
                      {' '}입력 화면에서 바꿀 수 있어요. {v.what}으로 보면 {v.changed.join(' · ')}가
                      {' '}<b>{v.ours}</b> 대신 <b>{v.theirs}</b>가 됩니다.
                    </p>
                    <p className="bd-neutral">여기서는 <b>어느 쪽이 맞다고 말하지 않습니다.</b> 계산이 아니라 관점의 문제예요.</p>
                  </div>
                )) }

                {/* 안심 카드 — 68%가 여기 해당한다. 겁을 주지 않는다는 증거라 반드시 띄운다.
                    ⚠️ 단 **시간을 모르면 시주·자시는 애초에 판단 대상이 아니다.** 그때 「어디서 보든 같다」고 말하면
                       사실보다 센 말이 된다(시각을 넣으면 갈릴 수 있다). 그래서 문구를 나눈다. */}
                {!b.anyChange && (b.unknownTime ? (
                  <div className="bd-safe">
                    <b>시각을 모르면 시주와 자시는 판단 대상이 아니에요.</b>
                    {/* ⚠️ 2026-09-23: 「년·월·일은 어디서 보든 같다」는 절입일·자정 직후 출생에게 거짓이 된다
                        (시각에 따라 월주·일주가 갈린다). 시각 미상 카드(timeScan)가 갈린다고 판정하면 그 말을 하지 않는다. */}
                    {result.timeScan?.pillars.some((p) => p.status === 'split') ? (
                      <> 다만 <b>{result.timeScan.pillars.filter((p) => p.status === 'split').map((p) => p.pillar).join('·')}는 태어난 시각에 따라</b> 달라져요 —
                        {' '}<a href="#time-unknown" style={{ color: 'var(--gold)' }}>「시각 없이 알 수 있는 것」</a>에 나눠 두었어요.</>
                    ) : (
                      <> 나머지 세 기둥(년·월·일)은 절기·경도 어느 쪽으로 계산해도
                        {' '}그대로라, <b>여기까지는 어디서 보든 같습니다.</b></>
                    )}
                    {' '}<b>태어난 시각을 알면</b> 시주가 붙고, 그때 갈릴 수 있는지도 이 자리에서 같이 알려드릴 수 있어요.
                  </div>
                ) : (
                  <div className="bd-safe">
                    <b>당신 명식은 경계에서 멀어요.</b> 진태양시·절기·자시 어느 쪽으로 계산해도 네 기둥이 그대로입니다 —
                    {' '}<b>어디서 보든 같은 명식</b>이 나온다는 뜻이에요. 겁줄 일이 아니라 그냥 사실이라, 있는 그대로 알려드립니다.
                  </div>
                ))}

                {b.unknownTime && b.anyChange && (
                  <p className="bd-note">※ 출생 시각을 모르면 시주와 자시는 비교 대상이 아니에요. 시간을 알면 이 진단이 훨씬 정확해집니다.</p>
                )}

                <p className="bd-close">
                  어느 쪽이 맞는지는 저희가 정하지 않았습니다. 『적천수천미』 원전에 실린 명식
                  {stats.cases > 0 ? <> <b>{stats.cases}건</b>으로</> : '으로'} 저희 판정을 채점하고, <b>틀린 것까지</b> 그대로 공개합니다.
                  {' '}<a href="/accuracy" style={{ color: 'var(--gold)' }}>정확도·검증 보기 →</a>
                </p>
              </div>
            );
          })()}

          <span id="sec-judge" className="sec-anchor" />
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
            <TermNote terms={['일간', '신강신약']} />
          </div>

          <div className="card">
            <h2>격국 · 용신 (格局 · 用神)</h2>
            <div className="chips">
              {yq ? (
                <>
                  <div className="chip">그릇 <b>{yq.gyeokguk.name}</b></div>
                  <div className="chip">용신 <b>{yq.yongsin.primary}(五行)</b></div>
                  <div className="chip">용신법 <b>{yq.yongsin.method}</b></div>
                </>
              ) : (
                <>
                  <div className="chip">그릇 후보 <b>{result.gyeokYong.gyeokCandidates?.join(' · ') ?? '—'}</b></div>
                  <div className="chip">용신 <b>{yongLock?.candidates.length ? `${yongLock.candidates.join(' · ')} 중 하나 🔒` : '한 답으로 모임 🔒'}</b></div>
                </>
              )}
              <div className="chip">조후 <b>{(yq?.johu ?? result.gyeokYong.johu)?.climate ?? '—'}</b></div>
            </div>
            <TermNote terms={['격국', '용신', '조후']} />

            {yq ? (
              <>
                <div className="basis-box">
                  <div className="basis-head">
                    <b>기준별 결론</b>
                    {yq.yongsin.conflict && <span className="basis-flag">기준에 따라 답이 갈립니다</span>}
                  </div>
                  {yq.yongsin.bases.map((b) => (
                    <div className={`basis-row${b.adopted ? ' on' : ''}`} key={b.method}>
                      <span className="basis-k">{b.method} 기준</span>
                      <span className="basis-v">{b.value ?? '—'}</span>
                      {b.adopted && <span className="basis-tag">채택</span>}
                      <span className="basis-n">{b.note}</span>
                    </div>
                  ))}
                  {yq.yongsin.lacking && (
                    <div className="cand-lack">
                      <b>결손 진단 — {yq.yongsin.lacking.value} 기운이 원국에 없습니다</b>
                      <div>{yq.yongsin.lacking.why}</div>
                      <div className="cand-lack-src">
                        ↳ 원전은 이런 판을 「<b>淸枯</b>」라 부릅니다 — 「壬水雖通根身庫, 總之無金滋助, 淸枯之象」(適天髓闡微 卷二 官殺).
                        {' '}쓸 용신은 있으나 그것을 <b>받쳐 줄 원천이 없는</b> 구조라, 그 기운이 오는 시기에 비로소 풀립니다.
                      </div>
                    </div>
                  )}
                  {yq.yongsin.decisive && (
                    <div className="cand-decisive">
                      <b>무엇이 갈랐나</b> — {yq.yongsin.decisive}
                    </div>
                  )}
                  {yq.yongsin.eokbuCandidates?.some((c) => c.structuralRoot) && (
                    <details className="cand-box">
                      <summary>억부 후보를 어떻게 추렸는지 보기 ({yq.yongsin.eokbuCandidates.length}개)</summary>
                      <div className="cand-notice">참고 정보 — <b>현재 용신 판정에는 미반영</b></div>
                      <div className="cand-legend">
                        아래 <b>관계적 뿌리</b>는 <b>점수에 들어가지 않습니다.</b> 어떤 후보가 채택됐는지와 무관하게,
                        {' '}판단에 쓸 수 있을지 검토 중인 값을 있는 그대로 보여드리는 칸입니다.
                        {' '}<br />
                        <b>구조적 뿌리</b> — 그 기운이 지지에 실제로 서 있는가(정기 · 합국 · 지장간). <b>이 층만 판정에 씁니다.</b>
                        {' '}<br />
                        <b>관계적 뿌리</b> — 그 기운을 <i>생해 주는</i> 세력이 지지에 서 있는가.
                        {' '}원전이 「無財則官亦無根」(재성이 없으면 관성도 뿌리가 없다)이라 한 층입니다.
                        {' '}같은 논리에서 원전이 어떤 곳은 재성을, 어떤 곳은 관성을 용신으로 지목해
                        {' '}가르는 조건이 확정되지 않아, 확인될 때까지 기록만 합니다.
                      </div>
                      {yq.yongsin.eokbuCandidates.map((c) => (
                        <div className="cand-row" key={c.group}>
                          <span className="cand-g">{c.group}</span>
                          <span className="cand-v">{c.value}</span>
                          <span className={`cand-root r-${c.structuralRoot ?? '없음'}`}>구조 {c.structuralRoot ?? '—'}</span>
                          <span className={`cand-root${c.relationalRoot ? ' on' : ''}`}>관계 {c.relationalRoot ? '있음' : '없음'}</span>
                          <span className="cand-n">
                            {c.reason}
                            {c.origin && (
                              <><br /><span className="cand-src">
                                ↳ <b>{c.origin.branch}</b> — 원전 「{c.origin.quote}」에 따라 연 후보
                              </span></>
                            )}
                          </span>
                        </div>
                      ))}
                    </details>
                  )}
                  <div className="basis-sum">
                    종합 — <b>{yq.yongsin.primary}</b>({yq.yongsin.method} 기준 채택)
                    {yq.yongsin.conflict && <span> · 다른 만세력에서 용신이 다르게 나온다면, 대개 계산이 아니라 <b>어느 기준을 먼저 쓰느냐</b>의 차이입니다.</span>}
                  </div>
                  <p className="basis-note">
                    ※ 『자평진전』이 말하는 ‘용신’은 <b>월령이 만든 격</b>(여기서는 {yq.gyeokguk.name})을 가리키는 말로,
                    위의 억부·조후 계열 용신과는 <b>다른 개념</b>입니다. 두 체계를 섞어 비교하면 서로 틀린 것처럼 보입니다.
                  </p>
                </div>
                <p style={{ marginTop: 10, opacity: 0.7, fontSize: 13 }}>판정 근거: {yq.gyeokguk.via} → {yq.gyeokguk.name}</p>
                <p style={{ marginTop: 10, opacity: 0.85, lineHeight: 1.6 }}>{yq.gyeokguk.desc}</p>
                <p style={{ marginTop: 6, opacity: 0.85, lineHeight: 1.6 }}>{yq.yongsin.desc}</p>
              </>
            ) : yongsinQ.loading ? (
              <p className="meta">용신 판정을 불러오는 중…</p>
            ) : yongLock ? (
              <div className="flip-gate">
                <div className="flip-gate-h">
                  {yongLock.candidateCount > 1 ? (
                    <>당신 명식의 용신은 <b>{yongLock.candidates.join(' · ')}</b> 사이에서 <b>갈립니다</b></>
                  ) : (
                    <>당신 명식은 <b>다섯 가지 법이 한 답으로 모이는</b> 자리입니다</>
                  )}
                </div>
                <p>
                  용신은 <b>어느 법을 먼저 쓰느냐</b>에서 갈려요. 5용신 정법(억부·조후·병약·통관·전왕) 중
                  {' '}당신 명식에서 값이 나온 건 <b>{yongLock.methodsCount}개</b>입니다.
                  {yongLock.candidateCount > 1
                    ? ' 다른 곳과 용신이 다르게 나온다면 대개 계산이 틀린 게 아니라, 여기서 갈린 겁니다.'
                    : ' 법이 갈려도 답이 같은, 흔들림 없는 자리예요. 그게 무엇이고 왜 그런지는 근거와 함께 리포트에서 열립니다.'}
                </p>
                <p className="flip-gate-what">
                  정밀 리포트에서 열리는 것 — <b>우리 엔진이 채택한 용신 하나와 그 근거</b>
                  (기준별 결론·채택과 기각 사유·무엇이 1·2위를 갈랐는지), <b>격국 확정</b>과 그릇 풀이
                  {yongLock.hasLacking && (
                    <>, 그리고 <b>결손 진단(淸枯)</b> — 쓸 기운은 있는데 그걸 <b>받쳐 줄 원천이 원국에 없는</b> 구조라 어느 기운이 올 때 풀리는지</>
                  )}.
                </p>
                <p className="flip-gate-what">
                  그리고 그 판정은 <b>채점받은 판정</b>입니다. 『적천수천미』 원전 명식으로 채점해 맞힌 것도 틀린 것도 전부 공개해 뒀어요 —{' '}
                  <a href="/accuracy" style={{ color: 'var(--gold)' }}>정확도·검증 보기 →</a>
                </p>
                <button className="btn" onClick={() => setPayOpen(true)}>내 용신이 무엇인지 보기 →</button>
              </div>
            ) : null}

            <p style={{ marginTop: 12, fontSize: 12.5, color: 'var(--text-mute)', lineHeight: 1.6 }}>
              ※ 신강·신약은 <b>득령(월지)·득지(일지)·득세</b>를 가중 합산해 판정하며, 득세는 일간 자신을 뺀 나머지 글자로 셉니다.
              용신은 서낙오 『자평수언』의 <b>5용신 정법 — 억부·조후·병약·통관·전왕(종격)</b>을 모두 계산해
              그중 <b>종격 → 조후 시급 → 병약 → 억부</b> 순으로 채택합니다.
              통관은 계산해 함께 보되 <b>채택 순위에서는 뒤에 둡니다</b> —
              저희 채점 기준인 『적천수천미』가 통관을 &lsquo;다리 오행을 용신으로 삼는 법&rsquo;이 아니라
              &lsquo;기운이 막히지 않고 흐르는가&rsquo;라는 <b>상태 평가</b>로 쓰기 때문입니다(卷二 通神論 通關).
              어떤 법을 우선하느냐는 학파에 따라 견해가 갈릴 수 있어요.
              {' '}격국은 자평진전 「用神專尋月令」에 따라 <b>월지 정기(본기)</b>를 기본으로 잡습니다 — 투출한 여기·중기를 격으로 잡는 곳도 있어, 그래서 곳마다 격이 갈립니다.
            </p>
          </div>

          <div className="card">
            <div className="chips">
              {Object.entries(result.sipsinSummary).sort((a, b) => b[1] - a[1]).map(([k, v]) => (
                <div className="chip" key={k}>{k} <b>×{v}</b></div>
              ))}
            </div>
          </div>

          <span id="sec-reading" className="sec-anchor" />
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

          <span id="sec-report" className="sec-anchor" />
          <div className="card premium">
            <h2>{premium ? '✓ 정밀 리포트 (구매 완료)' : '🔒 정밀 리포트 1건'}</h2>
            <p className="meta" style={{ marginBottom: 14 }}>이직·이사·계약·연애 — 진짜 결정을 앞뒀다면, 정밀 리포트에서 '언제, 어느 방향으로'까지 확인하세요.</p>
            {/* §E-4 ④ (2026-09-23) 6줄 목차 → 무료·유료 차이표. 칸 하나하나가 실제 게이팅과 맞아야 한다(PlanCompare.tsx 머리말) */}
            <PlanCompare />
            <Link href="/sample" className="pc-sample">
              <span>실제 리포트는 어떻게 생겼나 — 『적천수천미』 명식으로 뽑은 <b>용신 판정 1쪽</b></span>
              <b>샘플 보기 →</b>
            </Link>
            {/* 스펙 숫자는 여기가 제자리다 — 결제 직전, 「이거 믿어도 되나」 하는 순간. */}
            <p className="prem-verify">
              🔎 이 리포트가 읽는 명식은 <b>판정 엔진 v{ENGINE_VERSION}</b>으로 계산합니다 —{' '}
              NASA JPL 행성력 대비 <b>절기 오차 평균 6.8초</b> · 1900~2100 만세력 <b>71,733일 교차검증 100%</b>
              {stats.cases > 0 && <> · 고전 원전 <b>{stats.cases}건</b>으로 판정을 채점(틀린 것까지 공개)</>}.{' '}
              <Link href="/accuracy">검증 방법과 숫자 보기 →</Link>
            </p>
            {/* ⚠️ 2026-09-17 아래 결제 버튼의 취소선(₩9,900)을 제거했다.
                9,900 은 판매한 기간이 없어 종전거래가격이 아니다 — 카드사심사후_수정대기목록.md §D */}
            {premium
              ? <>
                  <div className="prem-unlocked">✓ 이 사주의 리포트를 구매하셨어요. 계정에 저장되어 언제든 다시 열람할 수 있습니다.</div>
                  <button className="btn ai-btn" onClick={onAiClick} disabled={aiLoading}>{aiLoading ? '심층 풀이 생성 중…' : '✨ 프리미엄 심층 풀이로 다시 풀기'}</button>
                </>
              : <button className="btn" onClick={() => setPayOpen(true)}>정밀 리포트 받기 · ₩{PRICE.toLocaleString()}</button>}
            <button className="btn guidebook-btn" onClick={() => { if (premium) window.print(); else setPayOpen(true); }}>
              📕 인생 가이드북 PDF로 저장{!premium && ' 🔒'}
            </button>
            <p className="meta" style={{ marginTop: 10, fontSize: 12 }}>인쇄 창에서 ‘대상 → PDF로 저장’을 고르면 고품질 가이드북이 파일로 저장돼요.</p>
          </div>

          <Receipts />

          <span id="sec-luck" className="sec-anchor" />
          <div className="card">
            <h2>10년 대운 흐름 (大運)</h2>
            <div className="meta" style={{ marginBottom: 6 }}>
              <b>{result.luck.direction}</b> · 대운수 <b>{result.luck.startAge ?? Math.max(1, Math.round(result.luck.daewoonAge))}</b>
              {result.luck.qiyun && (
                <> (정밀 起運 {result.luck.qiyun.years}년 {result.luck.qiyun.months}개월
                  {result.luck.qiyun.approx ? ' · 출생 시각을 몰라 ±4개월' : ''})</>
              )} ·
              매 10년 단위로 바뀌는 인생의 큰 흐름입니다. 선이 위일수록 일간 강약 기준으로 우호적인 글자가 들어오는 10년입니다.
            </div>
            <LuckGraph items={result.luck.daewoon} mode="age" />
            {/* §E-5 (2026-09-23) 요약 한 줄 — 곡선 안의 상대 위치만. 전성기·최고의 운 같은 단정 금지, 동점은 전부, 원점수 비노출 */}
            {(() => {
              const s = daewoonSummary(result.luck.daewoon, new Date().getFullYear());
              if (!s) return null;
              return (
                <div className="luck-sum">
                  <p className="luck-peak">{peakSentence(s).split('\n').map((l, i) => <span key={i}>{i > 0 && <br />}{l}</span>)}</p>
                  {nowSentence(s) && <p className="luck-now">{nowSentence(s)}{result.luck.qiyun?.approx && <><br />{APPROX_SENTENCE}</>}</p>}
                  <p className="luck-zero">{ZERO_SENTENCE}</p>
                  <details className="daily-fold">
                    <summary>계산</summary>
                    <ul className="daily-formula">{LUCK_FORMULA.map((l) => <li key={l}>{l}</li>)}</ul>
                  </details>
                </div>
              );
            })()}
          </div>

          <div className="card">
            <h2>세운 흐름 (歲運) · 올해부터 10년</h2>
            <div className="meta" style={{ marginBottom: 6 }}>해마다 들어오는 1년 단위 운. 파란 선이 <b>올해</b>입니다.</div>
            <LuckGraph items={result.luck.sewoon} mode="year" nowYear={result.luck.sewoon[0]?.year} />
          </div>

          <DailyFortune result={result} />

          <YearlyFortune result={result} premium={premium} onLocked={() => setPayOpen(true)} reqBody={premiumBody} />

          <AuspiciousDates result={result} premium={premium} onLocked={() => setPayOpen(true)} reqBody={premiumBody} />

          {/* 바이럴 루프: 궁합은 상대를 데려와야 완성 — 결과 직후 최상단 배치 */}
          <span id="sec-tools" className="sec-anchor" />
          <div className="card" style={{ textAlign: 'center' }}>
            <h2>💞 이 사주, 그 사람이랑은?</h2>
            <div className="meta" style={{ marginBottom: 14 }}>사주는 혼자 보지만 궁합은 둘이 봐야 완성돼요. 초대 문구를 보내서 서로의 명식으로 확인해 보세요. 궁합 점수는 무료!</div>
            <div className="share-actions" style={{ justifyContent: 'center' }}>
              <Link href="/gunghap" className="btn share-btn" style={{ textDecoration: 'none' }}>💞 우리 궁합 보러 가기</Link>
              <button className="btn share-btn ghost" onClick={copyInviteLink}>🔗 초대 문구 복사</button>
            </div>
          </div>

          <GaeunCard result={result} premium={premium} onLocked={() => setPayOpen(true)} gaeun={gaeunQ} />

          <NamingCard result={result} />

          <TalismanCard result={result} />

          <ShareCard result={result} />

          <Link href="/gunghap" className="gunghap-cta">
            💞 친구·연인과 사주 궁합 확인하기 →
          </Link>

          <GuidebookPrint result={result} ai={ai} gaeun={gaeunQ.data} />

          <ReviewPrompt chart={chart} premium={premium} />
        </>
      )}

      <div className="account-inline">
        <AccountButton />
      </div>

      <div className="foot">
        만세력 엔진: VSOP87 천문 알고리즘 기반 절기·균시차 자체 연산 · 절기 시각 KASI 공표값 1분 이내 일치 · 일주 60갑자 국제표준 보정
        {' '}· <a href="/accuracy" style={{ color: 'var(--gold)' }}>정확도·검증 상세</a>
        {/* 결과가 있으면 위 「경계 진단」 카드가 이 명식 기준으로 같은 말을 한다 — 두 번 말하지 않는다 */}
        {!result && <><br />※ 경계 시각(절기 전후·자정 무렵) 출생은 한국천문연구원(KASI) 교차검증 권장</>}
      </div>

      <Paywall
        open={payOpen}
        onClose={() => setPayOpen(false)}
        onUnlock={handleUnlock}
        chart={chart}
        productName="사주 정밀 리포트 1건"
      />
      {notice && <div className="toast">{notice}</div>}
    </main>
  );
}

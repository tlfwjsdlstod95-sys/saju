// 전환 대시보드 — 운영자 전용. /api/ev 가 쌓은 날짜별 카운터를 읽기만 한다.
// 어디서도 링크하지 않고 검색엔진에도 넣지 않는다.
import type { Metadata } from 'next';
import { Redis } from '@upstash/redis';
import { currentUid, isOwnerUid } from '@/lib/entitlement';
import { kstDay } from '@/lib/trackSpec';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: '전환 지표 | 헤아림', robots: { index: false, follow: false } };

const DAYS = 14;
type Counts = Record<string, number>;

async function load(): Promise<{ days: { day: string; c: Counts }[]; ok: boolean }> {
  const url = process.env.UPSTASH_REDIS_REST_URL, tok = process.env.UPSTASH_REDIS_REST_TOKEN;
  const list = Array.from({ length: DAYS }, (_, i) => kstDay(new Date(Date.now() - i * 86400000)));
  if (!url || !tok) return { days: list.map((day) => ({ day, c: {} })), ok: false };
  const redis = Redis.fromEnv();
  const rows = await Promise.all(list.map((d) => redis.hgetall<Record<string, number | string>>(`ev:${d}`).catch(() => null)));
  return {
    ok: true,
    days: list.map((day, i) => {
      const c: Counts = {};
      for (const [k, v] of Object.entries(rows[i] ?? {})) c[k] = Number(v) || 0;
      return { day, c };
    }),
  };
}

const sum = (days: { c: Counts }[], k: string) => days.reduce((a, d) => a + (d.c[k] ?? 0), 0);
const pct = (a: number, b: number) => (b ? `${((a / b) * 100).toFixed(1)}%` : '—');
const th = { padding: '8px 8px', textAlign: 'left' as const, whiteSpace: 'nowrap' as const, fontSize: 12.5, color: 'var(--text-mute)' };
const td = { padding: '8px 8px', borderTop: '1px solid var(--border)', fontSize: 14, whiteSpace: 'nowrap' as const };

export default async function StatsPage() {
  const uid = await currentUid();
  if (!isOwnerUid(uid)) {
    return <main className="wrap"><div className="card"><h2>전환 지표</h2><p className="meta">운영자 계정으로 로그인해야 볼 수 있어요.</p></div></main>;
  }
  const { days, ok } = await load();
  const cols: [string, string][] = [
    ['saju_complete', '명식'], ['gunghap_complete', '궁합'], ['gunghap_share', '궁합 공유'],
    ['paywall_open', '결제창'], ['pay_click', '결제 클릭'], ['pay_success', '결제 성공'],
  ];
  // 출처 목록
  const srcs = new Set<string>();
  for (const d of days) for (const k of Object.keys(d.c)) { const m = k.match(/^saju_complete\|src=([^|]+)$|^pay_success\|src=([^|]+)$|^gunghap_complete\|src=([^|]+)$/); if (m) srcs.add(m[1] ?? m[2] ?? m[3]); }
  const srcRows = [...srcs].map((s) => ({
    s, saju: sum(days, `saju_complete|src=${s}`), gh: sum(days, `gunghap_complete|src=${s}`),
    open: sum(days, `paywall_open|src=${s}`), paid: sum(days, `pay_success|src=${s}`),
  })).sort((a, b) => (b.saju + b.gh) - (a.saju + a.gh));
  const bd = (['changed', 'stable', 'unknown'] as const).map((b) => ({
    b, saju: sum(days, `saju_complete|boundary=${b}`), paid: sum(days, `pay_success|boundary=${b}`),
  }));
  const rate = (x: { saju: number; paid: number }) => (x.saju ? x.paid / x.saju : 0);
  const ratio = rate(bd[1]) ? rate(bd[0]) / rate(bd[1]) : null;
  const label: Record<string, string> = { changed: '경계에서 갈림', stable: '네 기둥 그대로', unknown: '시간 모름' };

  return (
    <main className="wrap">
      <div className="hero" style={{ paddingTop: 32, marginBottom: 20 }}>
        <div className="hero-kr">指標</div>
        <h1 style={{ fontSize: 'clamp(22px, 4.5vw, 32px)' }}>전환 지표</h1>
        <p>최근 {DAYS}일 · 한국 시간 기준 · 운영자 본인 기기(사장 모드)와 테스트 결제는 세지 않습니다.</p>
      </div>
      {!ok && <div className="warn">Upstash 환경변수가 없어 아직 쌓이지 않습니다.</div>}

      <div className="card">
        <h2>합격선 — 경계에서 갈린 사람이 더 사는가</h2>
        <p className="meta">목표: 「경계에서 갈림」 결제율이 「네 기둥 그대로」의 2배 이상.</p>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr><th style={th}>명식 상태</th><th style={th}>명식 완료</th><th style={th}>결제 성공</th><th style={th}>결제율</th></tr></thead>
            <tbody>{bd.map((x) => (
              <tr key={x.b}><td style={td}>{label[x.b]}</td><td style={td}>{x.saju}</td><td style={td}>{x.paid}</td><td style={td}>{pct(x.paid, x.saju)}</td></tr>
            ))}</tbody>
          </table>
        </div>
        <p style={{ marginTop: 10, fontSize: 15 }}>
          배율: <b style={{ color: 'var(--gold)' }}>{ratio == null ? '아직 비교할 수 없음' : `${ratio.toFixed(2)}배`}</b>
          {ratio != null && <span className="meta"> (결제 30건 전에는 우연이 큽니다)</span>}
        </p>
      </div>

      <div className="card">
        <h2>출처별 (최근 {DAYS}일 합)</h2>
        <p className="meta">첫 방문 기준 30일. 인스타 프로필 링크에 <code>?utm_source=instagram</code> 처럼 붙이면 더 정확합니다.</p>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr><th style={th}>출처</th><th style={th}>명식</th><th style={th}>궁합</th><th style={th}>결제창</th><th style={th}>결제</th><th style={th}>결제율</th></tr></thead>
            <tbody>{srcRows.length ? srcRows.map((r) => (
              <tr key={r.s}><td style={td}>{r.s}</td><td style={td}>{r.saju}</td><td style={td}>{r.gh}</td><td style={td}>{r.open}</td><td style={td}>{r.paid}</td><td style={td}>{pct(r.paid, r.saju + r.gh)}</td></tr>
            )) : <tr><td style={td} colSpan={6}>아직 기록이 없어요.</td></tr>}</tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <h2>날짜별</h2>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr><th style={th}>날짜</th>{cols.map(([, n]) => <th key={n} style={th}>{n}</th>)}</tr></thead>
            <tbody>{days.map((d) => (
              <tr key={d.day}><td style={td}>{d.day.slice(5)}</td>{cols.map(([k]) => <td key={k} style={td}>{d.c[k] ?? 0}</td>)}</tr>
            ))}</tbody>
            <tfoot><tr><td style={{ ...td, fontWeight: 700 }}>합계</td>{cols.map(([k]) => <td key={k} style={{ ...td, fontWeight: 700 }}>{sum(days, k)}</td>)}</tr></tfoot>
          </table>
        </div>
      </div>
    </main>
  );
}

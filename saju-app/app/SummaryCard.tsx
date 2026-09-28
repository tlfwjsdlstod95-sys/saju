'use client';
// 결과 상단 요약 카드 (§E-4 ②) — 상태 태그 · 한 줄 진단 · 경계 알림 · 계산 기준 · 엔진 버전.
// 명식표 위 경계 배지와 명식 카드 아래 엔진 띠(2026-09-10)를 이리로 옮겼다 — 같은 말을 한 화면에 두 번 하지 않는다.
// 내용은 전부 lib/saju/summary.ts 가 만든다(검증: scripts/test-summary.ts). 이 파일은 그리기만 한다.
import Link from 'next/link';
import { useMemo } from 'react';
import { buildSummary } from '@/lib/saju/summary';
import { ENGINE_VERSION } from '@/lib/saju/version';
import type { SajuCore } from '@/lib/saju/types';
import type { BoundaryDiag } from '@/lib/saju/boundary';

const TONE_IC = { safe: '✓', warn: '⚠', mute: '○' } as const;

export default function SummaryCard({ result }: { result: SajuCore & { boundary?: BoundaryDiag } }) {
  const s = useMemo(() => buildSummary(result, result.boundary), [result]);
  return (
    <div className="card sum-card">
      <h2>이 명식 한눈에</h2>

      {s.tags.length > 0 && (
        <div className="sum-tags">
          {s.tags.map((t) => (
            <span className={`sum-tag ${t.tone}`} key={t.key}>{TONE_IC[t.tone]} {t.label}</span>
          ))}
        </div>
      )}

      <p className="sum-diag">{s.diagnosis.map((d, i) => (
        <span key={i}>{i > 0 && <i> · </i>}{i === 0 ? <b>{d}</b> : d}</span>
      ))}</p>

      {s.scenes.length > 0 && (
        <ul className="sum-scenes">
          {s.scenes.map((t) => <li key={t}>{t}</li>)}
        </ul>
      )}

      {s.notes.length > 0 ? (
        <div className="ms-badges">
          {s.notes.map((t) => (
            <a className="ms-badge" href="#boundary" key={t}>⚠ {t} <span>확인 →</span></a>
          ))}
        </div>
      ) : s.safeLine && (
        <p className="ms-safe">✓ {s.safeLine} <a href={s.safeHref}>{s.safeHref === '#time-unknown' ? '보기 →' : '왜 그런지 보기 →'}</a></p>
      )}

      <dl className="sum-crit">
        {s.criteria.map((c) => (
          <div key={c.k}><dt>{c.k}</dt><dd>{c.v}</dd></div>
        ))}
      </dl>

      <Link href="/accuracy" className="verify-strip">
        <span className="vs-ic">🔎</span>
        <span className="vs-txt">
          이 명식은 <b>판정 엔진 v{ENGINE_VERSION}</b>으로 계산했어요 — 진태양시·균시차·야자시 보정,
          절기 오차 평균 6.8초(NASA JPL 행성력 대비)
        </span>
        <span className="vs-go">이렇게 검증했어요 →</span>
      </Link>
    </div>
  );
}

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
  // 「신미(辛未) 일주 · 신강 · 겉에 편재·상관」 — % 와 결손 오행은 뺀다
  const short = useMemo(() => {
    const out = [s.diagnosis[0]];
    if (s.diagnosis[1]) out.push(s.diagnosis[1].replace(/\s*\d+%$/, ''));
    const m = s.scenes[0]?.match(/겉에는 ([^.]+?)입니다/);
    if (m) out.push(`겉에 ${m[1]}`);
    return out;
  }, [s]);
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

      {/* 2026-09-30 세 줄로 — 강약 %·오행 결손·합충 개수는 2 판정 탭에 있다 */}
      <p className="sum-diag">{short.map((d, i) => (
        <span key={i}>{i > 0 && <i> · </i>}{i === 0 ? <b>{d}</b> : d}</span>
      ))}</p>

      {s.notes.length > 0 ? (
        <div className="ms-badges">
          {s.notes.map((t) => (
            <a className="ms-badge" href="#boundary" key={t}>⚠ {t} <span>확인 →</span></a>
          ))}
        </div>
      ) : s.safeLine && (
        <p className="ms-safe">✓ {s.safeLine} <a href={s.safeHref}>{s.safeHref === '#time-unknown' ? '보기 →' : '왜 그런지 보기 →'}</a></p>
      )}

      {/* 진태양시 분·초는 경계 진단 한 곳에만. 6.8초는 절기 오차라 여기 두면 「해 시각 오차」로 읽힌다 → 링크만 */}
      <Link href="/accuracy" className="sum-verify">판정 엔진 v{ENGINE_VERSION} · 계산 방법과 검증 보기 →</Link>
    </div>
  );
}

'use client';
// 결과 상단 요약 카드 (§E-4 ②) — 상태 태그 · 한 줄 진단 · 경계 알림 · 계산 기준 · 엔진 버전.
// 명식표 위 경계 배지와 명식 카드 아래 엔진 띠(2026-09-10)를 이리로 옮겼다 — 같은 말을 한 화면에 두 번 하지 않는다.
// 내용은 전부 lib/saju/summary.ts 가 만든다(검증: scripts/test-summary.ts). 이 파일은 그리기만 한다.
import Link from 'next/link';
import { useMemo } from 'react';
import { buildSummary } from '@/lib/saju/summary';
import { ENGINE_VERSION } from '@/lib/saju/version';
import { iljuCharacter } from '@/lib/saju/ilju';
import { SIPSIN_PLAIN } from '@/lib/glossary';
import type { SajuCore } from '@/lib/saju/types';
import type { BoundaryDiag } from '@/lib/saju/boundary';

const TONE_IC = { safe: '✓', warn: '⚠', mute: '○' } as const;

export default function SummaryCard({ result }: { result: SajuCore & { boundary?: BoundaryDiag } }) {
  const s = useMemo(() => buildSummary(result, result.boundary), [result]);
  // 2026-09-30 쉬운 말이 먼저 — 「신미일주 — '흙 속의 옥'」 + 한 문장, 강약·십신은 뜻으로 풀고 용어는 괄호에
  const plain = useMemo(() => {
    const d = result.pillars.day;
    const c = iljuCharacter(d.gan, d.ji);
    const trait = (c.trait.match(/^[^.!?]+[.!?]/)?.[0] ?? c.trait).trim();
    const tier = s.diagnosis[1]?.replace(/\s*\d+%$/, '') ?? '';
    const tierPlain = tier === '신강' ? '기운이 센 편' : tier === '신약' ? '기운이 여린 편' : tier ? '기운이 고른 편' : '';
    const names = s.scenes[0]?.match(/겉에는 ([^.]+?)입니다/)?.[1].split('·').filter((n) => SIPSIN_PLAIN[n]) ?? [];
    const outer = names.map((n) => `${SIPSIN_PLAIN[n].replace(/\(.*\)$/, '')}(${n})`).join(' · ');
    return { title: `${c.name} — '${c.tag}'`, trait, tier, tierPlain, outer };
  }, [s, result]);
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

      {/* 2026-09-30 쉬운 말 — 비유 한 줄 → 한 문장 → 뜻으로 푼 강약·겉에 드러난 힘 (용어는 괄호) */}
      <p className="sum-title">{plain.title}</p>
      <p className="sum-trait">{plain.trait}</p>
      <ul className="sum-plain">
        {plain.tierPlain && <li><span>타고난 기운</span>{plain.tierPlain}{plain.tier && <em>({plain.tier})</em>}</li>}
        {plain.outer && <li><span>겉으로 드러난 힘</span>{plain.outer}</li>}
      </ul>

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

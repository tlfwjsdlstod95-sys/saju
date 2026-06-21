'use client';

import type { SajuResult, Pillar } from '@/lib/saju/types';
import { computeHapchung } from '@/lib/saju/hapchung';
import { computeGaeun } from '@/lib/saju/gaeun';

interface Section { key: string; icon: string; label: string; title: string; body: string }

const OH = ['목', '화', '토', '금', '수'] as const;

function Cell({ pos, p }: { pos: string; p: Pillar | null }) {
  if (!p) return <td className="gb-gz"><div className="gb-pos">{pos}</div><div className="gb-empty">—</div><div className="gb-sub">시간 미상</div></td>;
  return (
    <td className="gb-gz">
      <div className="gb-pos">{pos}</div>
      <div className="gb-han">{p.ganHanja}</div>
      <div className="gb-sub">{p.ganKor} · {p.ganSipsin ?? '일간'}</div>
      <div className="gb-han">{p.jiHanja}</div>
      <div className="gb-sub">{p.jiKor} · {p.jiSipsin}</div>
    </td>
  );
}

export default function GuidebookPrint({ result, ai }: { result: SajuResult; ai: { lead: string; sections: Section[] } | null }) {
  const r = result;
  const name = r.input.name || '당신';
  const nowYear = new Date().getFullYear();
  const age = nowYear - r.input.year;
  const lead = ai && ai.lead ? ai.lead : r.readingLead;
  const sections: Section[] = ai && ai.sections.length ? ai.sections : (r.interpretations as any);
  const maxOh = Math.max(...OH.map((o) => (r.ohaeng as any)[o]), 1);
  const curDw = [...r.luck.daewoon].reverse().find((d) => age >= d.age) ?? r.luck.daewoon[0];
  const thisY = r.luck.sewoon[0];
  const strengthPct = Math.round(r.dayMasterStrength * 100);
  const strengthLabel = r.dayMasterStrength >= 0.55 ? '신강(주관·추진형)' : r.dayMasterStrength <= 0.38 ? '신약(관계·환경 활용형)' : '중화(균형형)';
  const hapchung = computeHapchung(r.pillars);
  const gaeun = computeGaeun(r);

  return (
    <div className="guidebook-print">
      {/* 표지 */}
      <section className="gb-cover">
        <div className="gb-cover-mark">命理 · 人生 가이드북</div>
        <div className="gb-cover-motif">{r.archetype.symbol}</div>
        <h1 className="gb-cover-title">{name}님의 사주 인생 가이드북</h1>
        <p className="gb-cover-sub">{r.archetype.motif.name} · 일주 {r.pillars.day.ganKor}{r.pillars.day.jiKor}({r.pillars.day.ganHanja}{r.pillars.day.jiHanja})</p>
        <p className="gb-cover-meta">
          {r.input.year}년 {r.input.month}월 {r.input.day}일 {r.pillars.hour ? '출생' : '(출생시간 미상)'} · {r.input.sex === 'F' ? '여성' : '남성'} · 발행 {nowYear}.{String(new Date().getMonth() + 1).padStart(2, '0')}.{String(new Date().getDate()).padStart(2, '0')}
        </p>
        <p className="gb-quote">“{lead}”</p>
      </section>

      {/* 명식 + 핵심 지표 */}
      <section className="gb-sec">
        <h2 className="gb-h2">Ⅰ. 사주 명식 (四柱)</h2>
        <table className="gb-table">
          <thead><tr><th></th><th>시주(時)</th><th>일주(日)</th><th>월주(月)</th><th>년주(年)</th></tr></thead>
          <tbody><tr>
            <td className="gb-rowh">천간<br />지지</td>
            <Cell pos="時" p={r.pillars.hour} />
            <Cell pos="日 (나)" p={r.pillars.day} />
            <Cell pos="月" p={r.pillars.month} />
            <Cell pos="年" p={r.pillars.year} />
          </tr></tbody>
        </table>

        <div className="gb-grid2">
          <div>
            <h3 className="gb-h3">오행 분포 (五行)</h3>
            {OH.map((o) => {
              const c = (r.ohaeng as any)[o] as number;
              const st = (r.ohaeng.status as any)[o];
              return (
                <div className="gb-bar" key={o}>
                  <span className="gb-bar-l">{o}</span>
                  <span className="gb-bar-track"><i style={{ width: `${(c / maxOh) * 100}%` }} /></span>
                  <span className="gb-bar-v">{c}{st ? ` (${st})` : ''}</span>
                </div>
              );
            })}
          </div>
          <div>
            <h3 className="gb-h3">핵심 지표</h3>
            <ul className="gb-kv">
              <li><b>일간(나)</b> {r.dayMaster.ganKor}({r.dayMaster.ohaeng})</li>
              <li><b>신강·신약</b> {strengthLabel} · {strengthPct}/100</li>
              <li><b>십신</b> {Object.entries(r.sipsinSummary).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}×${v}`).join(', ')}</li>
              <li><b>공망</b> {r.advanced.gongmang.branches.join(', ')}</li>
              {r.advanced.sinsal.length > 0 && <li><b>신살</b> {r.advanced.sinsal.map((s) => s.name).join(', ')}</li>}
            </ul>
          </div>
        </div>
      </section>

      {/* 풀이 */}
      <section className="gb-sec">
        <h2 className="gb-h2">Ⅱ. 사주 풀이</h2>
        {sections.map((s, i) => (
          <div className="gb-read" key={s.key || i}>
            <h3 className="gb-read-h">{s.icon} {s.label} — {s.title}</h3>
            {String(s.body).split('\n\n').map((p, j) => <p key={j} className="gb-read-p">{p}</p>)}
          </div>
        ))}
      </section>

      {/* 운의 흐름 */}
      <section className="gb-sec">
        <h2 className="gb-h2">Ⅲ. 운의 흐름</h2>
        <p className="gb-read-p">
          <b>현재 대운</b> ({curDw.age}세~): {curDw.ganKor}{curDw.jiKor}({curDw.ganHanja}{curDw.jiHanja}) · 길흉지수 {curDw.score}/100.
          매 10년 단위로 바뀌는 인생의 큰 흐름입니다.
        </p>
        <p className="gb-read-p">
          <b>올해 세운</b> ({thisY.year}년): {thisY.ganKor}{thisY.jiKor} · 일간 기준 {thisY.ganSipsin} 운 · 길흉지수 {thisY.score}/100.
        </p>
        <h3 className="gb-h3">향후 10년 세운</h3>
        <table className="gb-luck">
          <thead><tr>{r.luck.sewoon.map((d) => <th key={d.year}>{d.year}</th>)}</tr></thead>
          <tbody>
            <tr>{r.luck.sewoon.map((d) => <td key={d.year}>{d.ganHanja}{d.jiHanja}</td>)}</tr>
            <tr>{r.luck.sewoon.map((d) => <td key={d.year} className={d.score >= 20 ? 'gb-good' : d.score <= -20 ? 'gb-bad' : ''}>{d.score > 0 ? '+' : ''}{d.score}</td>)}</tr>
          </tbody>
        </table>
      </section>

      {/* 합충 관계 */}
      {hapchung.length > 0 && (
        <section className="gb-sec">
          <h2 className="gb-h2">Ⅳ. 합충(合沖) 관계</h2>
          {hapchung.map((h, i) => (
            <p className="gb-read-p" key={i}><b>{h.name}</b> ({h.positions.join('·')}) — {h.desc}</p>
          ))}
        </section>
      )}

      {/* 개운법 */}
      <section className="gb-sec">
        <h2 className="gb-h2">{hapchung.length > 0 ? 'Ⅴ' : 'Ⅳ'}. 나만의 개운법</h2>
        <p className="gb-read-p">{gaeun.reason}</p>
        <ul className="gb-kv">
          <li><b>행운의 색</b> {gaeun.primary.color} · <b>방위</b> {gaeun.primary.direction}</li>
          <li><b>도움 음식</b> {gaeun.primary.foods}</li>
          <li><b>운을 키우는 활동</b> {gaeun.primary.activities}</li>
          <li><b>어울리는 일</b> {gaeun.primary.careers}</li>
          <li><b>곁에 둘 소품</b> {gaeun.primary.items}</li>
        </ul>
        {gaeun.cautionText && <p className="gb-fine">※ {gaeun.cautionText}</p>}
      </section>

      <section className="gb-sec gb-outro">
        <p className="gb-read-p">이 가이드북은 한국천문연구원(KASI) 기준으로 검증된 정밀 만세력 엔진(진태양시·균시차·경도·야자시 보정)으로 도출한 명식을 바탕으로 작성되었습니다.</p>
        <p className="gb-fine">※ 사주는 타고난 기질과 흐름의 참고 자료입니다. 인생의 선택과 책임은 언제나 당신의 것입니다. — {name}님의 좋은 길을 응원합니다.</p>
      </section>
    </div>
  );
}

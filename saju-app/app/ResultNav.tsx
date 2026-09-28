'use client';
// 결과 화면 목차 칩 (2026-09-28) — 카드 26개 · 약 19,000px 를 장(章) 여섯 개로 끊는다.
// 청월당식 「장 구조」의 형식만 가져왔다(캐릭터 없음). 상단에 붙어 따라오고, 지금 읽는 장이 금색이 된다.
// 앵커는 page.tsx 의 <span id="sec-*" className="sec-anchor" /> — 카드 순서를 바꾸면 앵커도 같이 옮긴다.
import { useEffect, useState } from 'react';

export const RESULT_SECTIONS = [
  { id: 'sec-myeongsik', label: '명식' },
  { id: 'sec-judge', label: '판정' },
  { id: 'sec-reading', label: '풀이' },
  { id: 'sec-report', label: '리포트' },
  { id: 'sec-luck', label: '운세' },
  { id: 'sec-tools', label: '도구' },
] as const;

export default function ResultNav() {
  const [active, setActive] = useState<string>(RESULT_SECTIONS[0].id);
  useEffect(() => {
    const els = RESULT_SECTIONS.map((s) => document.getElementById(s.id)).filter(Boolean) as HTMLElement[];
    const onScroll = () => {
      // 화면 위쪽 1/4 선을 지난 마지막 앵커가 지금 장
      const line = window.innerHeight * 0.25;
      let cur = els[0]?.id;
      for (const el of els) if (el.getBoundingClientRect().top <= line) cur = el.id;
      if (cur) setActive(cur);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  return (
    <nav className="result-nav" aria-label="결과 목차">
      {RESULT_SECTIONS.map((s, i) => (
        <a key={s.id} href={`#${s.id}`} className={active === s.id ? 'on' : ''}
          onClick={(e) => { e.preventDefault(); document.getElementById(s.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}>
          <em>{i + 1}</em>{s.label}
        </a>
      ))}
    </nav>
  );
}

// 문장 규칙 린트 — 「헤아림_문장규칙_외부제안_대조.md」 B안 (2026-09-23 승혁 확정)
//
// 전면(무료·유료 공통): 금지 사전 · 예언 동사 · 「당신은 ~형/~한 사람입니다」.
// 무료 카드 줄에만: 길이 소프트 28 / 하드 36 (NFC 음절+공백). 22자가 아니다 —
//   22는 「한 줄 = 사실 하나」를 노린 레이아웃 휴리스틱이었고, 실제 카드 CSS 에서 한 줄이 28자 안팎이다.
//   유료 리포트에는 길이 제한을 걸지 않는다(10주제 × 3~5문장 상품이 문장 단위로 깨진다).
// 의존성 0 — 화면·테스트·서버 어디서나 쓴다.

/** 무료·유료 공통 금지어 */
export const BANNED = ['대박', '반드시', '운명', '재회된다', '적중', '전성기', '전형적인'] as const;
/** 예언 동사 — 일어날 일을 단정하는 어미 */
export const PROPHETIC = /(잘\s?될 것|안\s?될 것|이뤄집니다|이루어집니다|만나게 됩니다|헤어지게 됩니다|재회합니다|성공합니다|부자가 됩니다|대박 납니다)/;
/** 사람을 규정하는 문형 */
export const LABELING = /당신은\s?[^.。]{0,20}(형|한 사람|인 사람)(입니다|이에요|예요)/;

export const CARD_LEN = { soft: 28, hard: 36 } as const;
export const cardLen = (s: string) => [...s.normalize('NFC').trim()].length;

/** 성격 평가로 끝나는 장면 — 금지어와 같은 급(실패) */
export const VERDICT = /성격이\s?(좋|나쁘|나빠|좋아)/;

export interface LintIssue { rule: 'banned' | 'prophecy' | 'labeling' | 'verdict' | 'too_long' | 'long'; detail: string }

/** 공통 규칙(유료 포함) */
export function lintCommon(s: string): LintIssue[] {
  const out: LintIssue[] = [];
  for (const w of BANNED) if (s.includes(w)) out.push({ rule: 'banned', detail: w });
  const p = s.match(PROPHETIC); if (p) out.push({ rule: 'prophecy', detail: p[0] });
  const l = s.match(LABELING); if (l) out.push({ rule: 'labeling', detail: l[0] });
  const v = s.match(VERDICT); if (v) out.push({ rule: 'verdict', detail: v[0] });
  return out;
}

/** 무료 카드 한 줄(한 문장) — 공통 규칙 + 길이. `long` 은 경고(소프트), `too_long` 은 실패(하드) */
export function lintCardLine(s: string): LintIssue[] {
  const out = lintCommon(s);
  const n = cardLen(s);
  if (n > CARD_LEN.hard) out.push({ rule: 'too_long', detail: `${n}자` });
  else if (n > CARD_LEN.soft) out.push({ rule: 'long', detail: `${n}자` });
  return out;
}

/**
 * 자극 경고(실패 아님, 2026-09-23) — 밋밋한 장면을 찾는다. 배포를 막지 않는다.
 *  · 장면 문장에 동사 없이 「있습니다」만 반복 · 「편입니다」가 연속 두 줄
 */
export function stimulusWarnings(lines: string[]): string[] {
  const w: string[] = [];
  for (const l of lines) {
    const sents = l.split(/(?<=[.다요])\s+/).filter(Boolean);
    if (sents.length && sents.every((x) => /있습니다\.?$/.test(x.trim()))) w.push(`동사 없는 장면: ${l}`);
  }
  for (let i = 1; i < lines.length; i++) if (/편입니다\.?$/.test(lines[i - 1].trim()) && /편입니다\.?$/.test(lines[i].trim())) w.push(`「편입니다」 연속: ${lines[i]}`);
  return w;
}

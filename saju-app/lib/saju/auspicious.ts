// 택일(擇日) — 사주 기준 좋은 날 고르기. 일진을 일간에 대입해 점수화 + 일지충 회피 + 일간합 + 목적별 가중.
// favor.ts 결정론 식(무작위 0) + 가감점 상수(AUSP_RULE). 식은 auspFormula() 로 화면 「계산」칸에 그대로 나간다.
import { CHEONGAN, CHEONGAN_HANJA, JIJI, JIJI_HANJA, GAN_OHAENG, JI_OHAENG } from './constants';
import { pillarRaw, favorToScore, favorFormula, FAVOR_RULE } from './favor';
import { GAN_HAP } from './hapchung';
import { pillarRelations, relationSum, relationTags, DAILY_RULE } from './daily';
import { solarToLunar } from './lunar';
import { gregorianToJDN } from './astro';
import type { SajuResult } from './types';

export type Purpose = 'wedding' | 'moving' | 'contract' | 'travel' | 'decision';

export const PURPOSES: { key: Purpose; label: string; emoji: string }[] = [
  { key: 'wedding', label: '결혼·약혼', emoji: '💍' },
  { key: 'moving', label: '이사', emoji: '🏠' },
  { key: 'contract', label: '계약·개업', emoji: '📝' },
  { key: 'travel', label: '여행·이동', emoji: '✈️' },
  { key: 'decision', label: '중요한 결정', emoji: '⚖️' },
];

/**
 * 목적 가산 — **관계 가감 위에** 얹는 목적별 점수(점 단위). 화면 「계산」칸과 같은 상수.
 * ⚠️ 일지 충·일간 합은 이미 관계 가감(pillarRelations)에 들어 있다. 여기서 다시 크게 깎거나 더하면 이중 계산이라,
 *    일지 충은 「추천에서 뺀다」만 하고, 일간 합은 결혼·계약에서만 조금 더 얹는다.
 */
export const AUSP_RULE = {
  hapWedContract: 4,   // 결혼·계약: 일간 합이면 관계 가감(+5×1.5) 위에 추가
  sonEomneun: 5,       // 이사: 손 없는 날(음력 끝자리 9·0)
  top: 6,
} as const;

const PURPOSE_LABEL: Record<Purpose, string> = { wedding: '결혼·약혼', moving: '이사', contract: '계약·개업', travel: '여행·이동', decision: '중요한 결정' };
/** 택일 「계산」칸 — favor 공통 식 + 원국 관계(오늘의 운세·신년과 같은 표) + 목적 가산 */
export function auspFormula(purpose: Purpose): string[] {
  const A = AUSP_RULE, R = DAILY_RULE.rel;
  const sgn = (n: number) => (n > 0 ? `+${n}` : `−${-n}`);
  const extra = [
    ...(purpose === 'wedding' || purpose === 'contract' ? [`일간 합이면 +${A.hapWedContract}`] : []),
    ...(purpose === 'moving' ? [`손 없는 날 +${A.sonEomneun}`] : []),
  ];
  return [
    ...favorFormula().map((l) => l.replace(/^점수 = /, '오행 점수 = ')),
    `관계 가감 = 그날 일진 × 원국 네 기둥 — 합 ${sgn(R.합)} · 충 ${sgn(R.충)} · 삼형 완성 ${sgn(R.삼형완성)} · 형 ${sgn(R.형)} · 해 ${sgn(R.해)} · 원진 ${sgn(R.원진)}, ` +
      `원국 한 자리에 겹치면 가장 센 마찰 하나와 합만, 일간·일지 자리면 ×${DAILY_RULE.selfMul} (오늘의 운세·신년과 같은 표)`,
    `그날 점수 = 오행 점수 + 관계 가감 + 목적 가산(${PURPOSE_LABEL[purpose]}: ${extra.length ? extra.join(' · ') : '없음'}) — ${FAVOR_RULE.min}~${FAVOR_RULE.max}로 자름`,
    `일지와 충인 날은 목적과 상관없이 추천에서 빼고, 나머지에서 점수 상위 ${A.top}일. 같은 점수면 이른 날짜를 먼저 보여 주고, 잘린 동점일 수를 함께 적습니다 — 무작위 보정 없음`,
  ];
}
const WEEKDAY = ['일', '월', '화', '수', '목', '금', '토'];

export interface AuspiciousDay {
  date: string;       // YYYY-MM-DD
  month: number; day: number; weekday: string;
  ganji: string; ganjiHanja: string;
  score: number;      // 0~100
  reasons: string[];
  warn?: string;      // 피해야 할 이유(있으면)
  /** 점수 분해 — 오행 점수 + 관계 가감 + 목적 가산 */
  parts: { oheng: number; relations: number; purpose: number };
  /** 그날 일진 × 원국 관계 태그 */
  relations: string[];
}

/**
 * 지정 연·월의 모든 날을 평가해 점수순 정렬.
 * @param r 사주 결과
 * @param purpose 목적
 * @param year,month 대상 연·월(그레고리력)
 */
export function pickAuspicious(r: SajuResult, purpose: Purpose, year: number, month: number): AuspiciousDay[] {
  const dayGanU = r.dayMaster.gan;
  const dayO = r.dayMaster.ohaeng;
  const strength = r.dayMasterStrength;
  const dayJiU = r.pillars.day.ji;
  const chungJi = (dayJiU + 6) % 12; // 일지를 충하는 지지

  const daysInMonth = new Date(year, month, 0).getDate();
  const out: AuspiciousDay[] = [];

  for (let d = 1; d <= daysInMonth; d++) {
    const jdn = gregorianToJDN(year, month, d);
    const idx = ((jdn + 49) % 60 + 60) % 60;
    const tGan = idx % 10, tJi = idx % 12;
    const ganO = GAN_OHAENG[tGan], jiO = JI_OHAENG[tJi];

    const oheng = favorToScore(pillarRaw(tGan, tJi, dayO, strength));
    const rel = pillarRelations(tGan, tJi, r.pillars);   // 원국 전체 — 오늘의 운세·신년과 같은 함수
    const relations = relationSum(rel);
    let purposeAdd = 0;
    const reasons: string[] = [];
    let warn: string | undefined;

    // 일지충 — 목적과 상관없이 추천에서 뺀다(감점은 관계 가감에 이미 들어 있다)
    if (tJi === chungJi) {
      warn = `이 날 지지(${JIJI[tJi]})가 당신 일지(${JIJI[dayJiU]})와 충(沖) — 변동·마찰이 커 피하는 게 좋아요`;
    }
    // 일간합 — 끌림·화합. 관계 가감에 이미 +, 결혼·계약만 목적 가산
    const hap = GAN_HAP.some(([a, b]) => (a === tGan && b === dayGanU) || (a === dayGanU && b === tGan));
    if (hap) {
      if (purpose === 'wedding' || purpose === 'contract') purposeAdd += AUSP_RULE.hapWedContract;
      reasons.push('일간과 합(合) — 마음이 통하고 화합하는 기운');
    }

    // 일진이 일간을 돕는지(같은/생하는 오행) — 기운 보강
    if (jiO === dayO || ganO === dayO) reasons.push('나와 같은 기운이 들어 힘이 실리는 날');

    // 목적별 보너스
    const lunar = solarToLunar(year, month, d);
    if (purpose === 'moving') {
      const t = lunar.day % 10; // 손없는 날: 음력 끝자리 9 또는 0
      if (t === 9 || t === 0) { purposeAdd += AUSP_RULE.sonEomneun; reasons.push(`손 없는 날(음력 ${lunar.day}일) — 이사에 길한 날`); }
    }
    if (purpose === 'travel' && (jiO === '목' || jiO === '화')) reasons.push('움직임·확장의 기운이 좋은 날');
    if (purpose === 'decision' && (tGan === dayGanU)) reasons.push('주관이 또렷해지는 날 — 결단에 유리');

    const score = Math.max(FAVOR_RULE.min, Math.min(FAVOR_RULE.max, Math.round(oheng + relations + purposeAdd)));
    out.push({
      date: `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
      month, day: d, weekday: WEEKDAY[new Date(year, month - 1, d).getDay()],
      ganji: `${CHEONGAN[tGan]}${JIJI[tJi]}`, ganjiHanja: `${CHEONGAN_HANJA[tGan]}${JIJI_HANJA[tJi]}`,
      score, reasons, warn,
      parts: { oheng, relations, purpose: purposeAdd },
      relations: relationTags(rel),
    });
  }
  return out;
}

/** 상위 N개 경계에서 잘린 동점일 수 — 「같은 점수인 날이 N일 더 있어요」 */
export function tiedBeyondTop(all: AuspiciousDay[], top: AuspiciousDay[]): number {
  if (!top.length) return 0;
  const cut = Math.min(...top.map((d) => d.score));
  const shown = new Set(top.map((d) => d.day));
  return all.filter((d) => !d.warn && d.score === cut && !shown.has(d.day)).length;
}

/** 점수 상위 N개(충 제외 우선) */
export function topAuspicious(all: AuspiciousDay[], n: number = AUSP_RULE.top): AuspiciousDay[] {
  // 같은 점수면 이른 날짜 — 정렬 안정성에 기대지 않고 명시한다
  return [...all].filter((x) => !x.warn).sort((a, b) => b.score - a.score || a.day - b.day).slice(0, n).sort((a, b) => a.day - b.day);
}

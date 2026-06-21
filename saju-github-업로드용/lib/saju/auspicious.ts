// 택일(擇日) — 사주 기준 좋은 날 고르기. 일진을 일간에 대입해 점수화 + 일지충 회피 + 일간합 + 목적별 가중.
// 일일운 엔진(favor/mapScore)·음력 변환을 재사용. 외부 의존 0.
import { CHEONGAN, CHEONGAN_HANJA, JIJI, JIJI_HANJA, GAN_OHAENG, JI_OHAENG } from './constants';
import { favor, mapScore } from './daily';
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

// 천간합 5쌍
const GAN_HAP: [number, number][] = [[0, 5], [1, 6], [2, 7], [3, 8], [4, 9]];
const WEEKDAY = ['일', '월', '화', '수', '목', '금', '토'];

export interface AuspiciousDay {
  date: string;       // YYYY-MM-DD
  month: number; day: number; weekday: string;
  ganji: string; ganjiHanja: string;
  score: number;      // 0~100
  reasons: string[];
  warn?: string;      // 피해야 할 이유(있으면)
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
    const seed = (jdn + dayGanU * 7) >>> 0;

    let raw = (0.4 * favor(ganO, dayO, strength) + 0.6 * favor(jiO, dayO, strength)) * 100;
    const reasons: string[] = [];
    let warn: string | undefined;

    // 일지충 — 강한 감점(특히 결혼·이사·계약)
    if (tJi === chungJi) {
      raw -= purpose === 'travel' ? 30 : 55;
      warn = `이 날 지지(${JIJI[tJi]})가 당신 일지(${JIJI[dayJiU]})와 충(沖) — 변동·마찰이 커 피하는 게 좋아요`;
    }
    // 일간합 — 끌림·화합(결혼·계약에 길)
    const hap = GAN_HAP.some(([a, b]) => (a === tGan && b === dayGanU) || (a === dayGanU && b === tGan));
    if (hap) { raw += purpose === 'wedding' || purpose === 'contract' ? 18 : 10; reasons.push('일간과 합(合) — 마음이 통하고 화합하는 기운'); }

    // 일진이 일간을 돕는지(같은/생하는 오행) — 기운 보강
    if (jiO === dayO || ganO === dayO) reasons.push('나와 같은 기운이 들어 힘이 실리는 날');

    // 목적별 보너스
    const lunar = solarToLunar(year, month, d);
    if (purpose === 'moving') {
      const t = lunar.day % 10; // 손없는 날: 음력 끝자리 9 또는 0
      if (t === 9 || t === 0) { raw += 12; reasons.push(`손 없는 날(음력 ${lunar.day}일) — 이사에 길한 날`); }
    }
    if (purpose === 'travel' && (jiO === '목' || jiO === '화')) reasons.push('움직임·확장의 기운이 좋은 날');
    if (purpose === 'decision' && (tGan === dayGanU)) reasons.push('주관이 또렷해지는 날 — 결단에 유리');

    const score = mapScore(raw, seed);
    out.push({
      date: `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
      month, day: d, weekday: WEEKDAY[new Date(year, month - 1, d).getDay()],
      ganji: `${CHEONGAN[tGan]}${JIJI[tJi]}`, ganjiHanja: `${CHEONGAN_HANJA[tGan]}${JIJI_HANJA[tJi]}`,
      score, reasons, warn,
    });
  }
  return out;
}

/** 점수 상위 N개(충 제외 우선) */
export function topAuspicious(all: AuspiciousDay[], n = 6): AuspiciousDay[] {
  return [...all].filter((x) => !x.warn).sort((a, b) => b.score - a.score).slice(0, n).sort((a, b) => a.day - b.day);
}

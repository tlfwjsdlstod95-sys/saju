// 대운(大運) · 세운(歲運) 계산 + 용신 기반 길흉 점수
import {
  CHEONGAN, CHEONGAN_HANJA, JIJI, JIJI_HANJA,
  GAN_OHAENG, JI_OHAENG, GAN_EUMYANG, SAENG, GEUK,
  type Ohaeng,
} from './constants';
import { sipsin, jisipsin } from './elements';
import { JIJANGGAN } from './constants';
import { solarTermKSTjd, sunLongitudeAtKST } from './solarTerms';
import type { LuckPillar, LuckResult } from './types';

/** 60갑자 인덱스 찾기 */
function ganzhiIndex(gan: number, ji: number): number {
  for (let i = 0; i < 60; i++) if (i % 10 === gan && i % 12 === ji) return i;
  return 0;
}

/**
 * 오행 1개의 길흉도(-1~+1). 일간 강약(strength)에 따라 도움/설기 방향이 뒤집힘.
 *  - 신약(<0.45): 비겁·인성(도움) = 길 / 식상·재·관(설기·극) = 흉
 *  - 신강(>0.55): 반대
 *  - 중화: 약한 양(+)
 */
function elementFavor(o: Ohaeng, dayO: Ohaeng, strength: number): number {
  const helpful = o === dayO || SAENG[o] === dayO; // 비겁 or 인성
  if (strength < 0.45) return helpful ? 1 : -0.6;
  if (strength > 0.55) return helpful ? -0.6 : 1;
  return helpful ? 0.25 : 0.4; // 중화: 완만
}

/** 간/지 오행 가중(지지 0.6) → -100~100 점수 */
function pillarScore(gan: number, ji: number, dayGan: number, strength: number): number {
  const dayO = GAN_OHAENG[dayGan];
  const s = 0.4 * elementFavor(GAN_OHAENG[gan], dayO, strength)
    + 0.6 * elementFavor(JI_OHAENG[ji], dayO, strength);
  return Math.round(s * 100);
}

function buildLuckPillar(
  gan: number, ji: number, dayGan: number, strength: number, age: number, year: number,
): LuckPillar {
  const jjg = JIJANGGAN[ji];
  return {
    age, year, gan, ji,
    ganKor: CHEONGAN[gan], jiKor: JIJI[ji],
    ganHanja: CHEONGAN_HANJA[gan], jiHanja: JIJI_HANJA[ji],
    ganOhaeng: GAN_OHAENG[gan], jiOhaeng: JI_OHAENG[ji],
    ganSipsin: sipsin(dayGan, gan),
    jiSipsin: jisipsin(dayGan, jjg.jeonggi.gan),
    score: pillarScore(gan, ji, dayGan, strength),
  };
}

export interface LuckParams {
  birthKSTjd: number;
  birthYear: number; birthMonth: number; birthDay: number;
  yearGan: number;
  monthGan: number; monthJi: number;
  dayGan: number;
  strength: number;
  sex: 'M' | 'F';
  nowYear: number;
}

export function computeLuck(p: LuckParams): LuckResult {
  // --- 방향: 양남음녀 순행, 음남양녀 역행 ---
  const yangYear = GAN_EUMYANG[p.yearGan] === '양';
  const forward = (yangYear && p.sex === 'M') || (!yangYear && p.sex === 'F');

  // --- 대운수: 출생~인접 절(節)까지 일수 / 3 ---
  const lon = sunLongitudeAtKST(p.birthKSTjd);
  const k = Math.floor((lon - 15) / 30);
  const prevLon = ((15 + 30 * k) % 360 + 360) % 360;
  const nextLon = (prevLon + 30) % 360;
  const nextJd = solarTermKSTjd(nextLon, p.birthYear, p.birthMonth, p.birthDay);
  const prevJd = solarTermKSTjd(prevLon, p.birthYear, p.birthMonth, p.birthDay);
  const daysToBoundary = forward ? (nextJd - p.birthKSTjd) : (p.birthKSTjd - prevJd);
  const daewoonAge = Math.max(0, Math.round((daysToBoundary / 3) * 10) / 10);
  const startAge = Math.max(1, Math.round(daewoonAge));

  // --- 대운 60갑자 배열 (월주 기준 순/역) ---
  const monthIdx = ganzhiIndex(p.monthGan, p.monthJi);
  const daewoon: LuckPillar[] = [];
  for (let i = 1; i <= 9; i++) {
    const idx = ((forward ? monthIdx + i : monthIdx - i) % 60 + 60) % 60;
    const age = startAge + (i - 1) * 10;
    daewoon.push(buildLuckPillar(idx % 10, idx % 12, p.dayGan, p.strength, age, p.birthYear + age));
  }

  // --- 세운: 올해부터 10년 ---
  const sewoon: LuckPillar[] = [];
  for (let y = p.nowYear; y < p.nowYear + 10; y++) {
    const idx = ((y - 4) % 60 + 60) % 60;
    sewoon.push(buildLuckPillar(idx % 10, idx % 12, p.dayGan, p.strength, y - p.birthYear, y));
  }

  return { direction: forward ? '순행' : '역행', daewoonAge, daewoon, sewoon };
}

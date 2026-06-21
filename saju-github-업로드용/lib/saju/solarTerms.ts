// 절기(節氣) 계산: 태양 황경 기반 월지/년 경계 판정
import {
  dateToJD, jdToDate, deltaTSeconds, sunApparentLongitude,
} from './astro';
import { JEOL } from './constants';

/** 어떤 절(節)의 정확한 KST 발생 시각을 JD(KST)로 반환.
 *  targetLon: 태양 황경(도), guessYear/guessMonth/guessDay: 근사 일자 */
export function solarTermKSTjd(
  targetLon: number,
  guessYear: number,
  guessMonth: number,
  guessDay: number,
): number {
  // 1) TT 기준 근사 JD에서 시작해 뉴턴 반복
  let jde = dateToJD(guessYear, guessMonth, guessDay, 0, 0, 0);
  for (let i = 0; i < 8; i++) {
    const lon = sunApparentLongitude(jde);
    let diff = ((targetLon - lon + 540) % 360) - 180;
    jde += diff / 0.985647; // 태양 평균 이동 도/일
    if (Math.abs(diff) < 1e-6) break;
  }
  // jde는 TT. KST(UT+9) JD로 변환
  const utDate = jdToDate(jde);
  const dt = deltaTSeconds(utDate.year, utDate.month);
  const utJd = jde - dt / 86400;
  return utJd + 9 / 24; // KST
}

/** 태양 황경을 KST 순간(jdKST)에서 계산 */
export function sunLongitudeAtKST(jdKST: number): number {
  const utJd = jdKST - 9 / 24;
  const approx = jdToDate(utJd);
  const dt = deltaTSeconds(approx.year, approx.month);
  const jde = utJd + dt / 86400;
  return sunApparentLongitude(jde);
}

/** 월지(月支) 인덱스 판정 — 출생 순간의 태양 황경으로 직접 결정.
 *  입춘(315°)=인월(2) 부터 30° 간격. */
export function getMonthBranch(jdKST: number): number {
  const lon = sunLongitudeAtKST(jdKST);
  const seg = Math.floor((((lon - 315) % 360) + 360) % 360 / 30); // 0=인,1=묘,...
  return (2 + seg) % 12;
}

/** 입춘(立春) KST 시각 JD — 해당 양력연도 Y의 입춘. 보통 2/3~2/5. */
export function ipchunKSTjd(year: number): number {
  return solarTermKSTjd(315, year, 2, 4);
}

/** 출생 순간(jdKST)이 속한 '사주 연도'(입춘 기준) 반환 */
export function getSajuYear(jdKST: number, calYear: number): number {
  const ipchun = ipchunKSTjd(calYear);
  return jdKST < ipchun ? calYear - 1 : calYear;
}

/** 디버그/표시용: 특정 연도의 12절 시각 목록 */
export function listJeol(year: number) {
  return JEOL.map((j) => {
    // 청명~소한 등은 해당 연도 내, 자/축월 절은 전년말~연초. 근사월 추정.
    let gm = 2, gd = 4;
    const map: Record<string, [number, number]> = {
      입춘: [2, 4], 경칩: [3, 6], 청명: [4, 5], 입하: [5, 6],
      망종: [6, 6], 소서: [7, 7], 입추: [8, 8], 백로: [9, 8],
      한로: [10, 8], 입동: [11, 7], 대설: [12, 7], 소한: [1, 6],
    };
    [gm, gd] = map[j.name] ?? [2, 4];
    const jd = solarTermKSTjd(j.longitude, year, gm, gd);
    return { ...j, kstJd: jd, date: jdToDate(jd - 9 / 24 + 9 / 24) };
  });
}

// 천문 계산 코어: 율리우스일, 태양 황경, 균시차, ΔT
// 알고리즘 출처: Jean Meeus, "Astronomical Algorithms" (2nd ed.)
// 정확도: 태양 황경 VSOP87 절단 (절기 시각 ~초 단위)
import { sunApparentLongitudeVSOP } from './vsop';

const DEG = Math.PI / 180;

/** 그레고리력 날짜 → 율리우스일(JDN, 정수, 정오 기준). Meeus 공식. */
export function gregorianToJDN(year: number, month: number, day: number): number {
  const a = Math.floor((14 - month) / 12);
  const y = year + 4800 - a;
  const m = month + 12 * a - 3;
  return (
    day +
    Math.floor((153 * m + 2) / 5) +
    365 * y +
    Math.floor(y / 4) -
    Math.floor(y / 100) +
    Math.floor(y / 400) -
    32045
  );
}

/** 그레고리력 날짜+시각(UT) → 율리우스일(JD, 실수) */
export function dateToJD(
  year: number,
  month: number,
  day: number,
  hour = 0,
  minute = 0,
  second = 0,
): number {
  const jdn = gregorianToJDN(year, month, day);
  // JDN은 정오 기준이므로 시각을 더할 때 -0.5
  return jdn - 0.5 + (hour + minute / 60 + second / 3600) / 24;
}

/** JD(실수) → 그레고리력 날짜/시각 (UT) */
export function jdToDate(jd: number): {
  year: number; month: number; day: number; hour: number; minute: number; second: number;
} {
  const z = Math.floor(jd + 0.5);
  const f = jd + 0.5 - z;
  let a = z;
  if (z >= 2299161) {
    const alpha = Math.floor((z - 1867216.25) / 36524.25);
    a = z + 1 + alpha - Math.floor(alpha / 4);
  }
  const b = a + 1524;
  const c = Math.floor((b - 122.1) / 365.25);
  const d = Math.floor(365.25 * c);
  const e = Math.floor((b - d) / 30.6001);
  const dayFrac = b - d - Math.floor(30.6001 * e) + f;
  const day = Math.floor(dayFrac);
  const month = e < 14 ? e - 1 : e - 13;
  const year = month > 2 ? c - 4716 : c - 4715;
  let hourFrac = (dayFrac - day) * 24;
  const hour = Math.floor(hourFrac);
  hourFrac = (hourFrac - hour) * 60;
  const minute = Math.floor(hourFrac);
  const second = Math.round((hourFrac - minute) * 60);
  return { year, month, day, hour, minute, second };
}

/**
 * ΔT (TT - UT) 초 단위. Espenak & Meeus 다항식 근사(1900~2150 구간 위주).
 */
export function deltaTSeconds(year: number, month: number): number {
  const y = year + (month - 0.5) / 12;
  let dt: number;
  if (year >= 2005 && year < 2050) {
    const t = y - 2000;
    dt = 62.92 + 0.32217 * t + 0.005589 * t * t;
  } else if (year >= 1986 && year < 2005) {
    const t = y - 2000;
    dt = 63.86 + 0.3345 * t - 0.060374 * t * t + 0.0017275 * t * t * t
      + 0.000651814 * t * t * t * t + 0.00002373599 * t * t * t * t * t;
  } else if (year >= 1961 && year < 1986) {
    const t = y - 1975;
    dt = 45.45 + 1.067 * t - (t * t) / 260 - (t * t * t) / 718;
  } else if (year >= 1941 && year < 1961) {
    const t = y - 1950;
    dt = 29.07 + 0.407 * t - (t * t) / 233 + (t * t * t) / 2547;
  } else if (year >= 1920 && year < 1941) {
    const t = y - 1920;
    dt = 21.20 + 0.84493 * t - 0.076100 * t * t + 0.0020936 * t * t * t;
  } else if (year >= 1900 && year < 1920) {
    const t = y - 1900;
    dt = -2.79 + 1.494119 * t - 0.0598939 * t * t + 0.0061966 * t * t * t - 0.000197 * t * t * t * t;
  } else if (year >= 2050) {
    dt = -20 + 32 * Math.pow((y - 1820) / 100, 2) - 0.5628 * (2150 - y);
  } else {
    // 1900 이전 대략값
    const t = (y - 1820) / 100;
    dt = -20 + 32 * t * t;
  }
  return dt;
}

/** 태양의 겉보기 황경(apparent geocentric longitude, 도). 입력 jde는 TT 기준 JD.
 *  VSOP87(절단) 정밀 계산 — 절기 시각 초 단위 정밀도. */
export function sunApparentLongitude(jde: number): number {
  return sunApparentLongitudeVSOP(jde);
}

/** 황도경사각 ε (도) */
function obliquity(jde: number): number {
  const T = (jde - 2451545.0) / 36525.0;
  const seconds =
    21.448 - 46.8150 * T - 0.00059 * T * T + 0.001813 * T * T * T;
  return 23 + 26 / 60 + seconds / 3600;
}

/**
 * 균시차(Equation of Time) 분 단위. (겉보기 태양시 - 평균 태양시)
 * 양수면 해시계가 시계보다 빠름.
 */
export function equationOfTime(jde: number): number {
  const T = (jde - 2451545.0) / 36525.0;
  const L0 = ((280.46646 + 36000.76983 * T + 0.0003032 * T * T) % 360 + 360) % 360;
  const lambda = sunApparentLongitude(jde);
  const eps = obliquity(jde) * DEG;
  // 태양 적경 α
  const alpha =
    Math.atan2(Math.cos(eps) * Math.sin(lambda * DEG), Math.cos(lambda * DEG)) / DEG;
  const alphaNorm = ((alpha % 360) + 360) % 360;
  let E = L0 - 0.0057183 - alphaNorm;
  // -180~180 정규화
  while (E > 180) E -= 360;
  while (E < -180) E += 360;
  return E * 4; // 도 → 분
}

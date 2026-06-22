// 음양력(陰陽曆) 변환 — 정기법(定氣法)·무중치윤(無中置閏) 기반
// 달의 삭(朔, 합삭)을 Meeus "Astronomical Algorithms" ch.49 로 계산하고,
// 동지를 품은 달을 음력 11월로 고정해 월을 번호 매긴다. 외부 의존 0.
import { gregorianToJDN, jdToDate, deltaTSeconds } from './astro';
import { solarTermKSTjd } from './solarTerms';

const DEG = Math.PI / 180;

/** Meeus ch.49 — k번째 합삭(신월)의 JDE(역학시 TT). k 정수=신월. */
function newMoonJDE(k: number): number {
  const T = k / 1236.85;
  const T2 = T * T, T3 = T2 * T, T4 = T3 * T;
  let jde = 2451550.09766 + 29.530588861 * k
    + 0.00015437 * T2 - 0.000000150 * T3 + 0.00000000073 * T4;
  const E = 1 - 0.002516 * T - 0.0000074 * T2;
  const M = (2.5534 + 29.10535670 * k - 0.0000014 * T2 - 0.00000011 * T3) * DEG;
  const Mp = (201.5643 + 385.81693528 * k + 0.0107582 * T2 + 0.00001238 * T3 - 0.000000058 * T4) * DEG;
  const F = (160.7108 + 390.67050284 * k - 0.0016118 * T2 - 0.00000227 * T3 + 0.000000011 * T4) * DEG;
  const Om = (124.7746 - 1.56375588 * k + 0.0020672 * T2 + 0.00000215 * T3) * DEG;
  const s = Math.sin;
  jde +=
    -0.40720 * s(Mp)
    + 0.17241 * E * s(M)
    + 0.01608 * s(2 * Mp)
    + 0.01039 * s(2 * F)
    + 0.00739 * E * s(Mp - M)
    - 0.00514 * E * s(Mp + M)
    + 0.00208 * E * E * s(2 * M)
    - 0.00111 * s(Mp - 2 * F)
    - 0.00057 * s(Mp + 2 * F)
    + 0.00056 * E * s(2 * Mp + M)
    - 0.00042 * s(3 * Mp)
    + 0.00042 * E * s(M + 2 * F)
    + 0.00038 * E * s(M - 2 * F)
    - 0.00024 * E * s(2 * Mp - M)
    - 0.00017 * s(Om)
    - 0.00007 * s(Mp + 2 * M)
    + 0.00004 * s(2 * Mp - 2 * F)
    + 0.00004 * s(3 * M)
    + 0.00003 * s(Mp + M - 2 * F)
    + 0.00003 * s(2 * Mp + 2 * F)
    - 0.00003 * s(Mp + M + 2 * F)
    + 0.00003 * s(Mp - M + 2 * F)
    - 0.00002 * s(Mp - M - 2 * F)
    - 0.00002 * s(3 * Mp + M)
    + 0.00002 * s(4 * Mp);
  // 행성 섭동 추가항
  const A: Array<[number, number]> = [
    [299.77 + 0.107408 * k - 0.009173 * T2, 0.000325],
    [251.88 + 0.016321 * k, 0.000165],
    [251.83 + 26.651886 * k, 0.000164],
    [349.42 + 36.412478 * k, 0.000126],
    [84.66 + 18.206239 * k, 0.000110],
    [141.74 + 53.303771 * k, 0.000062],
    [207.14 + 2.453732 * k, 0.000060],
    [154.84 + 7.306860 * k, 0.000056],
    [34.52 + 27.261239 * k, 0.000047],
    [207.19 + 0.121824 * k, 0.000042],
    [291.34 + 1.844379 * k, 0.000040],
    [161.72 + 24.198154 * k, 0.000037],
    [239.56 + 25.513099 * k, 0.000035],
    [331.55 + 3.592518 * k, 0.000023],
  ];
  for (const [deg, coef] of A) jde += coef * s(deg * DEG);
  return jde; // TT
}

/** 합삭의 KST JD */
function newMoonKSTjd(k: number): number {
  const jde = newMoonJDE(k);
  const ut = jdToDate(jde);
  const dt = deltaTSeconds(ut.year, ut.month);
  return jde - dt / 86400 + 9 / 24; // TT→UT→KST
}

/** KST JD → 그 순간이 속한 KST 달력일의 정수 JDN */
function kstDayJDN(kstJd: number): number {
  const d = jdToDate(kstJd);
  return gregorianToJDN(d.year, d.month, d.day);
}

/** 양력연도 근사 → 합삭 k 추정 */
function kFromDate(y: number, m: number, d: number): number {
  return Math.round((y + (m - 0.5 + d / 30) / 12 - 2000) * 12.3685);
}

/** 동지(태양황경 270°)의 KST 달력일 JDN — gYear 12월의 동지 */
function dongzhiJDN(gYear: number): number {
  return kstDayJDN(solarTermKSTjd(270, gYear, 12, 22));
}

/** 특정 태양황경(도)의 KST 달력일 JDN. guessJDN 근처에서 탐색. */
function zhongqiDayJDN(lon: number, guessJDN: number): number {
  const g = jdToDate(guessJDN);
  return kstDayJDN(solarTermKSTjd(lon, g.year, g.month, g.day));
}

interface LMonth { startJDN: number; num: number; leap: boolean; lunarYear: number; terminal?: boolean; }

// 윈도우 캐시(같은 gYear 반복 계산 방지)
const winCache = new Map<number, LMonth[]>();

/**
 * 음력 '해 구간' 구성: 동지(gYear-1)를 품은 음력 11월 ~ 동지(gYear)를 품은 음력 11월.
 * 이 구간의 1~10월은 음력연도 gYear, 그 앞 11·12월은 gYear-1 소속.
 */
function buildWindow(gYear: number): LMonth[] {
  const cached = winCache.get(gYear);
  if (cached) return cached;

  const dzPrev = dongzhiJDN(gYear - 1);
  const dzThis = dongzhiJDN(gYear);

  // 동지(gYear-1)를 품은 합삭 k 찾기: nm(k) ≤ dzPrev < nm(k+1)
  let k = kFromDate(gYear - 1, 12, 1);
  const nmJDN = (kk: number) => kstDayJDN(newMoonKSTjd(kk));
  while (nmJDN(k) > dzPrev) k--;
  while (nmJDN(k + 1) <= dzPrev) k++;

  // 동지(gYear)를 품은 합삭 kThis 찾기
  let kThis = k;
  while (!(nmJDN(kThis) <= dzThis && nmJDN(kThis + 1) > dzThis)) kThis++;

  const n = kThis - k;            // M11_prev(i=0) ~ M11_this(i=n)
  const window13 = n === 13;

  const starts: { jd: number; jdn: number }[] = [];
  for (let i = 0; i <= n; i++) { const jd = newMoonKSTjd(k + i); starts.push({ jd, jdn: kstDayJDN(jd) }); }

  // 중기(中氣) 13개의 KST 달력일: 동지(270°)부터 30°씩. 그 '날짜'가 어느 달에 드는지로 무중월 판정.
  const zhongqiDays: number[] = [];
  for (let j = 0; j <= 12; j++) {
    const lon = (270 + 30 * j) % 360;
    zhongqiDays.push(zhongqiDayJDN(lon, Math.round(dzPrev + j * 30.44)));
  }
  // 각 달 [start_i, start_{i+1}) 에 중기 날짜가 하나라도 들면 중기 있음
  const hasZQ: boolean[] = [];
  for (let i = 0; i < n; i++) {
    const lo = starts[i].jdn, hi = starts[i + 1].jdn;
    hasZQ.push(zhongqiDays.some((zd) => zd >= lo && zd < hi));
  }

  const months: LMonth[] = [];
  let currentNum = 11, prevNum = 11, leapAssigned = false;
  for (let i = 0; i < n; i++) {
    let num: number, leap = false;
    if (i === 0) { num = 11; currentNum = 12; }
    else if (window13 && !leapAssigned && !hasZQ[i]) { num = prevNum; leap = true; leapAssigned = true; }
    else { num = currentNum; currentNum = currentNum === 12 ? 1 : currentNum + 1; }
    months.push({ startJDN: starts[i].jdn, num, leap, lunarYear: gYear });
    prevNum = num;
  }
  // 음력연도 배정: 첫 정월(num=1) 이전은 gYear-1, 이후는 gYear
  let seenJeong = false;
  for (const mo of months) { if (mo.num === 1) seenJeong = true; mo.lunarYear = seenJeong ? gYear : gYear - 1; }
  months.push({ startJDN: starts[n].jdn, num: 11, leap: false, lunarYear: gYear, terminal: true });

  winCache.set(gYear, months);
  return months;
}

export interface SolarDate { year: number; month: number; day: number; }
export interface LunarDate { year: number; month: number; day: number; isLeap: boolean; }

/** 음력 → 양력. 잘못된 날짜(없는 윤달/일수 초과)면 error 반환. */
export function lunarToSolar(
  lunarYear: number, month: number, day: number, isLeap = false,
): { ok: true; solar: SolarDate; leapAvailable: boolean } | { ok: false; error: string } {
  if (month < 1 || month > 12 || day < 1 || day > 30) return { ok: false, error: '날짜 범위를 확인하세요.' };
  // 1~10월은 window(lunarYear), 11·12월은 window(lunarYear+1) 시작부에 위치
  const win = buildWindow(month <= 10 ? lunarYear : lunarYear + 1);
  const sameNum = win.filter((m) => !m.terminal && m.num === month && m.lunarYear === lunarYear);
  const leapAvailable = sameNum.some((m) => m.leap);
  const mo = sameNum.find((m) => m.leap === isLeap) ?? sameNum.find((m) => !m.leap);
  if (!mo) return { ok: false, error: '해당 음력 월을 찾지 못했어요.' };
  const idx = win.indexOf(mo);
  const len = win[idx + 1].startJDN - mo.startJDN;
  if (day > len) return { ok: false, error: `음력 ${isLeap ? '윤' : ''}${month}월은 ${len}일까지 있어요.` };
  const d = jdToDate(mo.startJDN + (day - 1));
  return { ok: true, solar: { year: d.year, month: d.month, day: d.day }, leapAvailable };
}

/** 양력 → 음력 (표시·검증용) */
export function solarToLunar(year: number, month: number, day: number): LunarDate {
  const jdn = gregorianToJDN(year, month, day);
  for (const gy of [year, year + 1]) {
    const win = buildWindow(gy);
    for (let i = 0; i < win.length - 1; i++) {
      if (jdn >= win[i].startJDN && jdn < win[i + 1].startJDN) {
        return { year: win[i].lunarYear, month: win[i].num, day: jdn - win[i].startJDN + 1, isLeap: win[i].leap };
      }
    }
  }
  // 폴백(이론상 도달 안 함)
  return { year, month, day, isLeap: false };
}

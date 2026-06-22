// 정통 만세력 엔진 - 메인 진입점
// computeSaju(input) → SajuResult
import {
  CHEONGAN, CHEONGAN_HANJA, JIJI, JIJI_HANJA,
  GAN_OHAENG, JI_OHAENG, JIJANGGAN,
  SUMMER_TIME_PERIODS, STANDARD_MERIDIAN_HISTORY,
} from './constants';
import {
  gregorianToJDN, dateToJD, jdToDate, deltaTSeconds, equationOfTime, sunApparentLongitude,
} from './astro';
import { getMonthBranch, getSajuYear } from './solarTerms';
import {
  sipsin, jisipsin, countOhaeng, dayMasterStrength, describePersonality,
} from './elements';
import { computeLuck } from './luck';
import { generateArchetype } from './archetype';
import { computeAdvanced } from './advanced';
import { interpret } from './interpret';
import type { BirthInput, Pillar, SajuResult } from './types';

const DEFAULT_LONGITUDE = 126.978; // 서울

function dateStr(y: number, m: number, d: number): string {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

/** 출생일에 해당하는 표준자오선(°E) */
function standardMeridian(y: number, m: number, d: number): number {
  const ds = dateStr(y, m, d);
  let meridian = 135;
  for (const e of STANDARD_MERIDIAN_HISTORY) {
    if (ds >= e.from) meridian = e.meridian;
  }
  return meridian;
}

/** 서머타임 적용 여부 */
function isSummerTime(y: number, m: number, d: number): boolean {
  const ds = dateStr(y, m, d);
  return SUMMER_TIME_PERIODS.some(([s, e]) => ds >= s && ds < e);
}

/** 60갑자 인덱스 → Pillar 객체 (일간 기준 십신 포함) */
function buildPillar(gan: number, ji: number, dayGan: number, isDay = false): Pillar {
  const jjg = JIJANGGAN[ji];
  const jijanggan = [jjg.yeogi.gan, ...(jjg.junggi ? [jjg.junggi.gan] : []), jjg.jeonggi.gan];
  return {
    gan, ji,
    ganKor: CHEONGAN[gan], jiKor: JIJI[ji],
    ganHanja: CHEONGAN_HANJA[gan], jiHanja: JIJI_HANJA[ji],
    ganOhaeng: GAN_OHAENG[gan], jiOhaeng: JI_OHAENG[ji],
    ganSipsin: isDay ? null : sipsin(dayGan, gan),
    jiSipsin: jisipsin(dayGan, jjg.jeonggi.gan),
    jijanggan,
  };
}

// 시두법(時頭法/五鼠遁): 일간별 자시(子) 천간 시작
const HOUR_STEM_START = [0, 2, 4, 6, 8, 0, 2, 4, 6, 8]; // 갑0 을2 병4 정6 무8 기0 ...
// 월두법(月頭法/五虎遁): 년간별 인월(寅) 천간 시작
const MONTH_STEM_START = [2, 4, 6, 8, 0, 2, 4, 6, 8, 0]; // 갑丙 을戊 병庚 정壬 무甲 ...

export function computeSaju(input: BirthInput): SajuResult {
  const warnings: string[] = [];
  const lon = input.longitude ?? DEFAULT_LONGITUDE;

  if (input.isLunar) {
    warnings.push('v1 엔진은 양력 기준입니다. 음력 입력은 양력으로 변환 후 사용하세요. (음력 변환은 차기 버전 KASI 연동 예정)');
  }

  const { year, month, day } = input;
  const hour = input.unknownTime ? null : (input.hour ?? null);
  const minute = input.minute ?? 0;

  // --- 1) 시간대 보정: 출생 시각(시계) → UTC ---
  const meridian = standardMeridian(year, month, day);
  const summer = isSummerTime(year, month, day);
  const civilOffsetHours = (meridian === 135 ? 9 : 8.5) + (summer ? 1 : 0);

  // 시각 미상이면 정오(12:00)로 가정해 일주/년월주만 신뢰
  const clockHour = hour ?? 12;
  const birthUTCjd = dateToJD(year, month, day, clockHour - civilOffsetHours, minute, 0);
  const birthKSTjd = birthUTCjd + 9 / 24; // 절기·년월주 판정용 절대 순간(KST 환산)

  // --- 2) 진태양시(국소 겉보기 태양시): 일주/시주용 ---
  // ΔT로 TT 구해 균시차 계산
  const dt = deltaTSeconds(year, month);
  const jde = birthUTCjd + dt / 86400;
  const eot = equationOfTime(jde); // 분
  // 진태양시 JD = UTC + 경도/360일 + 균시차
  const apparentJd = birthUTCjd + lon / 360 + eot / 1440;
  const ast = jdToDate(apparentJd); // 진태양시 로컬 시계
  const longitudeCorrectionMin = (lon - meridian) * 4;

  // --- 3) 일주(日柱): 진태양시 달력일 기준 60갑자 ---
  const jdnDay = gregorianToJDN(ast.year, ast.month, ast.day);
  const dayIndex = ((jdnDay + 49) % 60 + 60) % 60; // 0=갑자, 2000-01-01=무오 기준 보정
  const dayGan = dayIndex % 10;
  const dayJi = dayIndex % 12;

  // 야자시/조자시 판정
  let jasiType: SajuResult['corrected']['jasiType'] = hour === null ? null : '일반';
  if (hour !== null) {
    if (ast.hour === 23) jasiType = '야자시';
    else if (ast.hour === 0) jasiType = '조자시';
  }

  // --- 4) 년주(年柱): 입춘 기준 ---
  const sajuYear = getSajuYear(birthKSTjd, year);
  const yearIdx = ((sajuYear - 4) % 60 + 60) % 60;
  const yearGan = yearIdx % 10;
  const yearJi = yearIdx % 12;

  // --- 5) 월주(月柱): 절기 황경으로 월지 → 월두법 천간 ---
  const monthJi = getMonthBranch(birthKSTjd);
  const monthOrder = (monthJi - 2 + 12) % 12; // 인월=0
  const monthGan = (MONTH_STEM_START[yearGan] + monthOrder) % 10;

  // --- 6) 시주(時柱): 진태양시 → 시지 → 시두법 ---
  let hourPillar: Pillar | null = null;
  if (hour !== null) {
    const hourJi = Math.floor((ast.hour + 1) / 2) % 12; // 23,0→자
    const hourGan = (HOUR_STEM_START[dayGan] + hourJi) % 10;
    hourPillar = buildPillar(hourGan, hourJi, dayGan);
  } else {
    warnings.push('출생 시각이 없어 시주(時柱)는 제외하고 분석합니다. 시간을 알면 정확도가 크게 올라갑니다.');
  }

  // --- 7) Pillar 조립 ---
  const yearPillar = buildPillar(yearGan, yearJi, dayGan);
  const monthPillar = buildPillar(monthGan, monthJi, dayGan);
  const dayPillar = buildPillar(dayGan, dayJi, dayGan, true);
  const pillars = { year: yearPillar, month: monthPillar, day: dayPillar, hour: hourPillar };

  // --- 8) 오행/십신/강약/성향 ---
  const ohaeng = countOhaeng([yearPillar, monthPillar, dayPillar, hourPillar]);
  const strength = dayMasterStrength(dayGan, pillars);

  const sipsinSummary: Record<string, number> = {};
  for (const p of [yearPillar, monthPillar, hourPillar]) {
    if (p?.ganSipsin) sipsinSummary[p.ganSipsin] = (sipsinSummary[p.ganSipsin] ?? 0) + 1;
  }
  for (const p of [yearPillar, monthPillar, dayPillar, hourPillar]) {
    if (p) sipsinSummary[p.jiSipsin] = (sipsinSummary[p.jiSipsin] ?? 0) + 1;
  }

  const persona = describePersonality(dayGan, strength, sipsinSummary);
  const archetype = generateArchetype(dayGan, sipsinSummary, strength);

  // --- 9) 대운/세운 ---
  const nowYear = new Date().getFullYear();
  const luck = computeLuck({
    birthKSTjd, birthYear: year, birthMonth: month, birthDay: day,
    yearGan, monthGan, monthJi, dayGan, strength,
    sex: input.sex ?? 'M', nowYear,
  });

  // --- 10) 명식 고도화 + 선배 톤 풀이 ---
  const advanced = computeAdvanced(pillars, dayGan, dayIndex);
  const age = nowYear - year;
  const thisYear = luck.sewoon[0];
  const curDaewoon = [...luck.daewoon].reverse().find((d) => age >= d.age) ?? luck.daewoon[0];
  const reading = interpret({
    name: input.name, sex: input.sex ?? 'M',
    pillars, dayGan, dayPillar, ohaeng, strength, sipsinSummary,
    sinsal: advanced.sinsal,
    nowYear, age,
    thisYearSipsin: thisYear?.ganSipsin ?? '비견',
    thisYearScore: thisYear?.score ?? 0,
    daewoonScore: curDaewoon?.score ?? 0,
  });

  return {
    input,
    corrected: {
      standardMeridian: meridian,
      longitudeCorrectionMin: Math.round(longitudeCorrectionMin * 10) / 10,
      equationOfTimeMin: Math.round(eot * 10) / 10,
      summerTimeApplied: summer,
      apparentSolarDateTime: `${ast.year}-${String(ast.month).padStart(2, '0')}-${String(ast.day).padStart(2, '0')} ${String(ast.hour).padStart(2, '0')}:${String(ast.minute).padStart(2, '0')}`,
      jasiType,
    },
    pillars,
    dayMaster: { gan: dayGan, ganKor: CHEONGAN[dayGan], ohaeng: GAN_OHAENG[dayGan] },
    ohaeng,
    dayMasterStrength: Math.round(strength * 100) / 100,
    ilju: persona,
    sipsinSummary,
    archetype,
    advanced,
    readingLead: reading.lead,
    interpretations: reading.sections,
    luck,
    warnings,
  };
}

export type { BirthInput, SajuResult, Pillar } from './types';
export * from './constants';

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
import { computeGyeokYong } from './gyeokyong';
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

/** 서머타임 적용 여부 — **시각까지** 본다(1987·1988 은 02:00 시작 / 03:00 종료). */
function isSummerTime(y: number, m: number, d: number, hour: number, minute: number): boolean {
  const ts = `${dateStr(y, m, d)} ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
  return SUMMER_TIME_PERIODS.some(([s, e]) => ts >= s && ts < e);
}

/**
 * 서머타임 전환 순간에 생기는 **두 가지 이상한 시각**을 알린다.
 *   · 시작(02:00→03:00): 그 사이 한 시간은 **존재하지 않는다.**
 *   · 종료(03:00→02:00): 02~03시가 **두 번 찍힌다** — 입력만으로는 어느 쪽인지 알 수 없다.
 * 추측으로 시주를 확정하지 않고 사실대로 알린다(우리는 첫 번째, 즉 서머타임 쪽으로 계산한다).
 */
function summerTimeEdge(y: number, m: number, d: number, hour: number, minute: number): string | null {
  const ts = `${dateStr(y, m, d)} ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
  for (const [s, e] of SUMMER_TIME_PERIODS) {
    if (!s.endsWith('02:00')) continue;              // 1987·1988 만 해당
    const skipFrom = s, skipTo = `${s.slice(0, 11)}03:00`;
    if (ts >= skipFrom && ts < skipTo) {
      return '서머타임이 시작되던 날이라 이 시각(02시대)은 시계에 존재하지 않았습니다. 03시 이후로 다시 확인해 주세요.';
    }
    const dupFrom = `${e.slice(0, 11)}02:00`;
    if (ts >= dupFrom && ts < e) {
      return '서머타임이 끝나던 날이라 이 시각(02시대)은 시계에 두 번 찍혔습니다 — 겹치는 구간이라 어느 쪽인지 입력만으로는 알 수 없어, 서머타임 쪽(먼저 지나간 02시)으로 계산했습니다.';
    }
  }
  return null;
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

  // ── 계산 스위치 — 기본값은 전부 현행 동작. 끄는 건 「명식 비교표」의 반사실 계산뿐이다 ──
  const useTrueSolar = input.trueSolar !== false;
  const useDst = input.dst !== false;
  const jieqiMode: 'instant' | 'date_only' = input.jieqi === 'date_only' ? 'date_only' : 'instant';

  // --- 1) 시간대 보정: 출생 시각(시계) → UTC ---
  const meridian = standardMeridian(year, month, day);
  const summer = isSummerTime(year, month, day, hour ?? 12, minute) && useDst;
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
  //   ⚠️ 보정을 끄면(변종) 시계 시각을 그대로 쓴다 — 경도 시차도 균시차도 없다.
  const apparentJd = useTrueSolar
    ? birthUTCjd + lon / 360 + eot / 1440
    : birthUTCjd + civilOffsetHours / 24;
  const ast = jdToDate(apparentJd); // 진태양시 로컬 시계 (보정을 끈 변종에서는 그냥 시계 시각)
  const longitudeCorrectionMin = useTrueSolar ? (lon - meridian) * 4 : 0;

  // --- 3) 일주(日柱): 진태양시 달력일 기준 60갑자 ---
  const jdnDay = gregorianToJDN(ast.year, ast.month, ast.day);
  let dayIndex = ((jdnDay + 49) % 60 + 60) % 60; // 0=갑자, 2000-01-01=무오 기준 보정

  // 야자시/조자시 판정 + 자시 학파 옵션
  // yaja(기본) = 야자시 인정: 23시대 출생은 당일 일주 유지 (현행)
  // jeongja = 정자시(자시일변): 23시부터 다음날 일주로 넘김
  const jasiMode: 'yaja' | 'jeongja' = input.jasiMode === 'jeongja' ? 'jeongja' : 'yaja';
  let jasiType: SajuResult['corrected']['jasiType'] = hour === null ? null : '일반';
  if (hour !== null) {
    if (ast.hour === 23) {
      jasiType = '야자시';
      if (jasiMode === 'jeongja') {
        dayIndex = (dayIndex + 1) % 60;
        warnings.push('정자시(자시일변) 학파 적용: 23시대 출생이라 일주를 다음날로 넘겨 계산했습니다. (기본 설정은 야자시 인정)');
      }
    } else if (ast.hour === 0) jasiType = '조자시';
  }
  const dayGan = dayIndex % 10;
  const dayJi = dayIndex % 12;

  // --- 4) 년주(年柱): 입춘 기준 ---
  //   절입 판정 기준 순간. date_only 변종은 **출생일 23:59** 로 비교한다 —
  //   절입이 그날 몇 시에 들든 '그 날짜면 이미 넘어간 것'으로 보는 방식(날짜만 보는 만세력)과 같아진다.
  const jieqiJd = jieqiMode === 'date_only'
    ? dateToJD(year, month, day, 23 - 9, 59, 59) + 9 / 24
    : birthKSTjd;
  const sajuYear = getSajuYear(jieqiJd, year);
  const yearIdx = ((sajuYear - 4) % 60 + 60) % 60;
  const yearGan = yearIdx % 10;
  const yearJi = yearIdx % 12;

  // --- 5) 월주(月柱): 절기 황경으로 월지 → 월두법 천간 ---
  const monthJi = getMonthBranch(jieqiJd);
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

  const stEdge = useDst ? summerTimeEdge(year, month, day, hour ?? 12, minute) : null;
  if (stEdge && hour !== null) warnings.push(stEdge);

  // 보정을 끈 계산은 **비교용 변종**이다. 결과만 떼어 보면 진짜 명식과 구분이 안 되므로 경고로 못 박는다.
  if (!useTrueSolar) warnings.push('[비교용 변종] 진태양시 보정(경도 시차·균시차)을 생략하고 계산했습니다. 헤아림의 실제 명식이 아닙니다.');
  if (!useDst) warnings.push('[비교용 변종] 서머타임 환원을 생략하고 계산했습니다. 헤아림의 실제 명식이 아닙니다.');
  if (jieqiMode === 'date_only') warnings.push('[비교용 변종] 절입을 시각이 아니라 날짜로만 판정했습니다. 헤아림의 실제 명식이 아닙니다.');

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
    sex: input.sex ?? 'M', nowYear, timeUnknown: hour === null, natal: pillars,
  });

  // --- 10) 명식 고도화 + 선배 톤 풀이 ---
  const gyeokYong = computeGyeokYong(pillars, dayGan, strength);
  // 신살 길흉반전(v5): 용신 판정을 먼저 구해 신살 tone 에 반영한다
  const advanced = computeAdvanced(pillars, dayGan, dayIndex, gyeokYong.yongsin);
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
    dayUnseong: advanced.unseong.day,
    curDaewoon: { gan: curDaewoon.gan, ji: curDaewoon.ji, ganKor: curDaewoon.ganKor, jiKor: curDaewoon.jiKor, sipsin: curDaewoon.ganSipsin },
    thisYearGanji: { gan: thisYear.gan, ji: thisYear.ji, ganKor: thisYear.ganKor, jiKor: thisYear.jiKor, sipsin: thisYear.ganSipsin },
    gyeokYong,
  });

  return {
    input,
    corrected: {
      standardMeridian: meridian,
      longitudeCorrectionMin: Math.round(longitudeCorrectionMin * 10) / 10,
      equationOfTimeMin: useTrueSolar ? Math.round(eot * 10) / 10 : 0,
      summerTimeApplied: summer,
      apparentSolarDateTime: `${ast.year}-${String(ast.month).padStart(2, '0')}-${String(ast.day).padStart(2, '0')} ${String(ast.hour).padStart(2, '0')}:${String(ast.minute).padStart(2, '0')}`,
      jasiType,
      jasiMode,
    },
    pillars,
    dayMaster: { gan: dayGan, ganKor: CHEONGAN[dayGan], ohaeng: GAN_OHAENG[dayGan] },
    ohaeng,
    dayMasterStrength: Math.round(strength * 100) / 100,
    ilju: persona,
    gyeokYong,
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

import type { Ohaeng, Sipsin } from './constants';

export type CalendarType = 'solar' | 'lunar';

export interface BirthInput {
  year: number;
  month: number;
  day: number;
  hour: number | null;   // 0~23, null이면 시간 모름
  minute: number;        // 0~59
  isLunar?: boolean;     // 음력 여부 (v1은 solar 권장)
  isLeapMonth?: boolean; // 윤달 여부 (음력)
  longitude?: number;    // 출생지 경도(°E). 기본 서울 126.978
  sex?: 'M' | 'F';
  unknownTime?: boolean; // 시간 모름
  name?: string;         // 이름(선택) — 풀이 문구에 반영
  jasiMode?: 'yaja' | 'jeongja'; // 자시 학파: yaja(기본)=야자시 인정(23시대 일주 유지) / jeongja=정자시(23시부터 다음날 일주)

  // ── 계산 스위치 (2026-09-09) ─────────────────────────────────────
  // 「명식 비교표」가 **반사실 명식**을 만들 때만 끈다 — 「이 보정을 안 하는 곳에서는 당신 시주가 X가 아니라 Y」.
  // ⚠️ 기본값은 전부 **현행 동작**이다. 옵션이 추가됐다고 기존 명식이 1비트라도 바뀌면 그건 버그다
  //    (`scripts/test-boundary.ts` 가 기본값 불변을 매번 확인한다).
  /** 진태양시 보정(출생지 경도 시차 + 균시차). false = 시계 시각을 그대로 쓴다 */
  trueSolar?: boolean;
  /** 서머타임 환원. false = 시계가 1시간 앞당겨져 있던 사실을 무시한다 */
  dst?: boolean;
  /** 절입 판정: instant(기본)=절기 '시각'까지 본다 / date_only=절입을 그날 00:00 으로 본다(날짜만 보는 방식) */
  jieqi?: 'instant' | 'date_only';
}

export interface Pillar {
  gan: number;        // 천간 인덱스 0~9
  ji: number;         // 지지 인덱스 0~11
  ganKor: string;
  jiKor: string;
  ganHanja: string;
  jiHanja: string;
  ganOhaeng: Ohaeng;
  jiOhaeng: Ohaeng;
  ganSipsin: Sipsin | null;  // 일간은 null(본인)
  jiSipsin: Sipsin;          // 지지 정기 기준
  jijanggan: number[];       // 지장간 천간 인덱스 배열
}

export interface OhaengCount {
  목: number; 화: number; 토: number; 금: number; 수: number;
  status: Partial<Record<Ohaeng, '과다' | '발달' | '부족' | '고립'>>;
}

export interface LuckPillar {
  age: number;       // 시작 나이
  year: number;      // 해당 연도(근사)
  gan: number; ji: number;
  ganKor: string; jiKor: string;
  ganHanja: string; jiHanja: string;
  ganOhaeng: Ohaeng; jiOhaeng: Ohaeng;
  ganSipsin: Sipsin;
  jiSipsin: Sipsin;
  score: number;     // -100~100 길흉 점수
}

export interface LuckResult {
  direction: '순행' | '역행';
  daewoonAge: number;        // 대운수 원값(소수 1자리) — 표시에는 startAge 를 쓴다
  /** 대운수(정수, 첫 대운 나이) — 원값에서 한 번만 반올림, 최소 1 */
  startAge?: number;
  /** 起運 정밀값 — 3일=1년. approx=true 면 시각 모름(정오 가정) */
  qiyun?: {
    yearsFloat: number; years: number; months: number; days: number;
    deltaDays: number; targetJeolKSTjd: number; approx: boolean;
  };
  daewoon: LuckPillar[];     // 10년 단위 대운
  sewoon: LuckPillar[];      // 올해부터 10년 세운
}

export interface SajuResult {
  input: BirthInput;
  corrected: {
    standardMeridian: number;
    longitudeCorrectionMin: number;
    equationOfTimeMin: number;
    summerTimeApplied: boolean;
    apparentSolarDateTime: string; // ISO (진태양시)
    jasiType: '일반' | '야자시' | '조자시' | null;
    jasiMode?: 'yaja' | 'jeongja'; // 적용된 자시 학파
  };
  pillars: {
    year: Pillar;
    month: Pillar;
    day: Pillar;
    hour: Pillar | null; // 시간 모름이면 null
  };
  dayMaster: { gan: number; ganKor: string; ohaeng: Ohaeng };
  ohaeng: OhaengCount;
  dayMasterStrength: number; // 0~1 (신강/신약 지표)
  ilju: { name: string; description: string };
  gyeokYong: import('./gyeokyong').GyeokYong; // 격국·용신·조후
  sipsinSummary: Record<string, number>; // 십신별 개수
  archetype: import('./archetype').Archetype;
  advanced: import('./advanced').AdvancedMyeongsik;
  readingLead: string;
  interpretations: import('./interpret').Interpretation[];
  luck: LuckResult;
  warnings: string[];
}

/**
 * 판정(`gyeokYong`)에 **기대지 않는** 결과 부분.
 *   무료 응답(`FreeSajuResult`)도 이 모양을 만족한다. 오늘의 운세·작명처럼
 *   클라이언트에서 도는 무료 기능은 이 타입만 받게 해서, 판정이 빠진 응답으로도 안전하게 돌게 한다.
 */
export type SajuCore = Omit<SajuResult, 'gyeokYong'>;

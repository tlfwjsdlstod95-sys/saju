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
  daewoonAge: number;        // 대운수
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
  sipsinSummary: Record<string, number>; // 십신별 개수
  archetype: import('./archetype').Archetype;
  advanced: import('./advanced').AdvancedMyeongsik;
  readingLead: string;
  interpretations: import('./interpret').Interpretation[];
  luck: LuckResult;
  warnings: string[];
}

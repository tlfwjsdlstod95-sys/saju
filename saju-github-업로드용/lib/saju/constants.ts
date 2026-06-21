// 정통 만세력 엔진 - 기본 상수 테이블
// 천간(天干) / 지지(地支) / 오행(五行) / 지장간(地藏干) / 십신(十神)

export const CHEONGAN = ['갑', '을', '병', '정', '무', '기', '경', '신', '임', '계'] as const;
export const CHEONGAN_HANJA = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'] as const;

export const JIJI = ['자', '축', '인', '묘', '진', '사', '오', '미', '신', '유', '술', '해'] as const;
export const JIJI_HANJA = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'] as const;

export const JIJI_ANIMAL = ['쥐', '소', '호랑이', '토끼', '용', '뱀', '말', '양', '원숭이', '닭', '개', '돼지'] as const;

export type Ohaeng = '목' | '화' | '토' | '금' | '수';
export type Eumyang = '양' | '음';

// 천간의 오행
export const GAN_OHAENG: Ohaeng[] = ['목', '목', '화', '화', '토', '토', '금', '금', '수', '수'];
// 천간의 음양 (양=true)
export const GAN_EUMYANG: Eumyang[] = ['양', '음', '양', '음', '양', '음', '양', '음', '양', '음'];

// 지지의 오행 (자축인묘진사오미신유술해)
export const JI_OHAENG: Ohaeng[] = ['수', '토', '목', '목', '토', '화', '화', '토', '금', '금', '토', '수'];
// 지지의 음양
export const JI_EUMYANG: Eumyang[] = ['양', '음', '양', '음', '양', '음', '양', '음', '양', '음', '양', '음'];

// 지장간(地藏干): 각 지지가 품은 천간 [여기, 중기, 정기] - 천간 인덱스, 일수(日數)
// 정기(본기)가 마지막. 중기가 없는 경우(자/묘/유)는 2개.
export interface JijangganEntry {
  yeogi: { gan: number; days: number };
  junggi?: { gan: number; days: number };
  jeonggi: { gan: number; days: number };
}

// 천간 인덱스: 갑0 을1 병2 정3 무4 기5 경6 신7 임8 계9
export const JIJANGGAN: JijangganEntry[] = [
  // 자(子): 임10 계20
  { yeogi: { gan: 8, days: 10 }, jeonggi: { gan: 9, days: 20 } },
  // 축(丑): 계9 신3 기18
  { yeogi: { gan: 9, days: 9 }, junggi: { gan: 7, days: 3 }, jeonggi: { gan: 5, days: 18 } },
  // 인(寅): 무7 병7 갑16
  { yeogi: { gan: 4, days: 7 }, junggi: { gan: 2, days: 7 }, jeonggi: { gan: 0, days: 16 } },
  // 묘(卯): 갑10 을20
  { yeogi: { gan: 0, days: 10 }, jeonggi: { gan: 1, days: 20 } },
  // 진(辰): 을9 계3 무18
  { yeogi: { gan: 1, days: 9 }, junggi: { gan: 9, days: 3 }, jeonggi: { gan: 4, days: 18 } },
  // 사(巳): 무7 경7 병16
  { yeogi: { gan: 4, days: 7 }, junggi: { gan: 6, days: 7 }, jeonggi: { gan: 2, days: 16 } },
  // 오(午): 병10 기9 정11
  { yeogi: { gan: 2, days: 10 }, junggi: { gan: 5, days: 9 }, jeonggi: { gan: 3, days: 11 } },
  // 미(未): 정9 을3 기18
  { yeogi: { gan: 3, days: 9 }, junggi: { gan: 1, days: 3 }, jeonggi: { gan: 5, days: 18 } },
  // 신(申): 무7 임7 경16
  { yeogi: { gan: 4, days: 7 }, junggi: { gan: 8, days: 7 }, jeonggi: { gan: 6, days: 16 } },
  // 유(酉): 경10 신20
  { yeogi: { gan: 6, days: 10 }, jeonggi: { gan: 7, days: 20 } },
  // 술(戌): 신9 정3 무18
  { yeogi: { gan: 7, days: 9 }, junggi: { gan: 3, days: 3 }, jeonggi: { gan: 4, days: 18 } },
  // 해(亥): 무7 갑7 임16
  { yeogi: { gan: 4, days: 7 }, junggi: { gan: 0, days: 7 }, jeonggi: { gan: 8, days: 16 } },
];

// 십신(十神) 명칭
export type Sipsin =
  | '비견' | '겁재' | '식신' | '상관' | '편재'
  | '정재' | '편관' | '정관' | '편인' | '정인';

// 오행 상생(生): key가 value를 생함
export const SAENG: Record<Ohaeng, Ohaeng> = {
  목: '화', 화: '토', 토: '금', 금: '수', 수: '목',
};
// 오행 상극(剋): key가 value를 극함
export const GEUK: Record<Ohaeng, Ohaeng> = {
  목: '토', 토: '수', 수: '화', 화: '금', 금: '목',
};

// 12절기(節) - 월주 경계가 되는 절. 태양황경(도) 기준.
// 각 절이 시작시키는 월지(月支) 인덱스 포함.
export interface JeolEntry {
  name: string;
  hanja: string;
  longitude: number; // 태양 황경 (0~360)
  monthBranch: number; // 시작되는 월지(지지 인덱스)
}

export const JEOL: JeolEntry[] = [
  { name: '입춘', hanja: '立春', longitude: 315, monthBranch: 2 }, // 인월
  { name: '경칩', hanja: '驚蟄', longitude: 345, monthBranch: 3 }, // 묘월
  { name: '청명', hanja: '清明', longitude: 15, monthBranch: 4 },  // 진월
  { name: '입하', hanja: '立夏', longitude: 45, monthBranch: 5 },  // 사월
  { name: '망종', hanja: '芒種', longitude: 75, monthBranch: 6 },  // 오월
  { name: '소서', hanja: '小暑', longitude: 105, monthBranch: 7 }, // 미월
  { name: '입추', hanja: '立秋', longitude: 135, monthBranch: 8 }, // 신월
  { name: '백로', hanja: '白露', longitude: 165, monthBranch: 9 }, // 유월
  { name: '한로', hanja: '寒露', longitude: 195, monthBranch: 10 },// 술월
  { name: '입동', hanja: '立冬', longitude: 225, monthBranch: 11 },// 해월
  { name: '대설', hanja: '大雪', longitude: 255, monthBranch: 0 }, // 자월
  { name: '소한', hanja: '小寒', longitude: 285, monthBranch: 1 }, // 축월
];

// 한국 서머타임(일광절약시간) 적용 기간 [시작, 끝) - KST 로컬 날짜 기준, 이 기간 출생은 -1시간 보정
export const SUMMER_TIME_PERIODS: Array<[string, string]> = [
  ['1948-06-01', '1948-09-13'],
  ['1949-04-03', '1949-09-11'],
  ['1950-04-01', '1950-09-10'],
  ['1951-05-06', '1951-09-09'],
  ['1955-05-05', '1955-09-09'],
  ['1956-05-20', '1956-09-30'],
  ['1957-05-05', '1957-09-22'],
  ['1958-05-04', '1958-09-21'],
  ['1959-05-03', '1959-09-20'],
  ['1960-05-01', '1960-09-18'],
  ['1987-05-10', '1987-10-11'],
  ['1988-05-08', '1988-10-09'],
];

// 한국 표준자오선 변경 이력: [시작ISO, 끝ISO, 표준경도]
// 1908-04-01 ~ : 127.5°E (UTC+8:30)
// 1912-01-01 ~ : 135°E (UTC+9, 일제 통일)
// 1954-03-21 ~ : 127.5°E (UTC+8:30)
// 1961-08-10 ~ 현재 : 135°E (UTC+9)
export const STANDARD_MERIDIAN_HISTORY: Array<{ from: string; meridian: number }> = [
  { from: '1900-01-01', meridian: 127.5 },
  { from: '1912-01-01', meridian: 135 },
  { from: '1954-03-21', meridian: 127.5 },
  { from: '1961-08-10', meridian: 135 },
];

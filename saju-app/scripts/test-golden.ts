// 골든 케이스 회귀 테스트 — 문헌 판정과 엔진 판정의 일치율(%)
//
//   실행: npm run test:golden
//
// 존재 이유
//   강약·용신은 KASI 같은 공표 정답표가 없다. 임계값을 바꿨을 때 개선인지 개악인지
//   판단할 **유일한 외부 기준**이 문헌 판정이다.
//
// 입력
//   고전 명식은 생년월일이 전해지지 않고 **사주팔자만** 남아 있다. 그래서 팔자에서
//   Pillar 를 만들어 dayMasterStrength / computeGyeokYong 을 직접 호출한다.
//   (computeSaju 는 생년월일이 필요하므로 이 경로엔 쓰지 않는다. birth 가 있으면 그쪽을 쓴다.)
//
// ⚠️ 학파 분리 — 이 파일에서 가장 중요한 규칙
//   자평진전(子平眞詮)의 '용신'은 **월령이 만든 격의 용신(격신)** 이고,
//   우리 엔진의 yongsin 은 **억부·조후(적천수 계열)** 다. 서로 다른 체계다.
//   섞어서 채점하면 멀쩡한 엔진이 "틀렸다"고 나온다.
//   → school:'japyeong' 은 격국만 채점하고 용신은 자동으로 건너뛴다.

import { readFileSync } from 'fs';
import { join } from 'path';
import { computeSaju } from '../lib/saju/index';
import { dayMasterStrength, sipsin, jisipsin } from '../lib/saju/elements';
import { computeGyeokYong } from '../lib/saju/gyeokyong';
import { CHEONGAN, CHEONGAN_HANJA, JIJI, JIJI_HANJA, GAN_OHAENG, JI_OHAENG, JIJANGGAN } from '../lib/saju/constants';
import { ENGINE_VERSION } from '../lib/saju/version';
import type { Pillar } from '../lib/saju/types';

interface GoldenCase {
  id: string;
  school: 'jeokcheonsu' | 'japyeong' | 'gungtong';
  pillars?: { year: string; month: string; day: string; hour?: string };
  birth?: any;
  expect: { strength?: string; yongsin?: string; yongsinNot?: string; gyeokguk?: string; johu?: string };
  source: { book: string; chapter?: string; page?: string };
  note?: string;
}

const raw = JSON.parse(readFileSync(join(__dirname, 'golden-cases.json'), 'utf8'));
const cases: GoldenCase[] = raw.cases ?? [];

if (!cases.length) {
  console.log('골든 케이스 0건 — 아직 아무것도 검증하지 못합니다.');
  console.log('문헌 판정이 붙은 명식을 golden-cases.json 의 cases[] 에 채우세요 (source 필수).');
  process.exit(0);
}

/** 한자 간지('丁亥') → Pillar */
function toPillar(gj: string, dayGan: number, isDay = false): Pillar {
  const g = CHEONGAN_HANJA.indexOf(gj[0] as any);
  const j = JIJI_HANJA.indexOf(gj[1] as any);
  if (g < 0 || j < 0) throw new Error(`간지 인식 실패: ${gj}`);
  if (g % 2 !== j % 2) throw new Error(`60갑자에 없는 조합: ${gj}`);
  const jjg = JIJANGGAN[j];
  return {
    gan: g, ji: j,
    ganKor: CHEONGAN[g], jiKor: JIJI[j],
    ganHanja: CHEONGAN_HANJA[g], jiHanja: JIJI_HANJA[j],
    ganOhaeng: GAN_OHAENG[g], jiOhaeng: JI_OHAENG[j],
    ganSipsin: isDay ? null : sipsin(dayGan, g),
    jiSipsin: jisipsin(dayGan, jjg.jeonggi.gan),
    jijanggan: [jjg.yeogi.gan, ...(jjg.junggi ? [jjg.junggi.gan] : []), jjg.jeonggi.gan],
  };
}

const label = (s: number) => (s <= 0.38 ? '신약' : s >= 0.55 ? '신강' : '중화');
const S = { strength: [0, 0], yongsin: [0, 0], yongsinNew: [0, 0], yongsinNot: [0, 0], gungtong: [0, 0], gyeokguk: [0, 0], johu: [0, 0] };
// 학파별 강약 — 적천수(억부)와 자평진전(격국)은 '신강'의 정의가 다르다.
//   자평진전은 印重이어도 身輕이라 부르고(JPJ-013 身輕印重),
//   적천수는 같은 배치에서 印重→신강으로 보고 식상을 용신으로 쓴다(JCS-009 용신 화).
//   섞어서 한 지표로 쓰면 어느 쪽으로 고쳐도 다른 쪽이 깨진다. 반드시 나눠서 본다.
const SS: Record<string, number[]> = { jeokcheonsu: [0, 0], japyeong: [0, 0], gungtong: [0, 0] };
const misses: string[] = [];
let bad = 0, skipped = 0;

for (const c of cases) {
  let strength: number, gy: ReturnType<typeof computeGyeokYong>;
  try {
    if (c.pillars) {
      const dayGan = CHEONGAN_HANJA.indexOf(c.pillars.day[0] as any);
      if (dayGan < 0) throw new Error(`일간 인식 실패: ${c.pillars.day}`);
      const p = {
        year: toPillar(c.pillars.year, dayGan),
        month: toPillar(c.pillars.month, dayGan),
        day: toPillar(c.pillars.day, dayGan, true),
        hour: c.pillars.hour ? toPillar(c.pillars.hour, dayGan) : null,
      };
      strength = dayMasterStrength(dayGan, p);
      gy = computeGyeokYong(p, dayGan, strength);
    } else if (c.birth) {
      const r = computeSaju(c.birth);
      strength = r.dayMasterStrength; gy = r.gyeokYong;
    } else { bad++; misses.push(`[입력없음] ${c.id}`); continue; }
  } catch (e: any) { bad++; misses.push(`[입력오류] ${c.id} — ${e.message}`); continue; }

  const src = `《${c.source.book}》`;
  if (c.expect.strength) {
    S.strength[1]++; const got = label(strength);
    const sk = (SS[c.school] ??= [0, 0]); sk[1]++;
    if (got === c.expect.strength) { S.strength[0]++; sk[0]++; }
    else misses.push(`[강약] ${c.id} 문헌 ${c.expect.strength} / 엔진 ${got}(${strength.toFixed(3)}) ${src}`);
  }
  if (c.expect.yongsin) {
    // 학파별로 '용신'의 뜻이 달라 채점 칸을 나눈다.
    //   japyeong  자평진전 — 용신 = 월령이 만든 격의 격신. 우리 yongsin 과 다른 개념 → 채점 안 함
    //   gungtong  궁통보감 — 용신 = 월별 일간 조후 처방표(「八月甲木 丁火爲先」). 억부와 별개 → 참고 지표로만
    //   jeokcheonsu 적천수 — 억부·조후. 우리 엔진과 같은 체계 → 본 지표
    if (c.school === 'japyeong') { skipped++; }
    else {
      const bucket = c.school === 'gungtong' ? S.gungtong : S.yongsin;
      bucket[1]++; const got = gy.yongsin.primary;
      const hit = got === c.expect.yongsin;
      if (hit) bucket[0]++;
      else misses.push(`[${c.school === 'gungtong' ? '용신·궁통' : '용신'}] ${c.id} 문헌 ${c.expect.yongsin} / 엔진 ${got}(${gy.yongsin.method}) ${src}`);
      // 튜닝 이후 원전에서 새로 캔 표본(JCS-042~)만 따로 센다.
      //   엔진 규칙은 JCS-041 까지의 표본으로 맞췄으므로, 그 뒤 케이스가 **진짜 일반화 성능**에 가깝다.
      const n = Number((c.id.match(/(\d+)$/) ?? [])[1] ?? 0);
      if (c.school === 'jeokcheonsu' && c.id.startsWith('JCS-') && n >= 42) {
        S.yongsinNew[1]++;
        if (hit) S.yongsinNew[0]++;
      }
    }
  }
  // 부정 사례 — 원문이 "이 오행은 用神이 아니다"라고만 못 박은 경우.
  //   예) 寒暖 p.126 後造 「寒甚而暖無氣, 反以無暖爲美」 — 뿌리 없는 조후 火 를 쓰지 않는다.
  //   용신 오행을 하나로 확정하지 않으므로 일반 채점에 넣지 않고 별도로 센다.
  if (c.expect.yongsinNot && c.school !== 'japyeong') {
    S.yongsinNot[1]++;
    const got = gy.yongsin.primary;
    if (got !== c.expect.yongsinNot) S.yongsinNot[0]++;
    else misses.push(`[용신·반례] ${c.id} 문헌 "${c.expect.yongsinNot} 아님" / 엔진 ${got}(${gy.yongsin.method}) ${src}`);
  }

  if (c.expect.gyeokguk) {
    S.gyeokguk[1]++; const got = gy.gyeokguk.key;
    if (got === c.expect.gyeokguk) S.gyeokguk[0]++;
    else misses.push(`[격국] ${c.id} 문헌 ${c.expect.gyeokguk} / 엔진 ${got} ${src}`);
  }
  if (c.expect.johu) {
    S.johu[1]++; const got = gy.johu.climate;
    if (got === c.expect.johu) S.johu[0]++;
    else misses.push(`[조후] ${c.id} 문헌 ${c.expect.johu} / 엔진 ${got} ${src}`);
  }
}

const rate = ([a, b]: number[]) => (b ? `${((a / b) * 100).toFixed(1).padStart(5)}%  (${a}/${b})` : '     —');
console.log(`골든 케이스 회귀 (engine v${ENGINE_VERSION})  총 ${cases.length}건${bad ? `, 입력오류 ${bad}건` : ''}\n`);
console.log(`  강약 일치율  ${rate(S.strength)}`);
console.log(`  ├ 적천수계    ${rate(SS.jeokcheonsu)}   ※ 억부 체계 — 우리 엔진이 따라야 할 기준`);
console.log(`  ├ 자평진전계  ${rate(SS.japyeong)}   ※ 격국 체계 — 印重=身輕. 참고용`);
console.log(`  └ 궁통보감    ${rate(SS.gungtong)}   ※ 참고용`);
console.log(`  용신 일치율  ${rate(S.yongsin)}   ※ 적천수 계열 — 우리 엔진과 같은 억부·조후 체계${skipped ? ` (자평진전 ${skipped}건 제외)` : ''}`);
console.log(`  └ 궁통 참고  ${rate(S.gungtong)}   ※ 궁통보감은 월별 조후 처방표라 체계가 다름. 참고용`);
console.log(`  └ 신규표본  ${rate(S.yongsinNew)}   ※ 튜닝 뒤 원전에서 캔 것만 — 일반화 성능의 지표`);
console.log(`  용신 반례    ${rate(S.yongsinNot)}   ※ 원문이 "이 오행은 用神이 아니다"라고만 밝힌 사례`);
console.log(`  격국 일치율  ${rate(S.gyeokguk)}`);
console.log(`  조후 일치율  ${rate(S.johu)}`);
if (misses.length) { console.log('\n불일치 상세:'); misses.forEach((m) => console.log('  ' + m)); }

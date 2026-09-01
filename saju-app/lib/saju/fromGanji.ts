// 간지(干支) 문자열 → Pillar. 고전 명식은 생년월일이 전해지지 않고 팔자만 남아 있어서,
// 골든 케이스·검증 페이지는 이 경로로 명식을 만든다.
//
// ⚠️ scripts/test-golden.ts 에도 같은 변환이 있었다. 검증 페이지(/accuracy)가 빌드 때
//    같은 계산을 해야 해서 lib 로 끌어올렸다. 로직이 갈라지면 화면과 테스트가 다른 말을 한다.

import { CHEONGAN, CHEONGAN_HANJA, JIJI, JIJI_HANJA, GAN_OHAENG, JI_OHAENG, JIJANGGAN } from './constants';
import { sipsin, jisipsin } from './elements';
import type { Pillar } from './types';

export function pillarFromGanji(gj: string, dayGan: number, isDay = false): Pillar {
  const g = CHEONGAN_HANJA.indexOf(gj[0] as any);
  const j = JIJI_HANJA.indexOf(gj[1] as any);
  if (g < 0 || j < 0) throw new Error(`간지 인식 실패: ${gj}`);
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

export function chartFromGanji(p: { year: string; month: string; day: string; hour?: string }) {
  const dayGan = CHEONGAN_HANJA.indexOf(p.day[0] as any);
  if (dayGan < 0) throw new Error(`일간 인식 실패: ${p.day}`);
  return {
    dayGan,
    pillars: {
      year: pillarFromGanji(p.year, dayGan),
      month: pillarFromGanji(p.month, dayGan),
      day: pillarFromGanji(p.day, dayGan, true),
      hour: p.hour ? pillarFromGanji(p.hour, dayGan) : null,
    },
  };
}

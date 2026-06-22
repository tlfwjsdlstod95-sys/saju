// 오행 분석 · 십신 판정 · 일간 강약
import {
  GAN_OHAENG, GAN_EUMYANG, JI_OHAENG, SAENG, GEUK,
  type Ohaeng, type Sipsin, CHEONGAN,
} from './constants';
import type { OhaengCount, Pillar } from './types';

/** 일간 대비 어떤 천간의 십신(十神) */
export function sipsin(dayGan: number, otherGan: number): Sipsin {
  const oDay = GAN_OHAENG[dayGan];
  const oOther = GAN_OHAENG[otherGan];
  const samePolarity = GAN_EUMYANG[dayGan] === GAN_EUMYANG[otherGan];

  if (oOther === oDay) return samePolarity ? '비견' : '겁재';
  if (SAENG[oDay] === oOther) return samePolarity ? '식신' : '상관';
  if (GEUK[oDay] === oOther) return samePolarity ? '편재' : '정재';
  if (GEUK[oOther] === oDay) return samePolarity ? '편관' : '정관';
  // 나머지: oOther가 oDay를 생함 (인성)
  return samePolarity ? '편인' : '정인';
}

/** 지지의 정기(본기) 천간으로 십신 판정 */
export function jisipsin(dayGan: number, jeonggiGan: number): Sipsin {
  return sipsin(dayGan, jeonggiGan);
}

/** 8글자(또는 6글자) 오행 개수 집계 */
export function countOhaeng(pillars: (Pillar | null)[]): OhaengCount {
  const count: Record<Ohaeng, number> = { 목: 0, 화: 0, 토: 0, 금: 0, 수: 0 };
  for (const p of pillars) {
    if (!p) continue;
    count[GAN_OHAENG[p.gan]]++;
    count[JI_OHAENG[p.ji]]++;
  }
  const total = Object.values(count).reduce((a, b) => a + b, 0);
  const status: OhaengCount['status'] = {};
  const avg = total / 5;
  (Object.keys(count) as Ohaeng[]).forEach((o) => {
    const c = count[o];
    if (c === 0) status[o] = '부족';
    else if (c >= Math.ceil(avg * 2)) status[o] = '과다';
    else if (c >= Math.ceil(avg + 1)) status[o] = '발달';
    else if (c === 1 && avg >= 1.5) status[o] = '고립';
  });
  return { ...count, status };
}

/** 일간 강약 지표 0~1 (득령·득지·득세 가중) */
export function dayMasterStrength(
  dayGan: number,
  pillars: { year: Pillar; month: Pillar; day: Pillar; hour: Pillar | null },
): number {
  const oDay = GAN_OHAENG[dayGan];
  const helps = (o: Ohaeng) => o === oDay || SAENG[o] === oDay; // 비겁 or 인성

  // 득령: 월지 오행이 일간을 돕는가
  const ryeong = helps(JI_OHAENG[pillars.month.ji]) ? 1 : 0;
  // 득지: 일지가 일간을 돕는가
  const ji = helps(JI_OHAENG[pillars.day.ji]) ? 1 : 0;

  // 득세: 전체 글자 중 일간을 돕는 비율
  const all: (Pillar | null)[] = [pillars.year, pillars.month, pillars.day, pillars.hour];
  let helpCount = 0, totalChars = 0;
  for (const p of all) {
    if (!p) continue;
    totalChars += 2;
    if (helps(GAN_OHAENG[p.gan])) helpCount++;
    if (helps(JI_OHAENG[p.ji])) helpCount++;
  }
  const se = totalChars ? helpCount / totalChars : 0;

  const strength = 0.35 * ryeong + 0.25 * ji + 0.4 * se;
  return Math.max(0, Math.min(1, strength));
}

/** 일간 오행 기반 + 우세 십신 기반 현대적 성향 설명 생성 */
export function describePersonality(
  dayGan: number,
  strength: number,
  sipsinSummary: Record<string, number>,
): { name: string; description: string } {
  const oDay = GAN_OHAENG[dayGan];
  const ganName = CHEONGAN[dayGan];
  const base: Record<Ohaeng, string> = {
    목: '성장과 확장을 추구하는 추진형. 새로운 일을 벌이고 사람을 키우는 데 강점이 있어요.',
    화: '에너지와 표현력이 강한 발산형. 분위기를 끌어올리고 사람을 끌어모으는 매력이 있어요.',
    토: '안정과 신뢰의 중재형. 묵묵히 책임지고 주변을 연결하는 균형 감각이 있어요.',
    금: '원칙과 결단의 완성형. 기준이 분명하고 일을 마무리 짓는 추진력이 있어요.',
    수: '통찰과 유연함의 전략형. 흐름을 읽고 상황에 맞게 조율하는 지혜가 있어요.',
  };
  const dominant = Object.entries(sipsinSummary).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '';
  const sipsinTrait: Record<string, string> = {
    비견: '독립심이 강하고 자기 페이스가 분명합니다.',
    겁재: '승부욕과 실행력이 강하고 동료와 함께 움직일 때 폭발력이 납니다.',
    식신: '꾸준히 결과물을 만들어내는 창작·기획 기질이 돋보입니다.',
    상관: '재능과 표현욕이 강해 콘텐츠·전문성으로 두각을 냅니다.',
    편재: '돈과 기회의 흐름을 읽는 감각이 뛰어나 사업·투자에 강합니다.',
    정재: '성실하게 자산을 쌓는 현실 감각과 관리력이 있습니다.',
    편관: '위기에 강하고 추진력·카리스마로 조직을 이끕니다.',
    정관: '책임감과 공정함으로 조직 안에서 신뢰를 쌓아 올라갑니다.',
    편인: '직관과 통찰이 깊어 전문·연구 분야에 적합합니다.',
    정인: '학습력과 안정감이 좋아 꾸준히 실력을 축적합니다.',
  };
  const strengthNote =
    strength >= 0.6 ? '주관이 뚜렷하고 추진력이 강한 편이라, 협업과 위임을 익히면 더 멀리 갑니다.'
    : strength <= 0.35 ? '주변 환경·관계를 잘 활용하는 유연형이라, 좋은 팀과 무대를 만나면 크게 성장합니다.'
    : '균형 잡힌 중화 사주로, 상황에 따라 강약을 조절하는 적응력이 강점입니다.';

  return {
    name: `${ganName}(${oDay}) 일간`,
    description: `${base[oDay]} ${sipsinTrait[dominant] ?? ''} ${strengthNote}`.trim(),
  };
}

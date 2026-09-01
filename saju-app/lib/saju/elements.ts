// 오행 분석 · 십신 판정 · 일간 강약
import {
  GAN_OHAENG, GAN_EUMYANG, JI_OHAENG, SAENG, GEUK, JIJANGGAN,
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
// ── 통근(通根) ─────────────────────────────────────────────
// 천간은 지지에 뿌리가 있어야 힘을 쓴다. 뿌리 없이 떠 있는 글자(무근)는
// 글자 수로는 하나지만 실제 세력은 거의 없다.
//
// 왜 지장간 기준인가
//   십이운성으로 등급을 매기는 방식도 있으나 가중치가 결국 취향이 된다.
//   지장간은 **데이터가 정해준다** — 그 지지 속에 같은 오행이 실제로 들어 있는지만 보면 된다.
//   정기(본기)에 있으면 깊은 뿌리, 중기·여기면 얕은 뿌리다.
const ROOT_JEONGGI = 0.8;
const ROOT_JUNGGI = 0.4;
const ROOT_YEOGI = 0.25;
const ROOT_NONE = 0.15;   // 무근이어도 글자가 존재하긴 하므로 완전 0으로 두지는 않는다

/** 천간 하나가 네 지지에 내린 뿌리의 깊이 (0.15 ~ 1.0) */
export function rootPower(gan: number, jis: number[]): number {
  const o = GAN_OHAENG[gan];
  let p = 0;
  for (const ji of jis) {
    const jjg = JIJANGGAN[ji];
    if (GAN_OHAENG[jjg.jeonggi.gan] === o) p += ROOT_JEONGGI;
    else if (jjg.junggi && GAN_OHAENG[jjg.junggi.gan] === o) p += ROOT_JUNGGI;
    else if (GAN_OHAENG[jjg.yeogi.gan] === o) p += ROOT_YEOGI;
  }
  return p > 0 ? Math.min(1, p) : ROOT_NONE;
}

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

  // 득세: 일간을 '제외한' 나머지 글자 중 일간을 돕는 **세력의 비율**
  // ※ 일간 자신은 정의상 항상 같은 오행이라, 포함하면 모든 사주가 신강 쪽으로 편향된다.
  //   정통 명리도 일간을 뺀 나머지 7글자(시주 미상이면 5글자)의 세력으로 강약을 본다.
  //
  // ⚠️ 2026-09-01 통근 가중 합산을 시도했다가 **되돌렸다.** 같은 실수를 반복하지 않도록 기록한다.
  //   시도: 천간을 rootPower(무근 0.15 ~ 정기통근 1.0)로 가중해 득세를 계산.
  //   결과: 골든 강약 4/6 → 4/6 (변화 없음). 무근 하한을 1.0까지 올려도 동일.
  //         반면 baseline 20,000건에서 **종격이 3.06% → 6.95% 로 폭증**했다.
  //   원인: 무근 천간이 분모에서도 빠져 세력 '비율'이 극단으로 간다.
  //         (지지 4개가 다 돕고 천간이 모두 무근이면 4/7=0.57 이던 값이 4/4.45=0.90 이 된다)
  //   → 측정 가능한 이득 없이 종격만 늘어나므로 채택하지 않는다.
  //      rootPower() 함수 자체는 나중에 다른 방식으로 쓸 수 있으니 남겨 둔다.
  const all: (Pillar | null)[] = [pillars.year, pillars.month, pillars.day, pillars.hour];
  let helpCount = 0, totalChars = 0;
  for (const p of all) {
    if (!p) continue;
    if (p !== pillars.day) { // 일간(일주 천간)만 제외 — 일지는 포함
      totalChars++;
      if (helps(GAN_OHAENG[p.gan])) helpCount++;
    }
    totalChars++;
    if (helps(JI_OHAENG[p.ji])) helpCount++;
  }
  const se = totalChars ? helpCount / totalChars : 0;

  // ⚠️ 2026-09-01 통근(通根)을 강약에 넣는 안을 시도했다가 **되돌렸다.** (두 번째 실패 기록)
  //   시도: 득지(일지 정기)를 빼고, 네 지지의 지장간 중 일간 오행이 있는 자리 수(rootCount/4)를
  //         0.4 가중으로 넣음 → 0.4*통근 + 0.2*득령 + 0.4*득세.
  //   근거로 삼았던 것: 자평진전 제6장 「論十干得時不旺, 失時不弱」 (월령만 보지 말고 뿌리를 보라).
  //   결과: 골든 강약 45.5%(10/22) → 54.5%(12/22) 로 올랐지만
  //         **골든 용신이 37.5%(3/8) → 12.5%(1/8) 로 무너졌다.** (JCS-005·JCS-009 이탈)
  //         용신은 강약에서 파생되므로, 강약을 흔들면 용신이 같이 흔들린다.
  //   원인(중요): 골든 강약 22건이 **학파가 섞여 있다.**
  //         자평진전은 印重이어도 身輕이라 부르고(JPJ-013 「此身輕印重也」),
  //         적천수는 같은 배치를 신강으로 보고 식상을 용신으로 쓴다(JCS-009 용신 화).
  //         통근 가중은 '印은 뿌리가 아니다'는 자평진전 쪽으로 엔진을 끌고 갔고,
  //         그래서 자평진전 강약은 올랐지만 적천수 용신이 깨졌다.
  //   → 우리 엔진의 용신은 억부(적천수)다. 강약도 적천수 기준을 따라야 한다.
  //      그런데 적천수 계열 강약 표본은 아직 5건뿐이라 재설계 근거가 못 된다.
  //      test-golden.ts 가 이제 강약을 학파별로 나눠 출력하니, 적천수 표본이 20건쯤
  //      모이면 그때 다시 본다. (자평진전 표본 16건은 늘려도 이 문제를 못 푼다)
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

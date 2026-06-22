// 엣지(Edge) 해석: ① 신살·십이운성·월지십신 '키워드 세트' 페어링
//                  ② 원국 + 대운 + 세운 12글자 동적 형충회합(타임라인)
// 모두 결정론 — 명식/운 간지 인덱스만으로 도출. 외부 의존 0.
import { JIJI, type Sipsin } from './constants';
import type { Pillar } from './types';
import type { Sinsal } from './advanced';

// ── ① 키워드 세트(신살 + 십이운성 + 월지 십신) ──
// 단순 "백호살이 있습니다"를 넘어, [성분 + 에너지 + 색채]를 한 문장으로 묶는다.

const SIPSIN_SUNGBUN: Record<string, string> = {
  비견: '주체·독립', 겁재: '경쟁·승부', 식신: '재능·표현', 상관: '재주·기획',
  편재: '현실·사업', 정재: '실리·관리', 편관: '추진·도전', 정관: '책임·명예',
  편인: '직관·전문', 정인: '학문·내면',
};

// 십이운성 에너지 강약
const UNSEONG_ENERGY: Record<string, string> = {
  장생: '왕성하게 피어나는', 관대: '한창 물오른', 건록: '단단히 자리 잡은', 제왕: '최고조로 끓는',
  목욕: '들뜨고 변화 많은', 쇠: '한풀 누그러진', 양: '천천히 자라는', 태: '이제 막 잉태된',
  병: '속으로 깊어지는', 사: '응축돼 가라앉은', 묘: '안으로 갈무리하는', 절: '끊어졌다 다시 잇는',
};

// 신살 색채(폭발력/방향)
const SINSAL_SAEK: Record<string, string> = {
  백호살: '생사를 다루는 강렬한 추진력', 괴강살: '극과 극을 오가는 카리스마',
  양인살: '칼처럼 벼린 결단력', 도화살: '사람을 끌어당기는 매력',
  역마살: '넓은 무대로 뻗는 이동력', 화개살: '한 우물을 파는 예술·구도의 깊이',
  천을귀인: '위기에서 귀인이 돕는 복', 문창귀인: '글·시험·전문성의 총기',
};

const SINSAL_PRIORITY = ['백호살', '괴강살', '양인살', '천을귀인', '문창귀인', '도화살', '역마살', '화개살'];

/** 월지 십신 + 일지 십이운성 + 대표 신살을 묶은 한 줄 '키워드 세트'. 없으면 null. */
export function edgeKeywordSet(
  monthJiSipsin: Sipsin,
  dayUnseong: string,
  sinsal: Sinsal[],
): string | null {
  const sungbun = SIPSIN_SUNGBUN[monthJiSipsin];
  const energy = UNSEONG_ENERGY[dayUnseong];
  const star = SINSAL_PRIORITY.map((n) => sinsal.find((s) => s.name === n)).find(Boolean);
  if (!sungbun || !energy) return null;

  if (star) {
    const saek = SINSAL_SAEK[star.name] ?? star.desc;
    return `'${monthJiSipsin}(${sungbun}) + ${dayUnseong}(${energy} 에너지) + ${star.name}(${saek})'이 겹칩니다. ` +
      `${sungbun} 성분이 ${energy} 힘을 타고, 거기에 ${star.name}의 ${saek}까지 더해진 구조예요. ` +
      `이 세 개가 만나는 자리 — 전문·실전 분야에서 남들이 흉내 못 낼 한 방이 나옵니다.`;
  }
  // 신살이 없으면 성분+에너지만
  return `'${monthJiSipsin}(${sungbun}) + ${dayUnseong}(${energy} 에너지)' 조합이 당신의 일하는 색깔입니다. ` +
    `${sungbun} 기질이 ${energy} 흐름을 타고 발휘돼요.`;
}

// ── ② 원국 + 대운 + 세운 동적 형충회합 ──

interface Transit { gan: number; ji: number; ganKor: string; jiKor: string; sipsin: string; }

const YUKHAP: Record<number, number> = { 0: 1, 1: 0, 2: 11, 11: 2, 3: 10, 10: 3, 4: 9, 9: 4, 5: 8, 8: 5, 6: 7, 7: 6 };
const GAN_HAP: Record<number, number> = { 0: 5, 5: 0, 1: 6, 6: 1, 2: 7, 7: 2, 3: 8, 8: 3, 4: 9, 9: 4 };
const SAMHAP: number[][] = [[8, 0, 4], [2, 6, 10], [5, 9, 1], [11, 3, 7]];
const SAMHYEONG: number[][] = [[2, 5, 8], [1, 10, 7]];

// 원국 자리별 의미(충/변동이 어디서 일어나는지)
const POS_MEAN: Record<string, { chung: string; hap: string }> = {
  년: { chung: '뿌리·윗사람·먼 곳에서의 변동, 초년 인연의 정리', hap: '윗사람·먼 인연과의 결속' },
  월: { chung: '직장·환경·이동의 변동수, 부모·형제 일', hap: '직장·사회 관계에서의 협력과 집중' },
  일: { chung: '본인 심경과 배우자·이성 관계의 흔들림, 이사·이동', hap: '배우자·가까운 인연과의 밀착' },
  시: { chung: '자녀·말년 계획의 변경, 새 일의 마무리 점검', hap: '자녀·아랫사람·미래 계획에서의 인연' },
};

function pillarsList(p: { year: Pillar; month: Pillar; day: Pillar; hour: Pillar | null }) {
  const arr = [
    { pos: '년', gan: p.year.gan, ji: p.year.ji },
    { pos: '월', gan: p.month.gan, ji: p.month.ji },
    { pos: '일', gan: p.day.gan, ji: p.day.ji },
  ];
  if (p.hour) arr.push({ pos: '시', gan: p.hour.gan, ji: p.hour.ji });
  return arr;
}

/** 한 transit(대운 또는 세운) 간지가 원국과 맺는 충/합/형 관계 문장들 */
function interactOne(
  list: { pos: string; gan: number; ji: number }[],
  t: Transit,
  scopeLabel: string,
): string[] {
  const out: string[] = [];
  for (const o of list) {
    // 지지 충
    if (Math.abs(o.ji - t.ji) === 6) {
      out.push(`${scopeLabel} ${t.jiKor}(地)가 원국 ${o.pos}지 ${JIJI[o.ji]}을(를) 충(沖)합니다 — ${POS_MEAN[o.pos].chung}. 흔들리는 만큼 새 길이 열리니, 큰 결정은 한 박자 점검하고 가세요.`);
    }
    // 지지 육합
    else if (YUKHAP[o.ji] === t.ji) {
      out.push(`${scopeLabel} ${t.jiKor}(地)가 원국 ${o.pos}지 ${JIJI[o.ji]}과(와) 합(合)합니다 — ${POS_MEAN[o.pos].hap}. 묶이고 모이는 기운이라 인연·협력·계약에 좋은 흐름이에요.`);
    }
  }
  // 삼합(원국 2지 + transit 1지로 국 완성)
  const ojis = list.map((x) => x.ji);
  for (const tri of SAMHAP) {
    if (tri.includes(t.ji)) {
      const present = tri.filter((x) => x !== t.ji && ojis.includes(x));
      if (present.length >= 1) {
        out.push(`${scopeLabel} ${t.jiKor}(地)가 원국의 ${present.map((x) => JIJI[x]).join('·')}과(와) 모여 삼합 기운을 이룹니다 — 한 가지 목표로 힘이 결집되는 시기. 벌여둔 일을 키우기 좋아요.`);
        break;
      }
    }
  }
  // 삼형(원국 + transit)
  for (const set of SAMHYEONG) {
    if (set.includes(t.ji)) {
      const present = set.filter((x) => x !== t.ji && ojis.includes(x));
      if (present.length >= 1) {
        out.push(`${scopeLabel} ${t.jiKor}(地)가 원국 ${present.map((x) => JIJI[x]).join('·')}과(와) 형(刑)을 이룹니다 — 갈등·구설·건강을 조심하되, 전문 분야의 칼날로 쓰면 오히려 무기가 됩니다.`);
        break;
      }
    }
  }
  // 천간합
  for (const o of list) {
    if (GAN_HAP[o.gan] === t.gan) {
      out.push(`${scopeLabel} 천간이 원국 ${o.pos}干과 합(合)합니다 — 마음이 한쪽으로 쏠리는 인연·집중의 표시예요.`);
      break;
    }
  }
  return out;
}

export interface LuckDynamics {
  sewoon: string[];
  daewoon: string[];
}

/** 원국 8글자 + 현재 대운 2글자 + 올해 세운 2글자의 동적 형충회합 */
export function luckInteractions(
  pillars: { year: Pillar; month: Pillar; day: Pillar; hour: Pillar | null },
  daewoon: Transit,
  sewoon: Transit,
): LuckDynamics {
  const list = pillarsList(pillars);
  return {
    sewoon: interactOne(list, sewoon, '올해 세운').slice(0, 3),
    daewoon: interactOne(list, daewoon, '현재 대운').slice(0, 2),
  };
}

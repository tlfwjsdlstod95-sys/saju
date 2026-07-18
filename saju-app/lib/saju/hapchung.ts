// 합충(合沖) 분석 — 사주 네 기둥 사이의 천간합·지지 육합/삼합/충/형/해
// 정통 명리의 '관계' 분석. 명식의 간지 인덱스만으로 결정론적으로 도출. 외부 의존 0.
import { JIJI, JIJI_HANJA, CHEONGAN, CHEONGAN_HANJA } from './constants';
import type { Pillar } from './types';

export type HapchungType = '천간합' | '육합' | '삼합' | '반합' | '충' | '형' | '파' | '해';

export interface Hapchung {
  type: HapchungType;
  name: string;        // 예: '갑기합화토', '인오술 삼합'
  positions: string[]; // ['년', '일'] 등
  desc: string;
  tone: 'good' | 'bad' | 'neutral';
}

const POS = ['년', '월', '일', '시'] as const;

// 천간합: [간A, 간B, 화한 오행]
const GAN_HAP: [number, number, string][] = [
  [0, 5, '토'], [1, 6, '금'], [2, 7, '수'], [3, 8, '목'], [4, 9, '화'],
];
// 지지 육합: [지A, 지B, 화한 오행]
const YUKHAP: [number, number, string][] = [
  [0, 1, '토'], [2, 11, '목'], [3, 10, '화'], [4, 9, '금'], [5, 8, '수'], [6, 7, '화'],
];
// 지지 삼합: [세 지지, 국(局) 오행]
const SAMHAP: [number[], string][] = [
  [[8, 0, 4], '수'], [[2, 6, 10], '화'], [[5, 9, 1], '금'], [[11, 3, 7], '목'],
];
// 충: 6 (인덱스 차 6)
// 형: 삼형 두 세트 + 자형 + 상형
const SAMHYEONG: number[][] = [[2, 5, 8], [1, 10, 7]]; // 寅巳申, 丑戌未
const SANGHYEONG: [number, number] = [0, 3];           // 子卯 상형
const JAHYEONG = [4, 6, 9, 11];                         // 辰午酉亥 자형
// 해(害): 6쌍
const HAE: [number, number][] = [
  [0, 7], [1, 6], [2, 5], [3, 4], [8, 11], [9, 10],
];
// 파(破): 6쌍 — 子酉 丑辰 寅亥 卯午 巳申 戌未
const PA: [number, number][] = [
  [0, 9], [1, 4], [2, 11], [3, 6], [5, 8], [7, 10],
];

function jName(ji: number) { return `${JIJI_HANJA[ji]}(${JIJI[ji]})`; }

/** 존재하는 기둥들의 {pos, gan, ji} 목록 */
function pillarsList(p: { year: Pillar; month: Pillar; day: Pillar; hour: Pillar | null }) {
  const arr: { pos: string; gan: number; ji: number }[] = [
    { pos: '년', gan: p.year.gan, ji: p.year.ji },
    { pos: '월', gan: p.month.gan, ji: p.month.ji },
    { pos: '일', gan: p.day.gan, ji: p.day.ji },
  ];
  if (p.hour) arr.push({ pos: '시', gan: p.hour.gan, ji: p.hour.ji });
  return arr;
}

/**
 * @param gongmangPos 공망이 든 기둥 위치(['년','시'] 등). 전달 시 해당 자리가 낀 지지 관계에 감쇠 주석을 답니다.
 */
export function computeHapchung(p: { year: Pillar; month: Pillar; day: Pillar; hour: Pillar | null }, gongmangPos?: string[]): Hapchung[] {
  const list = pillarsList(p);
  const out: Hapchung[] = [];

  // 천간합 (쌍)
  for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) {
    const a = list[i].gan, b = list[j].gan;
    const hit = GAN_HAP.find(([x, y]) => (x === a && y === b) || (x === b && y === a));
    if (hit) out.push({
      type: '천간합', name: `${CHEONGAN[hit[0]]}${CHEONGAN[hit[1]]}합화 ${hit[2]}`,
      positions: [list[i].pos, list[j].pos],
      desc: `${list[i].pos}·${list[j].pos}干이 합해 ${hit[2]} 기운으로 묶입니다. 마음이 한 방향으로 쏠리는 인연·집중의 표시예요.`,
      tone: 'good',
    });
  }

  // 지지 육합
  for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) {
    const a = list[i].ji, b = list[j].ji;
    const hit = YUKHAP.find(([x, y]) => (x === a && y === b) || (x === b && y === a));
    if (hit) out.push({
      type: '육합', name: `${JIJI[hit[0]]}${JIJI[hit[1]]} 육합(${hit[2]})`,
      positions: [list[i].pos, list[j].pos],
      desc: `${jName(a)}·${jName(b)}가 합합니다. 가까이 묶여 협력하는 관계, 정(情)이 깊어지는 자리예요.`,
      tone: 'good',
    });
  }

  // 충
  for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) {
    const a = list[i].ji, b = list[j].ji;
    if (Math.abs(a - b) === 6) out.push({
      type: '충', name: `${JIJI[a]}${JIJI[b]} 충(沖)`,
      positions: [list[i].pos, list[j].pos],
      desc: `${jName(a)}·${jName(b)}가 정면으로 부딪칩니다. 변화·이동·결단의 에너지. 흔들릴 땐 오히려 새 길이 열리기도 해요.`,
      tone: 'bad',
    });
  }

  // 삼합 / 반합 (세 지지 중 2~3개)
  const jis = list.map((x) => x.ji);
  for (const [tri, gi] of SAMHAP) {
    const present = tri.filter((t) => jis.includes(t));
    if (present.length >= 2) {
      const full = present.length === 3;
      out.push({
        type: full ? '삼합' : '반합',
        name: `${tri.map((t) => JIJI[t]).join('')} ${full ? '삼합' : '반합'}(${gi}局)`,
        positions: list.filter((x) => present.includes(x.ji)).map((x) => x.pos),
        desc: `${present.map(jName).join('·')}가 모여 ${gi} 기운의 국(局)을 이룹니다. 한 가지 목표로 힘이 결집되는 강한 인연이에요.`,
        tone: 'good',
      });
    }
  }

  // 형(刑)
  for (const set of SAMHYEONG) {
    const present = set.filter((t) => jis.includes(t));
    if (present.length >= 2) out.push({
      type: '형', name: `${set.map((t) => JIJI[t]).join('')} 형(刑)`,
      positions: list.filter((x) => present.includes(x.ji)).map((x) => x.pos),
      desc: `${present.map(jName).join('·')} 사이에 형(刑)이 작용합니다. 갈등·수술·구설로 나타나기도 하나, 잘 쓰면 전문 분야의 칼날이 됩니다.`,
      tone: 'bad',
    });
  }
  // 자형(같은 지지 2개 이상)
  for (const t of JAHYEONG) {
    const cnt = jis.filter((x) => x === t).length;
    if (cnt >= 2) out.push({
      type: '형', name: `${JIJI[t]}${JIJI[t]} 자형(自刑)`,
      positions: list.filter((x) => x.ji === t).map((x) => x.pos),
      desc: `${jName(t)}가 겹쳐 스스로를 옭아매는 자형입니다. 같은 실수를 반복하기 쉬우니 한 박자 점검하는 습관이 약이에요.`,
      tone: 'bad',
    });
  }
  // 상형 子卯
  {
    const [a, b] = SANGHYEONG;
    if (jis.includes(a) && jis.includes(b)) out.push({
      type: '형', name: `${JIJI[a]}${JIJI[b]} 상형(相刑)`,
      positions: list.filter((x) => x.ji === a || x.ji === b).map((x) => x.pos),
      desc: `${jName(a)}·${jName(b)} 상형. 예의·관계에서 마찰이 생기기 쉬우니 말과 태도를 둥글게.`,
      tone: 'bad',
    });
  }

  // 해(害)
  for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) {
    const a = list[i].ji, b = list[j].ji;
    const hit = HAE.find(([x, y]) => (x === a && y === b) || (x === b && y === a));
    if (hit) out.push({
      type: '해', name: `${JIJI[hit[0]]}${JIJI[hit[1]]} 해(害)`,
      positions: [list[i].pos, list[j].pos],
      desc: `${jName(a)}·${jName(b)}가 서로를 깎는 해(害). 가까운 사이에서 서운함이 쌓이기 쉬우니 선을 지키는 게 좋아요.`,
      tone: 'neutral',
    });
  }

  // 파(破)
  for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) {
    const a = list[i].ji, b = list[j].ji;
    const hit = PA.find(([x, y]) => (x === a && y === b) || (x === b && y === a));
    if (hit) out.push({
      type: '파', name: `${JIJI[hit[0]]}${JIJI[hit[1]]} 파(破)`,
      positions: [list[i].pos, list[j].pos],
      desc: `${jName(a)}·${jName(b)}가 서로를 깨뜨리는 파(破). 진행 중인 일이 중간에 틀어지거나 재정비되는 자리 — 계획에 여유분을 두면 오히려 전화위복이 됩니다.`,
      tone: 'neutral',
    });
  }

  // 공망 감쇠 주석 — 공망 든 자리가 낀 지지 관계(육합·삼합·반합·충·형·파·해)는 통설상 작용력이 줄어듦
  if (gongmangPos?.length) {
    for (const h of out) {
      if (h.type === '천간합') continue; // 공망은 지지 기준
      const hitPos = h.positions.filter((x) => gongmangPos.includes(x));
      if (hitPos.length) h.desc += ` ※ ${hitPos.join('·')}지가 공망(空亡)이라 이 작용의 힘은 통설상 다소 약해집니다.`;
    }
  }

  return out;
}

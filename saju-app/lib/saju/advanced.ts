// 명식 고도화: 십이운성(十二運星) · 공망(空亡) · 신살(神殺) · 귀인(貴人)
import { JIJI, JIJI_HANJA } from './constants';
import type { Pillar } from './types';

// ── 십이운성 ──
const JANGSAENG = [11, 6, 2, 9, 2, 9, 5, 0, 8, 3]; // 갑..계 장생 지지
const UNSEONG = ['장생', '목욕', '관대', '건록', '제왕', '쇠', '병', '사', '묘', '절', '태', '양'];

export function unseongOf(dayGan: number, ji: number): string {
  const yang = dayGan % 2 === 0;
  const start = JANGSAENG[dayGan];
  const step = yang ? ji - start : start - ji;
  return UNSEONG[((step % 12) + 12) % 12];
}

// ── 공망 ──
export function gongmangOf(dayIndex: number): number[] {
  const sun = Math.floor(dayIndex / 10);
  return [((10 - 2 * sun) % 12 + 12) % 12, ((11 - 2 * sun) % 12 + 12) % 12];
}

// ── 신살 ──
const grp = (ji: number): '水' | '火' | '金' | '木' =>
  [8, 0, 4].includes(ji) ? '水' : [2, 6, 10].includes(ji) ? '火' : [5, 9, 1].includes(ji) ? '金' : '木';

// (도화·역마·화개 개별 테이블은 12신살 체계로 대체됨 — sin12Map 참조)
const CHEONEUL: Record<number, number[]> = { 0: [1, 7], 4: [1, 7], 6: [1, 7], 1: [0, 8], 5: [0, 8], 2: [11, 9], 3: [11, 9], 7: [2, 6], 8: [3, 5], 9: [3, 5] };
const MUNCHANG = [5, 6, 8, 9, 8, 9, 11, 0, 2, 3]; // 갑..계
const YANGIN: Record<number, number> = { 0: 3, 2: 6, 4: 6, 6: 9, 8: 0 }; // 양간
const GWAEGANG: [number, number][] = [[6, 4], [8, 4], [6, 10], [4, 10]]; // 경진 임진 경술 무술
const BAEKHO: [number, number][] = [[0, 4], [1, 7], [2, 10], [3, 1], [4, 4], [8, 10], [9, 1]];

export interface Sinsal { name: string; targets: string; desc: string; tone: 'good' | 'neutral' | 'caution'; }

export function computeSinsal(
  pillars: { year: Pillar; month: Pillar; day: Pillar; hour: Pillar | null },
  dayGan: number,
): Sinsal[] {
  const list: Sinsal[] = [];
  const branches = [pillars.year.ji, pillars.month.ji, pillars.day.ji, ...(pillars.hour ? [pillars.hour.ji] : [])];
  const names = ['년지', '월지', '일지', '시지'];
  const found = (target: number) => branches.map((b, i) => b === target ? names[i] : '').filter(Boolean);
  // ※ 도화(연살)·역마·화개는 12신살(sin12)로 통합 관리 — 여기서는 중복 표기하지 않는다.

  const ce = CHEONEUL[dayGan] ?? [];
  const ceFound = ce.flatMap((t) => found(t));
  if (ceFound.length) list.push({ name: '천을귀인', targets: ceFound.join('·'), tone: 'good', desc: '최고의 길성. 위기에 귀인이 나타나 돕고, 평생 흉이 길로 바뀌는 복을 타고났습니다.' });

  const mc = found(MUNCHANG[dayGan]);
  if (mc.length) list.push({ name: '문창귀인', targets: `${JIJI[MUNCHANG[dayGan]]}(${mc.join('·')})`, tone: 'good', desc: '학문·시험·문서의 귀인. 머리가 총명하고 글·자격·전문 분야에 강합니다.' });

  if (YANGIN[dayGan] !== undefined) {
    const yi = found(YANGIN[dayGan]);
    if (yi.length) list.push({ name: '양인살', targets: `${JIJI[YANGIN[dayGan]]}(${yi.join('·')})`, tone: 'caution', desc: '강한 추진력과 결단의 칼. 전문직·기술직에 유리하나 과하면 다툼·사고 주의.' });
  }

  if (GWAEGANG.some(([gn, jn]) => dayGan === gn && pillars.day.ji === jn))
    list.push({ name: '괴강살', targets: '일주', tone: 'caution', desc: '극과 극의 카리스마. 큰 인물의 그릇이나 기복이 커 리더십으로 다스려야 합니다.' });
  if (BAEKHO.some(([gn, jn]) => dayGan === gn && pillars.day.ji === jn))
    list.push({ name: '백호살', targets: '일주', tone: 'caution', desc: '강렬한 에너지와 추진력. 의료·법·무관 등 생사를 다루는 분야에서 대성합니다.' });

  // 원진·귀문 — 지지 쌍 관계 (모든 기둥 조합 스캔)
  const WONJIN: [number, number][] = [[0, 7], [1, 6], [2, 9], [3, 8], [4, 11], [5, 10]]; // 子未 丑午 寅酉 卯申 辰亥 巳戌
  const GWIMUN: [number, number][] = [[0, 9], [1, 6], [2, 7], [3, 8], [4, 11], [5, 10]]; // 子酉 丑午 寅未 卯申 辰亥 巳戌
  const pairHit = (pairs: [number, number][]) => {
    const hits: string[] = [];
    for (let i = 0; i < branches.length; i++) for (let j = i + 1; j < branches.length; j++) {
      if (pairs.some(([a, b]) => (a === branches[i] && b === branches[j]) || (b === branches[i] && a === branches[j])))
        hits.push(`${JIJI[branches[i]]}${JIJI[branches[j]]}(${names[i]}·${names[j]})`);
    }
    return Array.from(new Set(hits));
  };
  const wj = pairHit(WONJIN);
  if (wj.length) list.push({ name: '원진살', targets: wj.join(' '), tone: 'caution', desc: '이유 없이 밀고 당기는 애증의 기운. 가까운 관계일수록 서운함이 쌓이기 쉬우니, 담아두지 말고 표현하는 게 약입니다.' });
  const gmh = pairHit(GWIMUN);
  if (gmh.length) list.push({ name: '귀문관살', targets: gmh.join(' '), tone: 'caution', desc: '예민한 직감과 깊은 몰입의 별. 감수성·통찰이 비상하지만 생각이 꼬리를 물 땐 수면과 루틴으로 머리를 식혀주세요.' });

  return list;
}


// ── 12신살(十二神殺) ──
// 삼합국의 묘지(墓地) 바로 다음 지지에서 겁살이 시작해 12지지를 순행한다.
//  수국(신자진) 묘=진 → 겁살=사 / 화국(인오술) 묘=술 → 겁살=해
//  금국(사유축) 묘=축 → 겁살=인 / 목국(해묘미) 묘=미 → 겁살=신
// ※ 기존 도화(=연살)·역마·화개는 이 체계의 일부이며 값이 정확히 일치한다.
export const SIN12_ORDER = [
  '겁살', '재살', '천살', '지살', '연살', '월살',
  '망신살', '장성살', '반안살', '역마살', '육해살', '화개살',
] as const;
export type Sin12 = (typeof SIN12_ORDER)[number];

const SIN12_INFO: Record<Sin12, { alias?: string; tone: 'good' | 'neutral' | 'caution'; desc: string }> = {
  겁살: { tone: 'caution', desc: '뺏기고 흩어지는 자리. 예상 못 한 지출·이별이 따르지만, 밑바닥에서 다시 일으키는 뚝심도 여기서 나옵니다.' },
  재살: { alias: '수옥살', tone: 'caution', desc: '갇히고 얽매이는 기운(수옥). 송사·경쟁에 휘말리기 쉬운 대신, 법·수사·의료처럼 남을 제압하는 일에선 무기가 됩니다.' },
  천살: { tone: 'caution', desc: '내 힘으로 어쩔 수 없는 하늘의 몫. 무리해서 버티기보다 때를 기다릴 줄 알아야 하며, 신앙·철학에 마음이 열립니다.' },
  지살: { tone: 'neutral', desc: '움직여야 풀리는 자리. 이사·유학·출장처럼 스스로 발을 떼는 변화가 잦고, 일찍 독립하는 편입니다.' },
  연살: { alias: '도화살', tone: 'neutral', desc: '사람을 끌어당기는 매력과 인기. 연예·영업·예술에서 빛나지만 구설은 늘 함께 옵니다.' },
  월살: { alias: '고초살', tone: 'caution', desc: '메마르고 위축되는 기운. 하던 일이 더디게 풀리는 시기지만, 안으로 다지며 내공을 쌓는 자리이기도 합니다.' },
  망신살: { tone: 'caution', desc: '속이 드러나는 자리. 감추던 것이 밖으로 나와 체면을 구기기 쉬우나, 솔직함을 무기로 쓰면 오히려 신뢰를 얻습니다.' },
  장성살: { tone: 'good', desc: '무리를 이끄는 장수의 별. 주도권을 쥐고 조직을 끌고 가는 힘이 강하지만, 고집으로 굳으면 외로워집니다.' },
  반안살: { tone: 'good', desc: '말안장에 오르는 자리 — 출세·승진·윗사람의 발탁. 스스로 나서기보다 좋은 자리에 얹혀 올라가는 복입니다.' },
  역마살: { tone: 'neutral', desc: '이동·변화·해외의 기운. 한곳에 머물기보다 넓은 무대에서 기회가 열립니다.' },
  육해살: { tone: 'caution', desc: '조금씩 새어 나가는 소모. 일이 지연되고 잔병이 따르기 쉬우나, 눈치와 순발력이 빨라 위기를 잘 피합니다.' },
  화개살: { tone: 'neutral', desc: '예술·종교·학문·고독의 별. 깊이 파고드는 전문성과 영적 감수성이 있습니다.' },
};

/** 기준 지지(년지 또는 일지)로 본 12신살 배치 — 지지 12개 각각에 어떤 살이 붙는지 */
export function sin12Map(baseJi: number): Sin12[] {
  const g = grp(baseJi);
  const MYO: Record<string, number> = { 水: 4, 火: 10, 金: 1, 木: 7 }; // 진·술·축·미
  const start = (MYO[g] + 1) % 12; // 겁살 시작 지지
  const map: Sin12[] = new Array(12);
  for (let i = 0; i < 12; i++) map[(start + i) % 12] = SIN12_ORDER[i];
  return map;
}

export interface Sin12Hit { name: Sin12; alias?: string; ji: string; at: string[]; tone: 'good' | 'neutral' | 'caution'; desc: string; }

/** 명식 네 기둥에 실제로 걸린 12신살 목록 (기준: 년지 또는 일지) */
export function computeSin12(
  pillars: { year: Pillar; month: Pillar; day: Pillar; hour: Pillar | null },
  base: 'year' | 'day',
): Sin12Hit[] {
  const baseJi = base === 'year' ? pillars.year.ji : pillars.day.ji;
  const map = sin12Map(baseJi);
  const slots: [number, string][] = [
    [pillars.year.ji, '년지'], [pillars.month.ji, '월지'], [pillars.day.ji, '일지'],
    ...(pillars.hour ? [[pillars.hour.ji, '시지'] as [number, string]] : []),
  ];
  const byName = new Map<Sin12, Sin12Hit>();
  for (const [ji, pos] of slots) {
    const name = map[ji];
    const info = SIN12_INFO[name];
    const cur = byName.get(name);
    if (cur) { cur.at.push(pos); }
    else byName.set(name, { name, alias: info.alias, ji: `${JIJI[ji]}(${JIJI_HANJA[ji]})`, at: [pos], tone: info.tone, desc: info.desc });
  }
  return Array.from(byName.values()).sort((a, b) => SIN12_ORDER.indexOf(a.name) - SIN12_ORDER.indexOf(b.name));
}
export interface AdvancedMyeongsik {
  unseong: { year: string; month: string; day: string; hour: string | null };
  gongmang: { branches: string[]; pillars: { year: boolean; month: boolean; day: boolean; hour: boolean } };
  sinsal: Sinsal[];
  /** 12신살 — 년지 기준(정통 통설)과 일지 기준을 모두 제공 */
  sin12: { byYear: Sin12Hit[]; byDay: Sin12Hit[] };
}

export function computeAdvanced(
  pillars: { year: Pillar; month: Pillar; day: Pillar; hour: Pillar | null },
  dayGan: number,
  dayIndex: number,
): AdvancedMyeongsik {
  const gm = gongmangOf(dayIndex);
  return {
    unseong: {
      year: unseongOf(dayGan, pillars.year.ji),
      month: unseongOf(dayGan, pillars.month.ji),
      day: unseongOf(dayGan, pillars.day.ji),
      hour: pillars.hour ? unseongOf(dayGan, pillars.hour.ji) : null,
    },
    gongmang: {
      branches: gm.map((b) => `${JIJI[b]}(${JIJI_HANJA[b]})`),
      pillars: {
        year: gm.includes(pillars.year.ji),
        month: gm.includes(pillars.month.ji),
        day: gm.includes(pillars.day.ji),
        hour: pillars.hour ? gm.includes(pillars.hour.ji) : false,
      },
    },
    sinsal: computeSinsal(pillars, dayGan),
    sin12: { byYear: computeSin12(pillars, 'year'), byDay: computeSin12(pillars, 'day') },
  };
}

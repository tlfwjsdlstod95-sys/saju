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

const DOHWA: Record<string, number> = { 水: 9, 火: 3, 金: 6, 木: 0 };
const YEOKMA: Record<string, number> = { 水: 2, 火: 8, 金: 11, 木: 5 };
const HWAGAE: Record<string, number> = { 水: 4, 火: 10, 金: 1, 木: 7 };
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
  const g = grp(pillars.day.ji);

  let w = found(DOHWA[g]);
  if (w.length) list.push({ name: '도화살', targets: `${JIJI[DOHWA[g]]}(${w.join('·')})`, tone: 'neutral', desc: '사람을 끌어당기는 매력과 인기. 연예·영업·예술에서 빛나지만 구설은 주의.' });
  w = found(YEOKMA[g]);
  if (w.length) list.push({ name: '역마살', targets: `${JIJI[YEOKMA[g]]}(${w.join('·')})`, tone: 'neutral', desc: '이동·변화·해외의 기운. 한곳에 머물기보다 넓은 무대에서 기회가 열립니다.' });
  w = found(HWAGAE[g]);
  if (w.length) list.push({ name: '화개살', targets: `${JIJI[HWAGAE[g]]}(${w.join('·')})`, tone: 'neutral', desc: '예술·종교·학문·고독의 별. 깊이 파고드는 전문성과 영적 감수성이 있습니다.' });

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

  return list;
}

export interface AdvancedMyeongsik {
  unseong: { year: string; month: string; day: string; hour: string | null };
  gongmang: { branches: string[]; pillars: { year: boolean; month: boolean; day: boolean; hour: boolean } };
  sinsal: Sinsal[];
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
  };
}

// 官殺 갈래별 플래그를 **하나씩** 켜 보며 효과·부작용을 분리 측정한다.
//
// 왜 필요한가
//   네 규칙을 한꺼번에 켜고 "전체가 좋아졌다"로 끝내면, 다음 원전 편에서 오답이 났을 때
//   어느 규칙이 범인인지 알 수 없다. 갈래별로 **무엇을 고쳤고 무엇을 깨뜨렸는지**를 남긴다.
//
// 실행: npx tsx scripts/test-gwansal-combos.ts
import { readFileSync } from 'fs';
import { join } from 'path';
import { computeGyeokYong, setGwansalFlags, GWANSAL_ALL, GWANSAL_DEFAULT, type GwansalFlags } from '../lib/saju/gyeokyong';
import { chartFromGanji } from '../lib/saju/fromGanji';
import { dayMasterStrength } from '../lib/saju/elements';

const raw = JSON.parse(readFileSync(join(__dirname, 'golden-cases.json'), 'utf8'));
const cases: any[] = (raw.cases ?? []).filter(
  (c: any) => c.school === 'jeokcheonsu' && c.expect?.yongsin && c.pillars,
);

function run(): Map<string, boolean> {
  const m = new Map<string, boolean>();
  for (const c of cases) {
    try {
      const { dayGan, pillars } = chartFromGanji(c.pillars);
      const gy = computeGyeokYong(pillars, dayGan, dayMasterStrength(dayGan, pillars));
      m.set(c.id, gy.yongsin.primary === c.expect.yongsin);
    } catch { /* 입력이 깨진 케이스는 건너뛴다 */ }
  }
  return m;
}

const OFF: GwansalFlags = { hap: false, jaeja: false, salin: false, sikje: false, jesal: false, heo: false, seolin: false, jonggd: false, seupto: false, seupin: false, nanto: false };
const COMBOS: [string, GwansalFlags][] = [
  ['v7 (전부 끔)', OFF],
  ['+ 一曰 財滋弱殺', { ...OFF, jaeja: true }],
  ['+ 二曰 殺重用印', { ...OFF, salin: true }],
  ['+ 三曰 食神制殺', { ...OFF, sikje: true }],
  ['+ 四曰 合官留殺', { ...OFF, hap: true, seupin: false, nanto: false }],
  ['+ 六曰 制殺太過', { ...OFF, jesal: true }],
  ['+ 六曰 + 虛用', { ...OFF, jesal: true, heo: true }],
  ['+ 虛用만', { ...OFF, heo: true }],
  ['+ 洩重用印만', { ...OFF, seolin: true }],
  ['+ 從勢가드만', { ...OFF, jonggd: true }],
  ['+ 六曰 + 濕土제외', { ...OFF, jesal: true, seupto: true }],
  ['+ 濕土印→比劫만', { ...OFF, seolin: true, seupin: true, nanto: false }],
  ['+ 월지餘氣→比劫만', { ...OFF, nanto: true }],
  ['+ 현재 배포(v9)', { ...{ hap: true, jaeja: true, salin: true, sikje: true, jesal: false, heo: false, seolin: true, jonggd: false, seupin: false, nanto: false }, seupto: false }],
  ['+ 현재 배포(v10)', { hap: true, jaeja: true, salin: true, sikje: true, jesal: false, heo: false, seolin: true, jonggd: true, seupto: false , seupin: false, nanto: false }],
  ['+ v11 + 월지餘氣→比劫', { hap: true, jaeja: true, salin: true, sikje: true, jesal: false, heo: false, seolin: true, jonggd: true, seupto: false, seupin: true, nanto: true }],
  ['+ v10 + 濕土印→比劫', { hap: true, jaeja: true, salin: true, sikje: true, jesal: false, heo: false, seolin: true, jonggd: true, seupto: false, seupin: true, nanto: false }],
  ['+ v10 + 六曰 + 濕土제외', { hap: true, jaeja: true, salin: true, sikje: true, jesal: true, heo: false, seolin: true, jonggd: true, seupto: true , seupin: false, nanto: false }],
  ['+ 一二三四 + 洩重用印', { ...{ hap: true, jaeja: true, salin: true, sikje: true, jesal: false, heo: false, seolin: true, jonggd: false, seupin: false, nanto: false }, seupto: false }],
  ['+ 一二三四六', { ...{ hap: true, jaeja: true, salin: true, sikje: true, jesal: true, heo: false, seolin: false, jonggd: false, seupin: false, nanto: false }, seupto: false }],
  ['+ 一二三四六 + 虛用', GWANSAL_ALL],
];

const isUnseen = (id: string) => Number((id.match(/(\d+)$/) ?? [])[1] ?? 0) >= 71 && id.startsWith('JCS-');
const pct = (m: Map<string, boolean>, f?: (id: string) => boolean) => {
  const ids = [...m.keys()].filter((id) => !f || f(id));
  const hit = ids.filter((id) => m.get(id)).length;
  return `${((hit / ids.length) * 100).toFixed(1)}% (${hit}/${ids.length})`;
};

setGwansalFlags(OFF);
const base = run();

console.log(`골든 용신 ${cases.length}건 — 官殺 갈래별 분리 측정\n`);
console.log('조합'.padEnd(20) + '전체'.padEnd(18) + '미확인(JCS-071~)'.padEnd(20) + '고침 / 깨뜨림');
console.log('─'.repeat(88));
for (const [name, flags] of COMBOS) {
  setGwansalFlags(flags);
  const m = run();
  const fixed = [...m.keys()].filter((id) => m.get(id) && !base.get(id));
  const broke = [...m.keys()].filter((id) => !m.get(id) && base.get(id));
  console.log(
    name.padEnd(20) + pct(m).padEnd(18) + pct(m, isUnseen).padEnd(20) +
    `+${fixed.length} / -${broke.length}` +
    (fixed.length ? `\n${' '.repeat(20)}고침: ${fixed.join(' ')}` : '') +
    (broke.length ? `\n${' '.repeat(20)}⚠️ 깨뜨림: ${broke.join(' ')}` : ''),
  );
}
setGwansalFlags(GWANSAL_DEFAULT);

// 洩重用印이 무작위 명식에서 얼마나 자주 발동하는지 — 규칙이 '예외'인지 '기본값'인지 가른다.
import { chartFromGanji } from '../lib/saju/fromGanji';
import { dayMasterStrength } from '../lib/saju/elements';
import { CHEONGAN_HANJA, JIJI_HANJA, GAN_OHAENG, JI_OHAENG, JIJANGGAN } from '../lib/saju/constants';
const SAENG: any = { 목:'화', 화:'토', 토:'금', 금:'수', 수:'목' };
const inO = (d: string) => Object.keys(SAENG).find(k => SAENG[k] === d)!;
function gj(g: number, j: number) { return CHEONGAN_HANJA[g] + JIJI_HANJA[j]; }
let n = 0, mid = 0, fire = 0;
let seed = 20260827;
const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
for (let i = 0; i < 20000; i++) {
  const pick = () => { const g = Math.floor(rnd() * 10); const j = Math.floor(rnd() * 12); return (g % 2 === j % 2) ? gj(g, j) : gj(g, (j + 1) % 12); };
  let P;
  try { P = chartFromGanji({ year: pick(), month: pick(), day: pick(), hour: pick() }); } catch { continue; }
  n++;
  const st = dayMasterStrength(P.dayGan, P.pillars);
  if (st <= 0.38 || st >= 0.55) continue;
  mid++;
  const dayO = GAN_OHAENG[P.dayGan], sang = SAENG[dayO], i2 = inO(dayO);
  const list = [P.pillars.year, P.pillars.month, P.pillars.day, P.pillars.hour].filter(Boolean) as any[];
  const deep = (o: string) => { let c = 0; for (const p of list) {
    if (p !== P.pillars.day && GAN_OHAENG[p.gan] === o) c++;
    if (JI_OHAENG[p.ji] === o) c++;
    else { const j = JIJANGGAN[p.ji]; const g = [j.yeogi.gan, ...(j.junggi?[j.junggi.gan]:[]), j.jeonggi.gan];
      if (g.some((x:number)=>GAN_OHAENG[x]===o)) c++; } } return c; };
  const hasIn = list.some(p => (p !== P.pillars.day && GAN_OHAENG[p.gan] === i2) || JI_OHAENG[p.ji] === i2);
  if (deep(sang) >= 4 && hasIn) fire++;
}
console.log(`표본 ${n}건`);
console.log(`  중화 구간(0.38<s<0.55)           ${mid}건  ${(mid/n*100).toFixed(2)}%`);
console.log(`  그중 洩重用印 발동(식상 깊은집계>=4 & 인성 존재)  ${fire}건`);
console.log(`  전체 대비 발동률                  ${(fire/n*100).toFixed(2)}%`);

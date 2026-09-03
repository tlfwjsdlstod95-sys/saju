// 六曰 「관살 무력화 지수」 — 세 조건을 원전 4사례·오발동 후보에 대 보고 경계를 찾는다.
//   ① 식상 세력이 관살보다 압도적 (deepCount 비율)
//   ② 관살 고립 — 지지 정기·합국 뿌리 없음
//   ③ 식상을 달랠 財(통관)나 막을 印(방패)이 없거나 무근
import { readFileSync } from 'fs';
import { join } from 'path';
import { chartFromGanji } from '../lib/saju/fromGanji';
import { computeGyeokYong, hapguk } from '../lib/saju/gyeokyong';
import { dayMasterStrength } from '../lib/saju/elements';
import { GAN_OHAENG, JI_OHAENG, JIJANGGAN, JIJI_HANJA } from '../lib/saju/constants';
const SAENG: any = { 목:'화', 화:'토', 토:'금', 금:'수', 수:'목' };
const GEUK: any = { 목:'토', 토:'수', 수:'화', 화:'금', 금:'목' };
const gwanOf = (d: string) => Object.keys(GEUK).find(k => GEUK[k] === d)!;
const inOf = (d: string) => Object.keys(SAENG).find(k => SAENG[k] === d)!;
const SEUPTO = new Set([4, 1]);
const raw = JSON.parse(readFileSync(join(__dirname, 'golden-cases.json'), 'utf8'));
const LABEL: Record<string,string> = {
  'JCS-088':'★원전 四食相制','JCS-089':'★원전 一殺逢四制','JCS-090':'★원전 殺逢四制','JCS-091':'★원전 五殺逢五制',
  'JCS-005':'오발동후보','JCS-044':'오발동후보','JCS-033':'구오발동','JCS-063':'구오발동',
  'JCS-079':'三曰(건강한 制)','JCS-080':'三曰(건강한 制)','JCS-081':'三曰(건강한 制)','JCS-082':'三曰',
};
console.log('ID       라벨              食/殺(깊은)  ①비2배  ②殺고립  ③財印없음   셋다');
for (const c of (raw.cases as any[])) {
  if (!LABEL[c.id] || !c.pillars) continue;
  const { dayGan, pillars } = chartFromGanji(c.pillars);
  const dayO = GAN_OHAENG[dayGan], sang = SAENG[dayO], gwan = gwanOf(dayO), jae = GEUK[dayO], inO = inOf(dayO);
  const list = [pillars.year, pillars.month, pillars.day, pillars.hour].filter(Boolean) as any[];
  const deep = (o: string) => { let n=0; for (const p of list) {
    if (p !== pillars.day && GAN_OHAENG[p.gan] === o) n++;
    if (JI_OHAENG[p.ji] === o) n++;
    else { const j = JIJANGGAN[p.ji]; const g=[j.yeogi.gan,...(j.junggi?[j.junggi.gan]:[]),j.jeonggi.gan];
      if (g.some((x:number)=>GAN_OHAENG[x]===o)) { if (o==='수' && SEUPTO.has(p.ji)) continue; n++; } } } return n; };
  const rooted = (o: string) => list.some(p => JI_OHAENG[p.ji] === o) || hapguk(o as any, pillars) > 0;
  const stemOnly = (o: string) => list.some(p => p !== pillars.day && GAN_OHAENG[p.gan] === o);
  const S = deep(sang), G = deep(gwan);
  const c1 = G > 0 && S >= G * 2;
  const c2 = !rooted(gwan);
  const c3 = !( (rooted(jae) || stemOnly(jae)) || (rooted(inO) || stemOnly(inO)) );
  const all = c1 && c2 && c3;
  console.log(`${c.id} ${LABEL[c.id].padEnd(16)} ${String(S).padStart(2)}/${String(G).padStart(2)}       ${c1?'○':'·'}      ${c2?'○':'·'}       ${c3?'○':'·'}        ${all?'★':''}`);
}

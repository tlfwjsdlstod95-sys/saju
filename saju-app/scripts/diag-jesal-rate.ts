// 六曰 制殺太過가 무작위 명식에서 얼마나 자주 발동하는지 — 濕土 제외 적용 전/후를 같이 잰다.
import { chartFromGanji } from '../lib/saju/fromGanji';
import { CHEONGAN_HANJA, JIJI_HANJA, GAN_OHAENG, JI_OHAENG, JIJANGGAN } from '../lib/saju/constants';
const SAENG: any = { 목:'화', 화:'토', 토:'금', 금:'수', 수:'목' };
const GEUK: any = { 목:'토', 토:'수', 수:'화', 화:'금', 금:'목' };
const gwanO = (d: string) => Object.keys(GEUK).find(k => GEUK[k] === d)!;
const SEUPTO = new Set([4, 1]);
let seed = 20260827; const rnd = () => (seed = (seed*1103515245+12345) & 0x7fffffff)/0x7fffffff;
const gj = (g:number,j:number)=>CHEONGAN_HANJA[g]+JIJI_HANJA[j];
let n=0, fireRaw=0, fireSkip=0;
for (let i=0;i<20000;i++){
  const pick=()=>{const g=Math.floor(rnd()*10);const j=Math.floor(rnd()*12);return (g%2===j%2)?gj(g,j):gj(g,(j+1)%12);};
  let P; try { P = chartFromGanji({year:pick(),month:pick(),day:pick(),hour:pick()}); } catch { continue; }
  n++;
  const dayO = GAN_OHAENG[P.dayGan], sang = SAENG[dayO], g = gwanO(dayO);
  const list=[P.pillars.year,P.pillars.month,P.pillars.day,P.pillars.hour].filter(Boolean) as any[];
  const cnt=(o:string,skip:boolean)=>{let c=0;for(const p of list){
    if(p!==P.pillars.day && GAN_OHAENG[p.gan]===o) c++;
    if(JI_OHAENG[p.ji]===o) c++;
    else { const j=JIJANGGAN[p.ji]; const gs=[j.yeogi.gan,...(j.junggi?[j.junggi.gan]:[]),j.jeonggi.gan];
      if(gs.some((x:number)=>GAN_OHAENG[x]===o)){ if(skip && o==='수' && SEUPTO.has(p.ji)) continue; c++; } } } return c;};
  // 관살 존재는 얕은 집계(엔진의 counts와 같은 기준)
  let gShallow=0; for(const p of list){ if(p!==P.pillars.day && GAN_OHAENG[p.gan]===g) gShallow++; if(JI_OHAENG[p.ji]===g) gShallow++; }
  if (gShallow>0 && cnt(sang,false)>=4) fireRaw++;
  if (gShallow>0 && cnt(sang,true)>=4) fireSkip++;
}
console.log(`표본 ${n}건`);
console.log(`  六曰 발동 (濕土 제외 없음)  ${fireRaw}건  ${(fireRaw/n*100).toFixed(2)}%`);
console.log(`  六曰 발동 (濕土 제외 적용)  ${fireSkip}건  ${(fireSkip/n*100).toFixed(2)}%`);
console.log(`  → 濕土 제외가 걸러내는 양   ${fireRaw-fireSkip}건  ${((fireRaw-fireSkip)/n*100).toFixed(2)}%p`);

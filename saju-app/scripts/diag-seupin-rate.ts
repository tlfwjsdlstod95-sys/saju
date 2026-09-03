// 濕土印→比劫 이 무작위 명식에서 얼마나 자주 발동하는지.
import { chartFromGanji } from '../lib/saju/fromGanji';
import { dayMasterStrength } from '../lib/saju/elements';
import { CHEONGAN_HANJA, JIJI_HANJA, GAN_OHAENG, JI_OHAENG, JIJANGGAN } from '../lib/saju/constants';
const SAENG: any = { 목:'화', 화:'토', 토:'금', 금:'수', 수:'목' };
const inO = (d:string)=>Object.keys(SAENG).find(k=>SAENG[k]===d)!;
const SEUPTO = new Set([4,1]);
let seed=20260827; const rnd=()=>(seed=(seed*1103515245+12345)&0x7fffffff)/0x7fffffff;
const gj=(g:number,j:number)=>CHEONGAN_HANJA[g]+JIJI_HANJA[j];
let n=0, seolin=0, seupin=0;
for(let i=0;i<20000;i++){
  const pick=()=>{const g=Math.floor(rnd()*10);const j=Math.floor(rnd()*12);return (g%2===j%2)?gj(g,j):gj(g,(j+1)%12);};
  let P; try{P=chartFromGanji({year:pick(),month:pick(),day:pick(),hour:pick()});}catch{continue;}
  n++;
  const st=dayMasterStrength(P.dayGan,P.pillars);
  if(st<=0.38||st>=0.55) continue;
  const dayO=GAN_OHAENG[P.dayGan], sang=SAENG[dayO], i2=inO(dayO);
  const list=[P.pillars.year,P.pillars.month,P.pillars.day,P.pillars.hour].filter(Boolean) as any[];
  const deep=(o:string)=>{let c=0;for(const p of list){
    if(p!==P.pillars.day&&GAN_OHAENG[p.gan]===o)c++;
    if(JI_OHAENG[p.ji]===o)c++;
    else{const j=JIJANGGAN[p.ji];const g=[j.yeogi.gan,...(j.junggi?[j.junggi.gan]:[]),j.jeonggi.gan];
      if(g.some((x:number)=>GAN_OHAENG[x]===o))c++;}}return c;};
  const hasIn=list.some(p=>(p!==P.pillars.day&&GAN_OHAENG[p.gan]===i2)||JI_OHAENG[p.ji]===i2);
  if(!(deep(sang)>=4&&hasIn)) continue;
  seolin++;
  if(i2!=='토') continue;
  let seup=0,other=0;
  for(const p of list){ if(JI_OHAENG[p.ji]!=='토')continue; if(SEUPTO.has(p.ji))seup++;else other++; }
  if(seup>0&&other===0) seupin++;
}
console.log(`표본 ${n}건`);
console.log(`  洩重用印 발동            ${seolin}건  ${(seolin/n*100).toFixed(2)}%`);
console.log(`  └ 그중 濕土印→比劫로 전환  ${seupin}건  ${(seupin/n*100).toFixed(2)}%  (洩重用印의 ${(seupin/seolin*100).toFixed(1)}%)`);

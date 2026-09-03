// 결손(淸枯) 진단이 무작위 명식에서 얼마나 자주 뜨는지 — 흔하면 경고로서 의미가 없다.
import { chartFromGanji } from '../lib/saju/fromGanji';
import { dayMasterStrength } from '../lib/saju/elements';
import { computeGyeokYong } from '../lib/saju/gyeokyong';
import { CHEONGAN_HANJA, JIJI_HANJA } from '../lib/saju/constants';
let seed=20260827; const rnd=()=>(seed=(seed*1103515245+12345)&0x7fffffff)/0x7fffffff;
const gj=(g:number,j:number)=>CHEONGAN_HANJA[g]+JIJI_HANJA[j];
let n=0, hit=0; const byEl: Record<string, number> = {};
for(let i=0;i<20000;i++){
  const pick=()=>{const g=Math.floor(rnd()*10);const j=Math.floor(rnd()*12);return (g%2===j%2)?gj(g,j):gj(g,(j+1)%12);};
  let P; try{P=chartFromGanji({year:pick(),month:pick(),day:pick(),hour:pick()});}catch{continue;}
  n++;
  const gy:any=computeGyeokYong(P.pillars,P.dayGan,dayMasterStrength(P.dayGan,P.pillars));
  const l=gy.yongsin.lacking;
  if(l){ hit++; byEl[l.value]=(byEl[l.value]??0)+1; }
}
console.log(`표본 ${n}건 · 결손 진단 ${hit}건 (${(hit/n*100).toFixed(2)}%)`);
console.log('  결손 오행 분포', byEl);

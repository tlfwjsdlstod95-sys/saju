// 六曰을 켜면 **최종 용신이 실제로 바뀌는** 명식이 몇 %인가.
// '조건 발동률'과 '답이 바뀌는 비율'은 다르다 — 후자가 배포 판단의 기준이다.
import { chartFromGanji } from '../lib/saju/fromGanji';
import { dayMasterStrength } from '../lib/saju/elements';
import { computeGyeokYong, setGwansalFlags, GWANSAL_DEFAULT } from '../lib/saju/gyeokyong';
import { CHEONGAN_HANJA, JIJI_HANJA } from '../lib/saju/constants';
let seed=20260827; const rnd=()=>(seed=(seed*1103515245+12345)&0x7fffffff)/0x7fffffff;
const gj=(g:number,j:number)=>CHEONGAN_HANJA[g]+JIJI_HANJA[j];
const charts:any[]=[];
for(let i=0;i<20000;i++){
  const pick=()=>{const g=Math.floor(rnd()*10);const j=Math.floor(rnd()*12);return (g%2===j%2)?gj(g,j):gj(g,(j+1)%12);};
  try{ charts.push(chartFromGanji({year:pick(),month:pick(),day:pick(),hour:pick()})); }catch{}
}
const run=(jesal:boolean)=>{
  setGwansalFlags({ ...GWANSAL_DEFAULT, jesal, seupto: jesal });
  return charts.map(P=>computeGyeokYong(P.pillars,P.dayGan,dayMasterStrength(P.dayGan,P.pillars)).yongsin.primary);
};
const off=run(false), on=run(true);
setGwansalFlags(GWANSAL_DEFAULT);
let diff=0; const moves:Record<string,number>={};
for(let i=0;i<off.length;i++) if(off[i]!==on[i]){ diff++; const k=`${off[i]}→${on[i]}`; moves[k]=(moves[k]??0)+1; }
console.log(`표본 ${charts.length}건`);
console.log(`  六曰을 켰을 때 **최종 용신이 바뀌는** 명식: ${diff}건  ${(diff/charts.length*100).toFixed(2)}%`);
console.log('  이동 방향', Object.fromEntries(Object.entries(moves).sort((a,b)=>b[1]-a[1]).slice(0,6)));

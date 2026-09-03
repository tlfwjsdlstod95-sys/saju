import { computeSaju } from '../lib/saju';
let n=0, hits=0, biased=0, pos=0, neg=0;
const nameCount = new Map<string,number>();
const cntDist = new Map<number,number>();
for (let i=0;i<3000;i++){
  const y=1950+Math.floor(Math.random()*56), m=1+Math.floor(Math.random()*12), d=1+Math.floor(Math.random()*28);
  const h=Math.floor(Math.random()*24), mi=Math.floor(Math.random()*60);
  const r:any = computeSaju({year:y,month:m,day:d,hour:h,minute:mi,sex:Math.random()<.5?'M':'F',longitude:126.978} as any);
  const list = r.advanced.sin12.byYear;
  n++; hits+=list.length;
  cntDist.set(list.length,(cntDist.get(list.length)??0)+1);
  for(const x of list){ nameCount.set(x.name,(nameCount.get(x.name)??0)+1); if(x.bias){biased++; x.bias==='positive'?pos++:neg++;} }
}
console.log(`표본 ${n}건`);
console.log(`명식당 평균 12신살 ${(hits/n).toFixed(2)}개`);
console.log('개수 분포:', [...cntDist.entries()].sort((a,b)=>a[0]-b[0]).map(([k,v])=>`${k}개 ${(v/n*100).toFixed(1)}%`).join(' · '));
console.log(`길흉반전 발동: ${(biased/hits*100).toFixed(1)}% (positive ${pos} / negative ${neg})`);
console.log('살별 출현율:', [...nameCount.entries()].sort((a,b)=>b[1]-a[1]).map(([k,v])=>`${k} ${(v/n*100).toFixed(0)}%`).join(' · '));

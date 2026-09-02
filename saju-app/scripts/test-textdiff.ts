// 형제 쌍이 **화면에서 실제로 읽는 문장**이 얼마나 겹치는지 잰다.
// 판정이 달라도 설명문이 같은 틀에서 나오면 사용자는 "비슷하다"고 느낀다.
import { computeSaju } from '../lib/saju/index';
let seed = 987654;
function rnd() { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; }
function birth(y: number) {
  return { year: y, month: 1 + Math.floor(rnd() * 12), day: 1 + Math.floor(rnd() * 28),
    hour: Math.floor(rnd() * 24), minute: Math.floor(rnd() * 60), longitude: 126.978,
    sex: (rnd() < 0.5 ? 'M' : 'F') as 'M' | 'F' };
}
function texts(r: any): string[] {
  const t: string[] = [];
  t.push(r.gyeokYong.gyeokguk.desc);
  t.push(r.gyeokYong.yongsin.desc);
  t.push(r.gyeokYong.johu.desc);
  if (r.personality) t.push(typeof r.personality === 'string' ? r.personality : JSON.stringify(r.personality));
  return t.filter(Boolean);
}
const N = 2000;
let sameAll = 0, sameCnt = 0, tot = 0;
for (let i = 0; i < N; i++) {
  const y = 1960 + Math.floor(rnd() * 55);
  const a = computeSaju(birth(y)), b = computeSaju(birth(y + 1 + Math.floor(rnd() * 4)));
  const ta = texts(a), tb = texts(b);
  let same = 0;
  for (let k = 0; k < Math.min(ta.length, tb.length); k++) { tot++; if (ta[k] === tb[k]) { same++; sameCnt++; } }
  if (same === Math.min(ta.length, tb.length)) sameAll++;
}
console.log(`형제 쌍 ${N}개 — 화면 설명문 겹침`);
console.log(`  문단 단위 동일 비율     ${((sameCnt / tot) * 100).toFixed(2)}%`);
console.log(`  모든 문단이 통째로 동일 ${((sameAll / N) * 100).toFixed(2)}%`);

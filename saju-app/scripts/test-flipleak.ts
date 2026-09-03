// 무료 응답에 유료 판정(신살 길흉반전)이 새어 나가지 않는지 확인한다.
//
// 왜 스크립트로 두는가: 화면에서 가리는 방식은 번들만 열면 뚫린다.
// 우리는 응답에서 빼는 방식을 골랐고, 그 선택은 「빠졌는지」를 기계가 계속 확인해야 의미가 있다.
import { computeSaju } from '../lib/saju';
import { stripSinsalFlips } from '../lib/saju/advanced';

const N = 1500;
let checked = 0, leaks = 0, flipsTotal = 0, gated = 0;
const FLIP_WORDS = ['용신 글자', '희신 글자', '기신 글자', '구신 글자', '반전', '반감'];

for (let i = 0; i < N; i++) {
  const y = 1940 + Math.floor(Math.random() * 66);
  const r: any = computeSaju({
    year: y, month: 1 + Math.floor(Math.random() * 12), day: 1 + Math.floor(Math.random() * 28),
    hour: Math.floor(Math.random() * 24), minute: Math.floor(Math.random() * 60),
    sex: Math.random() < 0.5 ? 'M' : 'F', longitude: 126.978,
  } as any);

  // 서버 진실값에는 반전이 살아 있어야 한다
  flipsTotal += r.advanced.sin12.byYear.filter((x: any) => x.flip).length;

  // 무료 응답 모양 그대로 만든다
  const free = stripSinsalFlips(r.advanced.sin12.byYear);
  if (free.summary.flips > 0) gated++;

  for (const x of free.list as any[]) {
    checked++;
    if (x.flip !== undefined) { leaks++; console.log(`  [누수] flip 필드가 남음: ${x.name}`); }
    if (x.bias !== undefined) { leaks++; console.log(`  [누수] bias 필드가 남음: ${x.name}`); }
    for (const w of FLIP_WORDS) {
      if (String(x.desc).includes(w)) { leaks++; console.log(`  [누수] desc 안에 판정 문구 「${w}」: ${x.name} — ${x.desc}`); break; }
    }
  }
}
console.log(`\n무료 응답 누수 검사 — 표본 ${N}건 / 살 ${checked}개`);
console.log(`  서버 진실값의 반전 판정   ${flipsTotal}건 (살아 있어야 정상)`);
console.log(`  반전이 걸린 명식          ${(gated / N * 100).toFixed(1)}%  ← 결제 유인이 생기는 비율`);
console.log(`  무료 응답 누수            ${leaks}건`);
console.log(leaks === 0 ? '\n✅ PASS — 무료 응답에 유료 판정이 없다.' : '\n❌ FAIL — 누수가 있다.');
process.exit(leaks === 0 ? 0 : 1);

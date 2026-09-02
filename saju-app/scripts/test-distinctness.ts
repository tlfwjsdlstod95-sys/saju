// 「형제끼리 풀이가 비슷하게 나온다」는 의심을 숫자로 검증한다.
//
// 물어야 할 것은 두 가지다.
//   A. 명식(팔자) 자체가 다르게 나오는가        — 여기가 같으면 계산 버그다
//   B. **풀이를 가르는 판정 묶음**이 다르게 나오는가 — 여기가 같으면 글이 비슷해진다
//        판정 묶음 = 일간 · 강약라벨 · 격국 · 용신 · 조후 · 십신 우세 …
//
// 실행: npx tsx scripts/test-distinctness.ts
import { computeSaju } from '../lib/saju/index';

let seed = 424242;
function rnd() { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; }

function birth(y: number, m: number, d: number, h: number, mi: number) {
  return { year: y, month: m, day: d, hour: h, minute: mi, longitude: 126.978, sex: (rnd() < 0.5 ? 'M' : 'F') as 'M' | 'F' };
}

function sig(r: any) {
  const top = Object.entries(r.sipsinSummary as Record<string, number>)
    .sort((a, b) => b[1] - a[1])[0]?.[0] ?? '-';
  return {
    palja: [r.pillars.year, r.pillars.month, r.pillars.day, r.pillars.hour]
      .filter(Boolean).map((p: any) => `${p.gan}-${p.ji}`).join('/'),
    // 풀이 문장을 가르는 축들
    core: [
      r.dayMaster.gan,
      r.dayMasterStrength <= 0.38 ? '신약' : r.dayMasterStrength >= 0.55 ? '신강' : '중화',
      r.gyeokYong.gyeokguk.key,
      r.gyeokYong.yongsin.primary,
      r.gyeokYong.yongsin.method,
      r.gyeokYong.johu.climate,
      top,
    ].join('|'),
  };
}

const N = 4000;
// ── 1) 무작위 두 사람 ──────────────────────────────
let paljaSame = 0, coreSame = 0;
for (let i = 0; i < N; i++) {
  const a = computeSaju(birth(1930 + Math.floor(rnd() * 96), 1 + Math.floor(rnd() * 12), 1 + Math.floor(rnd() * 28), Math.floor(rnd() * 24), Math.floor(rnd() * 60)));
  const b = computeSaju(birth(1930 + Math.floor(rnd() * 96), 1 + Math.floor(rnd() * 12), 1 + Math.floor(rnd() * 28), Math.floor(rnd() * 24), Math.floor(rnd() * 60)));
  const sa = sig(a), sb = sig(b);
  if (sa.palja === sb.palja) paljaSame++;
  if (sa.core === sb.core) coreSame++;
}

// ── 2) 형제 — 1~4년 터울, 같은 부모, 생일은 무관 ──
let sPalja = 0, sCore = 0, sPartial = 0;
for (let i = 0; i < N; i++) {
  const y = 1960 + Math.floor(rnd() * 55);
  const gap = 1 + Math.floor(rnd() * 4);
  const a = computeSaju(birth(y, 1 + Math.floor(rnd() * 12), 1 + Math.floor(rnd() * 28), Math.floor(rnd() * 24), Math.floor(rnd() * 60)));
  const b = computeSaju(birth(y + gap, 1 + Math.floor(rnd() * 12), 1 + Math.floor(rnd() * 28), Math.floor(rnd() * 24), Math.floor(rnd() * 60)));
  const sa = sig(a), sb = sig(b);
  if (sa.palja === sb.palja) sPalja++;
  if (sa.core === sb.core) sCore++;
  // 부분 일치 — 7개 축 중 5개 이상 같으면 "읽기에 비슷하다"고 본다
  const A = sa.core.split('|'), B = sb.core.split('|');
  if (A.filter((v, k) => v === B[k]).length >= 5) sPartial++;
}

const p = (n: number) => `${((n / N) * 100).toFixed(2)}%`;
console.log(`표본 ${N} 쌍씩\n`);
console.log('── 무작위 두 사람 ──');
console.log(`  팔자 완전 동일        ${p(paljaSame)}`);
console.log(`  판정 묶음 완전 동일   ${p(coreSame)}`);
console.log('\n── 형제(1~4년 터울) ──');
console.log(`  팔자 완전 동일        ${p(sPalja)}`);
console.log(`  판정 묶음 완전 동일   ${p(sCore)}`);
console.log(`  7축 중 5축 이상 일치  ${p(sPartial)}   ← 이 값이 크면 "비슷하게 읽힌다"`);

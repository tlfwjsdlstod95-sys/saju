// 엔진 판정 분포 스냅샷 (baseline)
//
// 왜 필요한가
//   강약·용신은 정답표가 없다. 그래서 "이 변경이 옳은가"는 못 물어도
//   **"이 변경이 판정을 어디로, 얼마나 옮겼는가"** 는 물을 수 있다.
//   사령 일수·통근 가중치를 넣었는데 신약 비율이 31%→58% 로 튀면 그건 정밀화가 아니라 사고다.
//
//   실행:  npx tsx scripts/engine-baseline.ts            → 현재 분포 출력 + 저장
//          npx tsx scripts/engine-baseline.ts --compare  → 저장된 baseline 과 대조
//
//   ⚠️ 표본은 고정 시드로 생성한다. 시드를 바꾸면 비교가 무의미해진다.

import { writeFileSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { computeSaju } from '../lib/saju/index';
import { ENGINE_VERSION } from '../lib/saju/version';

const SNAPSHOT = join(__dirname, 'engine-baseline.json');
const N = 20000;

let seed = 20260827; // 고정 — 절대 바꾸지 말 것
function rnd() { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; }

function sample() {
  return {
    year: 1930 + Math.floor(rnd() * 96),
    month: 1 + Math.floor(rnd() * 12),
    day: 1 + Math.floor(rnd() * 28),
    hour: Math.floor(rnd() * 24),
    minute: Math.floor(rnd() * 60),
    longitude: 126.978,
    sex: rnd() < 0.5 ? 'M' : 'F',
  };
}

type Dist = Record<string, number>;
const bump = (d: Dist, k: string) => { d[k] = (d[k] ?? 0) + 1; };
const pct = (d: Dist, total: number) =>
  Object.fromEntries(Object.entries(d)
    .sort((a, b) => b[1] - a[1])
    .map(([k, v]) => [k, +(v / total * 100).toFixed(2)]));

const strengthLabel: Dist = {};
const yongsinMethod: Dist = {};
const yongsinElement: Dist = {};
const gyeokguk: Dist = {};
const johuClimate: Dist = {};
const strengthHist: Dist = {};   // 0.05 구간
let strengthSum = 0;

for (let i = 0; i < N; i++) {
  const r = computeSaju(sample() as any);
  const s = r.dayMasterStrength;
  strengthSum += s;
  bump(strengthLabel, s <= 0.38 ? '신약' : s >= 0.55 ? '신강' : '중화');
  bump(strengthHist, (Math.floor(s / 0.05) * 0.05).toFixed(2));
  bump(yongsinMethod, r.gyeokYong.yongsin.method);
  bump(yongsinElement, r.gyeokYong.yongsin.primary);
  bump(gyeokguk, r.gyeokYong.gyeokguk.key);
  bump(johuClimate, r.gyeokYong.johu.climate);
}

const snap = {
  engine: ENGINE_VERSION,
  samples: N,
  seed: 20260827,
  strengthMean: +(strengthSum / N).toFixed(4),
  strengthLabel: pct(strengthLabel, N),
  strengthHist: pct(strengthHist, N),
  yongsinMethod: pct(yongsinMethod, N),
  yongsinElement: pct(yongsinElement, N),
  gyeokguk: pct(gyeokguk, N),
  johuClimate: pct(johuClimate, N),
};

const compare = process.argv.includes('--compare');

if (compare) {
  if (!existsSync(SNAPSHOT)) { console.error('저장된 baseline 이 없습니다. 먼저 --compare 없이 실행하세요.'); process.exit(1); }
  const prev = JSON.parse(readFileSync(SNAPSHOT, 'utf8'));
  console.log(`baseline(engine v${prev.engine}) ↔ 현재(engine v${snap.engine})  표본 ${N}건\n`);
  console.log(`강약 평균: ${prev.strengthMean} → ${snap.strengthMean}  (${(snap.strengthMean - prev.strengthMean >= 0 ? '+' : '')}${(snap.strengthMean - prev.strengthMean).toFixed(4)})\n`);
  let maxShift = 0;
  for (const key of ['strengthLabel', 'yongsinMethod', 'yongsinElement', 'gyeokguk', 'johuClimate'] as const) {
    console.log(`[${key}]`);
    const keys = new Set([...Object.keys(prev[key] ?? {}), ...Object.keys(snap[key])]);
    for (const k of keys) {
      const a = prev[key]?.[k] ?? 0, b = snap[key][k] ?? 0;
      const d = +(b - a).toFixed(2);
      if (Math.abs(d) > maxShift) maxShift = Math.abs(d);
      const mark = Math.abs(d) >= 5 ? ' ⚠️' : Math.abs(d) >= 1 ? ' ·' : '';
      console.log(`  ${k.padEnd(10)} ${String(a).padStart(6)}% → ${String(b).padStart(6)}%  ${d >= 0 ? '+' : ''}${d}${mark}`);
    }
    console.log('');
  }
  console.log(`최대 이동폭 ${maxShift}%p ${maxShift >= 5 ? '— ⚠️ 5%p 이상 이동. 의도한 변화인지 확인하세요.' : '— 안정적.'}`);
} else {
  writeFileSync(SNAPSHOT, JSON.stringify(snap, null, 2) + '\n');
  console.log(`baseline 저장: scripts/engine-baseline.json  (engine v${ENGINE_VERSION}, 표본 ${N}건)\n`);
  console.log(`강약 평균 ${snap.strengthMean}`);
  console.log(`강약 라벨 `, snap.strengthLabel);
  console.log(`용신 방식 `, snap.yongsinMethod);
  console.log(`용신 오행 `, snap.yongsinElement);
  console.log(`격국      `, snap.gyeokguk);
  console.log(`조후      `, snap.johuClimate);
}

// 용신 불일치 케이스 진단 — 왜 갈렸는지 원인별로 뜯어본다.
//   실행: npx tsx scripts/analyze-yongsin.ts
//
// test-golden 은 "맞았다/틀렸다"만 말한다. 이 스크립트는 그 한 건 안에서
// 억부·조후(자격 포함)·병약·통관·종격이 각각 어떤 값을 냈고 왜 그게 채택/기각됐는지를 찍는다.
// 충돌 유형 분류표(헤아림_용신_충돌표.md)의 근거 자료.

import { readFileSync } from 'fs';
import { join } from 'path';
import { dayMasterStrength, sipsin, jisipsin } from '../lib/saju/elements';
import { computeGyeokYong, computeJohu, johuEligibility } from '../lib/saju/gyeokyong';
import { CHEONGAN, CHEONGAN_HANJA, JIJI, JIJI_HANJA, GAN_OHAENG, JI_OHAENG, JIJANGGAN } from '../lib/saju/constants';
import type { Pillar } from '../lib/saju/types';

const SAENG: Record<string, string> = { 목: '화', 화: '토', 토: '금', 금: '수', 수: '목' };
const GEUK: Record<string, string> = { 목: '토', 토: '수', 수: '화', 화: '금', 금: '목' };
const OHS = ['목', '화', '토', '금', '수'];

function toPillar(gj: string, dayGan: number, isDay = false): Pillar {
  const g = CHEONGAN_HANJA.indexOf(gj[0] as any);
  const j = JIJI_HANJA.indexOf(gj[1] as any);
  const jjg = JIJANGGAN[j];
  return {
    gan: g, ji: j, ganKor: CHEONGAN[g], jiKor: JIJI[j],
    ganHanja: CHEONGAN_HANJA[g], jiHanja: JIJI_HANJA[j],
    ganOhaeng: GAN_OHAENG[g], jiOhaeng: JI_OHAENG[j],
    ganSipsin: isDay ? null : sipsin(dayGan, g),
    jiSipsin: jisipsin(dayGan, jjg.jeonggi.gan),
    jijanggan: [jjg.yeogi.gan, ...(jjg.junggi ? [jjg.junggi.gan] : []), jjg.jeonggi.gan],
  } as Pillar;
}

// --rate : 무작위 표본에서 '기준 충돌' 배지가 얼마나 자주 뜨는지 (화면 노이즈 점검용)
if (process.argv.includes('--rate')) {
  const { computeSaju } = require('../lib/saju/index');
  const N = 3000;
  let conflict = 0;
  const byMethod: Record<string, number> = {};
  let seed = 20260902;
  const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  for (let i = 0; i < N; i++) {
    const r = computeSaju({
      year: 1940 + Math.floor(rnd() * 80), month: 1 + Math.floor(rnd() * 12), day: 1 + Math.floor(rnd() * 28),
      hour: Math.floor(rnd() * 24), minute: 0, sex: rnd() < 0.5 ? 'M' : 'F', longitude: 126.978,
    });
    const y = r.gyeokYong.yongsin;
    if (y.conflict) conflict++;
    byMethod[y.method] = (byMethod[y.method] ?? 0) + 1;
  }
  console.log(`무작위 ${N}건 — 기준 충돌 ${(conflict / N * 100).toFixed(1)}%`);
  console.log('채택된 법 분포:', Object.entries(byMethod).map(([k, v]) => `${k} ${(v / N * 100).toFixed(1)}%`).join(' / '));
  process.exit(0);
}

const raw = JSON.parse(readFileSync(join(__dirname, 'golden-cases.json'), 'utf8'));
const cases: any[] = raw.cases ?? [];
const only = process.argv.slice(2);

for (const c of cases) {
  if (c.school !== 'jeokcheonsu' || !c.expect?.yongsin || !c.pillars) continue;
  if (only.length && !only.includes(c.id)) continue;

  const dayGan = CHEONGAN_HANJA.indexOf(c.pillars.day[0] as any);
  const p = {
    year: toPillar(c.pillars.year, dayGan),
    month: toPillar(c.pillars.month, dayGan),
    day: toPillar(c.pillars.day, dayGan, true),
    hour: c.pillars.hour ? toPillar(c.pillars.hour, dayGan) : null,
  };
  const strength = dayMasterStrength(dayGan, p);
  const gy = computeGyeokYong(p, dayGan, strength);
  const got = gy.yongsin.primary;
  const ok = got === c.expect.yongsin;
  if (only.length === 0 && ok) continue; // 기본은 불일치만

  // 오행 분포(엔진과 동일한 8자 세기)
  const counts: Record<string, number> = {};
  for (const q of [p.year, p.month, p.day, p.hour]) {
    if (!q) continue;
    counts[q.ganOhaeng] = (counts[q.ganOhaeng] ?? 0) + 1;
    counts[q.jiOhaeng] = (counts[q.jiOhaeng] ?? 0) + 1;
  }
  const dayO = GAN_OHAENG[dayGan];
  const johuRes = computeJohu(dayGan, p.month.ji);
  const elig = johuEligibility(johuRes.need, p);

  // 통관 후보 — 현행 규칙(각 3+ 이고 차이 1 이내)과, 차이 2까지 넓혔을 때
  const pairs: string[] = [];
  for (const a of OHS) for (const b of OHS) {
    if (GEUK[a] !== b) continue;
    const ca = counts[a] ?? 0, cb = counts[b] ?? 0;
    if (ca < 3 || cb < 3) continue;
    const bridge = SAENG[a];
    if (SAENG[bridge] !== b) continue;
    pairs.push(`${a}${ca}:${b}${cb} → 다리 ${bridge} (차이 ${Math.abs(ca - cb)}${Math.abs(ca - cb) <= 1 ? ', 현행 발동' : ', 현행 미발동'})`);
  }
  // 병약
  const byeong = OHS.find((o) => (counts[o] ?? 0) >= 5 && o !== dayO);
  // 일간 통근 — 지지 정기/지장간에 일간 오행이 있는가
  const roots: string[] = [];
  for (const q of [p.year, p.month, p.day, p.hour]) {
    if (!q) continue;
    if (q.jiOhaeng === dayO) roots.push(`${q.jiHanja}(정기)`);
    else if (q.jijanggan.some((g: number) => GAN_OHAENG[g] === dayO)) roots.push(`${q.jiHanja}(지장간)`);
  }

  console.log(`\n━━ ${c.id}  ${c.pillars.year} ${c.pillars.month} ${c.pillars.day} ${c.pillars.hour ?? '(시 미상)'}  [일간 ${CHEONGAN_HANJA[dayGan]}·${dayO}]`);
  console.log(`   문헌 ${c.expect.yongsin} / 엔진 ${got}(${gy.yongsin.method})  ${ok ? 'OK' : '✗ 불일치'}`);
  console.log(`   출처: ${c.source.book} ${c.source.chapter ?? ''} ${c.source.page ?? ''}`);
  console.log(`   강약 ${strength.toFixed(3)} (${strength <= 0.38 ? '신약' : strength >= 0.55 ? '신강' : '중화'})${c.expect.strength ? ` / 문헌 ${c.expect.strength}` : ''}`);
  console.log(`   분포 ${OHS.map((o) => `${o}${counts[o] ?? 0}`).join(' ')}`);
  console.log(`   일간 뿌리: ${roots.length ? roots.join(', ') : '없음(무근)'}`);
  console.log(`   억부값 ${gy.yongsin.eokbu} / 조후값 ${johuRes.need ?? '없음'} (${johuRes.climate}, 시급 ${johuRes.urgent}, 자격 ${elig.eligible ? '통과' : '미달-' + elig.reason})`);
  console.log(`   병약: ${byeong ? `병 ${byeong}(${counts[byeong]}개) → 약 ${OHS.find((x) => GEUK[x] === byeong)}` : '해당 없음'}`);
  console.log(`   통관: ${pairs.length ? pairs.join(' / ') : '해당 없음'}`);
  console.log(`   종격 조건: 강약 ${strength.toFixed(3)} (종왕 ≥0.90 / 종세 ≤0.03 + 특정오행 4개↑) → ${strength >= 0.9 || strength <= 0.03 ? '발동' : '미발동'}`);
  console.log(`   격국 ${gy.gyeokguk.name}`);
  if (c.note) console.log(`   원문: ${String(c.note).slice(0, 200)}`);
}

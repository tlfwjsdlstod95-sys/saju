// 용신 오답 일괄 분류 — 개별 케이스를 땜질하기 전에 '공통 패턴'을 찾기 위한 진단 도구.
// 판정에는 관여하지 않는다. 출력만 한다.
import { readFileSync } from 'fs';
import { join } from 'path';
import { dayMasterStrength, sipsin, jisipsin } from '../lib/saju/elements';
import { computeGyeokYong } from '../lib/saju/gyeokyong';
import { CHEONGAN, CHEONGAN_HANJA, JIJI, JIJI_HANJA, GAN_OHAENG, JI_OHAENG, JIJANGGAN } from '../lib/saju/constants';
import type { Pillar } from '../lib/saju/types';

function toPillar(gj: string, dayGan: number, isDay = false): Pillar {
  const g = CHEONGAN_HANJA.indexOf(gj[0] as any);
  const j = JIJI_HANJA.indexOf(gj[1] as any);
  const jjg = JIJANGGAN[j];
  return { gan: g, ji: j, ganKor: CHEONGAN[g], jiKor: JIJI[j], ganHanja: CHEONGAN_HANJA[g], jiHanja: JIJI_HANJA[j],
    ganOhaeng: GAN_OHAENG[g], jiOhaeng: JI_OHAENG[j], ganSipsin: isDay ? null : sipsin(dayGan, g),
    jiSipsin: jisipsin(dayGan, jjg.jeonggi.gan),
    jijanggan: [jjg.yeogi.gan, ...(jjg.junggi ? [jjg.junggi.gan] : []), jjg.jeonggi.gan] } as Pillar;
}
const label = (s: number) => (s <= 0.38 ? '신약' : s >= 0.55 ? '신강' : '중화');
const raw = JSON.parse(readFileSync(join(__dirname, 'golden-cases.json'), 'utf8'));
const cases: any[] = raw.cases ?? [];

// 일간 기준 '문헌 용신'이 어느 십신인지 — 오답이 어느 방향으로 쏠리는지 보려는 것
const SAENG: any = { 목: '화', 화: '토', 토: '금', 금: '수', 수: '목' };
const GEUK: any = { 목: '토', 토: '수', 수: '화', 화: '금', 금: '목' };
function role(dayO: string, o: string) {
  if (o === dayO) return '비겁';
  if (SAENG[dayO] === o) return '식상';
  if (SAENG[o] === dayO) return '인성';
  if (GEUK[dayO] === o) return '재성';
  if (GEUK[o] === dayO) return '관성';
  return '?';
}

const rows: any[] = [];
for (const c of cases) {
  if (c.school !== 'jeokcheonsu' || !c.expect?.yongsin || !c.pillars) continue;
  const dayGan = CHEONGAN_HANJA.indexOf(c.pillars.day[0]);
  const p = { year: toPillar(c.pillars.year, dayGan), month: toPillar(c.pillars.month, dayGan),
    day: toPillar(c.pillars.day, dayGan, true), hour: c.pillars.hour ? toPillar(c.pillars.hour, dayGan) : null };
  const st = dayMasterStrength(dayGan, p);
  const gy = computeGyeokYong(p, dayGan, st);
  const got = gy.yongsin.primary, want = c.expect.yongsin;
  if (got === want) continue;
  const dayO = GAN_OHAENG[dayGan];
  rows.push({ id: c.id, dayO, st: st.toFixed(3), lab: label(st),
    want, wantRole: role(dayO, want), got, gotRole: role(dayO, got),
    method: gy.yongsin.method, gyeok: gy.gyeokguk?.name ?? '-',
    page: c.source?.page ?? '', chap: (c.source?.chapter ?? '').replace('卷二 通神論 ','') });
}
console.log(`용신 오답 ${rows.length}건\n`);
console.log('ID       일간 강약(값)    문헌→          엔진→          방식      격국          출전');
for (const r of rows)
  console.log(`${r.id} ${r.dayO}  ${r.lab}(${r.st}) ${(r.want+'/'+r.wantRole).padEnd(8)} → ${(r.got+'/'+r.gotRole).padEnd(8)} ${r.method.padEnd(9)} ${r.gyeok.padEnd(12)} ${r.chap} ${r.page}`);

const by: any = {};
for (const r of rows) { const k = `${r.wantRole} → ${r.gotRole}`; (by[k] ??= []).push(r.id); }
console.log('\n방향별 집계 (문헌이 원한 십신 → 엔진이 고른 십신)');
for (const [k, v] of Object.entries<any>(by).sort((a: any, b: any) => b[1].length - a[1].length))
  console.log(`  ${k.padEnd(16)} ${String(v.length).padStart(2)}건  ${v.join(' ')}`);
const byM: any = {};
for (const r of rows) (byM[r.method] ??= []).push(r.id);
console.log('\n채택 방식별');
for (const [k, v] of Object.entries<any>(byM).sort((a: any, b: any) => b[1].length - a[1].length))
  console.log(`  ${k.padEnd(9)} ${String(v.length).padStart(2)}건  ${v.join(' ')}`);

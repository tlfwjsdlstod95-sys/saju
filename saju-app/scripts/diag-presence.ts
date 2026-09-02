// 오답이 원한 오행이 원국에 '있기는 한가' — v6 후보소거 설계의 구조적 천장을 재는 진단.
import { readFileSync } from 'fs';
import { join } from 'path';
import { dayMasterStrength, sipsin, jisipsin } from '../lib/saju/elements';
import { computeGyeokYong, hapguk } from '../lib/saju/gyeokyong';
import { CHEONGAN, CHEONGAN_HANJA, JIJI, JIJI_HANJA, GAN_OHAENG, JI_OHAENG, JIJANGGAN } from '../lib/saju/constants';
import type { Pillar } from '../lib/saju/types';
function toPillar(gj: string, dayGan: number, isDay = false): Pillar {
  const g = CHEONGAN_HANJA.indexOf(gj[0] as any), j = JIJI_HANJA.indexOf(gj[1] as any), jjg = JIJANGGAN[j];
  return { gan: g, ji: j, ganKor: CHEONGAN[g], jiKor: JIJI[j], ganHanja: CHEONGAN_HANJA[g], jiHanja: JIJI_HANJA[j],
    ganOhaeng: GAN_OHAENG[g], jiOhaeng: JI_OHAENG[j], ganSipsin: isDay ? null : sipsin(dayGan, g),
    jiSipsin: jisipsin(dayGan, jjg.jeonggi.gan),
    jijanggan: [jjg.yeogi.gan, ...(jjg.junggi ? [jjg.junggi.gan] : []), jjg.jeonggi.gan] } as Pillar;
}
function pres(o: string, P: any) {
  const list = [P.year, P.month, P.day, P.hour].filter(Boolean);
  let stems = 0, jeonggi = 0, hidden = 0;
  for (const p of list) {
    if (p !== P.day && GAN_OHAENG[p.gan] === o) stems++;
    if (p.jiOhaeng === o) jeonggi++;
    else if (p.jijanggan.some((g: number) => GAN_OHAENG[g] === o)) hidden++;
  }
  return { stems, jeonggi, hidden };
}
const raw = JSON.parse(readFileSync(join(__dirname, 'golden-cases.json'), 'utf8'));
const buckets: Record<string, string[]> = {};
for (const c of (raw.cases as any[])) {
  if (c.school !== 'jeokcheonsu' || !c.expect?.yongsin || !c.pillars) continue;
  const dayGan = CHEONGAN_HANJA.indexOf(c.pillars.day[0]);
  const P: any = { year: toPillar(c.pillars.year, dayGan), month: toPillar(c.pillars.month, dayGan),
    day: toPillar(c.pillars.day, dayGan, true), hour: c.pillars.hour ? toPillar(c.pillars.hour, dayGan) : null };
  const gy = computeGyeokYong(P, dayGan, dayMasterStrength(dayGan, P));
  if (gy.yongsin.primary === c.expect.yongsin) continue;
  const w = pres(c.expect.yongsin, P), hg = hapguk(c.expect.yongsin as any, P);
  const k = w.stems === 0 && w.jeonggi === 0 && hg === 0
    ? (w.hidden === 0 ? 'A. 원국에 아예 없음' : 'B. 지장간에만 숨어 있음')
    : w.jeonggi === 0 && hg === 0 ? 'C. 천간에만 떠 있음(무근)' : 'D. 뿌리까지 있는데 못 골랐음';
  (buckets[k] ??= []).push(`${c.id}(${c.expect.yongsin}: 천${w.stems}/정기${w.jeonggi}/장간${w.hidden}/합국${hg})`);
}
for (const k of Object.keys(buckets).sort())
  console.log(`${k} — ${buckets[k].length}건\n   ${buckets[k].join('\n   ')}\n`);

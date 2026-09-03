// 조후우선·병약이 '억부를 가로막을 자격'이 있는가 — 통관 때(v8.1) 썼던 방법을 그대로 적용한다.
//   ① 그 방식으로 결정된 골든이 몇 건이고 몇 건 맞는가
//   ② 그 분기를 껐다면(=억부로 흘렀다면) 답이 맞았을까
import { readFileSync } from 'fs';
import { join } from 'path';
import { chartFromGanji } from '../lib/saju/fromGanji';
import { dayMasterStrength } from '../lib/saju/elements';
import { computeGyeokYong } from '../lib/saju/gyeokyong';
import { GAN_OHAENG, JI_OHAENG } from '../lib/saju/constants';
const raw = JSON.parse(readFileSync(join(__dirname, 'golden-cases.json'), 'utf8'));
const byM: Record<string, any[]> = {};
for (const c of (raw.cases as any[])) {
  if (c.school !== 'jeokcheonsu' || !c.expect?.yongsin || !c.pillars || c.dupOf) continue;
  const { dayGan, pillars } = chartFromGanji(c.pillars);
  const st = dayMasterStrength(dayGan, pillars);
  const gy = computeGyeokYong(pillars, dayGan, st);
  const m = gy.yongsin.method;
  const eok = (gy.yongsin as any).bases?.find((b:any)=>b.method==='억부')?.value;
  // 세력 집중도 — 병약 게이트를 얼마나 세게 잡아야 하는지 보려는 값
  const list=[pillars.year,pillars.month,pillars.day,pillars.hour].filter(Boolean) as any[];
  const cnt: any = {}; let tot=0;
  for (const p of list) {
    if (p!==pillars.day) { const o=GAN_OHAENG[p.gan]; cnt[o]=(cnt[o]??0)+1; tot++; }
    const jo=JI_OHAENG[p.ji]; cnt[jo]=(cnt[jo]??0)+1; tot++;
  }
  const dayO = GAN_OHAENG[dayGan];
  const top = Object.entries(cnt).filter(([o])=>o!==dayO).sort((a:any,b:any)=>b[1]-a[1])[0] as any;
  (byM[m] ??= []).push({ id:c.id, want:c.expect.yongsin, got:gy.yongsin.primary,
    hit:gy.yongsin.primary===c.expect.yongsin, eok, eokHit: eok===c.expect.yongsin,
    conc: top ? `${top[0]} ${top[1]}/${tot} (${(top[1]/tot*100).toFixed(0)}%)` : '-' });
}
for (const m of ['조후우선','병약','통관','종격']) {
  const rows = byM[m] ?? [];
  if (!rows.length) { console.log(`\n【${m}】 0건\n`); continue; }
  const hit = rows.filter(r=>r.hit).length, eokHit = rows.filter(r=>r.eokHit).length;
  console.log(`\n【${m}】 ${rows.length}건 중 적중 ${hit}건   ← 억부였다면 ${eokHit}건 적중`);
  for (const r of rows)
    console.log(`   ${r.id} ${r.hit?'✅':'❌'} 문헌 ${r.want} / 채택 ${r.got} / 억부라면 ${r.eok}${r.eokHit?' ✔':''}   최대세력 ${r.conc}`);
}
const eokRows = byM['억부'] ?? [];
console.log(`\n【억부】 ${eokRows.length}건 중 적중 ${eokRows.filter(r=>r.hit).length}건`);

// 六曰 制殺太過 발동 조건이 실제로 걸리는지 — 세 근거 케이스에서 직접 확인한다.
import { readFileSync } from 'fs';
import { join } from 'path';
import { chartFromGanji } from '../lib/saju/fromGanji';
import { dayMasterStrength } from '../lib/saju/elements';
import { computeGyeokYong, analyzeGwansal } from '../lib/saju/gyeokyong';
import { GAN_OHAENG, JI_OHAENG } from '../lib/saju/constants';
const SAENG: any = { 목:'화', 화:'토', 토:'금', 금:'수', 수:'목' };
const GEUK: any = { 목:'토', 토:'수', 수:'화', 화:'금', 금:'목' };
const inO = (d: string) => Object.keys(SAENG).find(k => SAENG[k] === d)!;
const gwanO = (d: string) => Object.keys(GEUK).find(k => GEUK[k] === d)!;
const raw = JSON.parse(readFileSync(join(__dirname, 'golden-cases.json'), 'utf8'));
const want = ['JCS-088','JCS-089','JCS-090','JCS-091','JCS-092','JCS-033','JCS-063'];
for (const c of (raw.cases as any[])) {
  if (!want.includes(c.id)) continue;
  const { dayGan, pillars } = chartFromGanji(c.pillars);
  const st = dayMasterStrength(dayGan, pillars);
  const gy = computeGyeokYong(pillars, dayGan, st);
  const dayO = GAN_OHAENG[dayGan];
  const counts: any = {};
  for (const p of [pillars.year, pillars.month, pillars.day, pillars.hour]) {
    if (!p) continue;
    if (p !== pillars.day) counts[GAN_OHAENG[p.gan]] = (counts[GAN_OHAENG[p.gan]] ?? 0) + 1;
    counts[JI_OHAENG[p.ji]] = (counts[JI_OHAENG[p.ji]] ?? 0) + 1;
  }
  const g = gwanO(dayO), sang = SAENG[dayO], i = inO(dayO), jae = GEUK[dayO];
  const gs = analyzeGwansal(dayGan, pillars, counts);
  const fires = (counts[g] ?? 0) > 0 && (counts[sang] ?? 0) >= (counts[g] ?? 0) * 2;
  console.log(`${c.id}  일간 ${dayO} 강약 ${st.toFixed(3)}  방식=${gy.yongsin.method}  문헌 ${c.expect.yongsin} / 엔진 ${gy.yongsin.primary}`);
  console.log(`   counts 관살(${g})=${counts[g]??0} 식상(${sang})=${counts[sang]??0} 인성(${i})=${counts[i]??0} 재성(${jae})=${counts[jae]??0}`);
  console.log(`   六曰 조건(식상 >= 관살*2) = ${fires}   gs.threat=${gs.threat} mixed=${gs.mixed} hap=${gs.resolvedByHap}\n`);
}

// 「土가 넘치는 水를 막아 用神이 된다」 계열 — 원문이 같은 논리를 쓰는 사례를 한자리에 놓고
// 우리 병약 분기(특정 오행 >= 5)가 실제로 걸리는지 잰다.
import { readFileSync } from 'fs';
import { join } from 'path';
import { chartFromGanji } from '../lib/saju/fromGanji';
import { dayMasterStrength } from '../lib/saju/elements';
import { computeGyeokYong } from '../lib/saju/gyeokyong';
import { GAN_OHAENG, JI_OHAENG, JIJANGGAN } from '../lib/saju/constants';
const SAENG: any = { 목:'화', 화:'토', 토:'금', 금:'수', 수:'목' };
const GEUK: any = { 목:'토', 토:'수', 수:'화', 화:'금', 금:'목' };
const OHS = ['목','화','토','금','수'];
function role(dayO: string, o: string) {
  if (o === dayO) return '비겁';
  if (SAENG[dayO] === o) return '식상';
  if (SAENG[o] === dayO) return '인성';
  if (GEUK[dayO] === o) return '재성';
  return '관살';
}
const raw = JSON.parse(readFileSync(join(__dirname, 'golden-cases.json'), 'utf8'));
const want = process.argv.slice(2).length ? process.argv.slice(2)
  : ['JCS-001','JCS-038','JCS-070','JCS-081','JCS-050'];
for (const c of (raw.cases as any[])) {
  if (!want.includes(c.id)) continue;
  const { dayGan, pillars } = chartFromGanji(c.pillars);
  const st = dayMasterStrength(dayGan, pillars);
  const gy = computeGyeokYong(pillars, dayGan, st);
  const dayO = GAN_OHAENG[dayGan];
  const list = [pillars.year, pillars.month, pillars.day, pillars.hour].filter(Boolean) as any[];
  const shallow: any = {}, deep: any = {};
  for (const p of list) {
    if (p !== pillars.day) { const o = GAN_OHAENG[p.gan]; shallow[o]=(shallow[o]??0)+1; deep[o]=(deep[o]??0)+1; }
    const jo = JI_OHAENG[p.ji]; shallow[jo]=(shallow[jo]??0)+1; deep[jo]=(deep[jo]??0)+1;
    const j = JIJANGGAN[p.ji];
    const gans = [j.yeogi.gan, ...(j.junggi ? [j.junggi.gan] : []), j.jeonggi.gan];
    for (const o of OHS) if (o !== jo && gans.some((g:number)=>GAN_OHAENG[g]===o)) deep[o]=(deep[o]??0)+1;
  }
  // 판을 덮은 오행 = 일간 오행이 아니면서 가장 많은 것
  const flood = OHS.filter(o=>o!==dayO).sort((a,b)=>(shallow[b]??0)-(shallow[a]??0))[0];
  const cure = OHS.find(o => GEUK[o] === flood)!;
  const hit = gy.yongsin.primary === c.expect.yongsin;
  console.log(`${c.id} ${hit?'✅':'❌'} 일간 ${dayO}(${st.toFixed(3)})  문헌 ${c.expect.yongsin} / 엔진 ${gy.yongsin.primary}(${gy.yongsin.method})`);
  console.log(`   얕은집계 ${OHS.map(o=>`${o}${shallow[o]??0}`).join(' ')}   깊은집계 ${OHS.map(o=>`${o}${deep[o]??0}`).join(' ')}`);
  console.log(`   판을 덮은 오행 ${flood}(${role(dayO,flood)}, 얕은 ${shallow[flood]??0} / 깊은 ${deep[flood]??0})  → 그것을 극하는 ${cure}(${role(dayO,cure)})  [병약 조건 >=5: ${(shallow[flood]??0)>=5}]`);
  console.log(`   문헌 용신이 곧 '극하는 오행'인가: ${cure === c.expect.yongsin}\n`);
}

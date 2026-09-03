// 문헌이 '비겁(일간과 같은 오행)'을 用神으로 지목한 사례를 전부 모은다.
// 지금 억부는 신약에서 인성 6.0 / 비겁 2.0 이라, 비겁이 이기는 일이 거의 없다.
// 원전이 언제 비겁을 쓰는지 규칙이 있는지 확인하는 게 목적이다.
import { readFileSync } from 'fs';
import { join } from 'path';
import { chartFromGanji } from '../lib/saju/fromGanji';
import { dayMasterStrength } from '../lib/saju/elements';
import { computeGyeokYong } from '../lib/saju/gyeokyong';
import { GAN_OHAENG, JI_OHAENG, JIJANGGAN } from '../lib/saju/constants';
const SAENG: any = { 목:'화', 화:'토', 토:'금', 금:'수', 수:'목' };
const GEUK: any = { 목:'토', 토:'수', 수:'화', 화:'금', 금:'목' };
const OHS = ['목','화','토','금','수'];
const raw = JSON.parse(readFileSync(join(__dirname, 'golden-cases.json'), 'utf8'));
const rows: any[] = [];
for (const c of (raw.cases as any[])) {
  if (c.school !== 'jeokcheonsu' || !c.expect?.yongsin || !c.pillars || c.dupOf) continue;
  const { dayGan, pillars } = chartFromGanji(c.pillars);
  const dayO = GAN_OHAENG[dayGan];
  if (c.expect.yongsin !== dayO) continue;   // 비겁을 지목한 것만
  const st = dayMasterStrength(dayGan, pillars);
  const gy = computeGyeokYong(pillars, dayGan, st);
  const list = [pillars.year, pillars.month, pillars.day, pillars.hour].filter(Boolean) as any[];
  const deep = (o: string) => { let n=0; for (const p of list) {
    if (p !== pillars.day && GAN_OHAENG[p.gan] === o) n++;
    if (JI_OHAENG[p.ji] === o) n++;
    else { const j = JIJANGGAN[p.ji]; const g=[j.yeogi.gan,...(j.junggi?[j.junggi.gan]:[]),j.jeonggi.gan];
      if (g.some((x:number)=>GAN_OHAENG[x]===o)) n++; } } return n; };
  const inO = OHS.find(o => SAENG[o] === dayO)!, sangO = SAENG[dayO], jaeO = GEUK[dayO];
  const gwanO = OHS.find(o => GEUK[o] === dayO)!;
  rows.push({ id: c.id, dayO, st: st.toFixed(3), got: gy.yongsin.primary, method: gy.yongsin.method,
    hit: gy.yongsin.primary === dayO,
    d: `인${deep(inO)} 비${deep(dayO)} 식${deep(sangO)} 재${deep(jaeO)} 관${deep(gwanO)}`,
    page: `${(c.source?.chapter ?? '').replace('卷二 通神論 ','')} ${c.source?.page ?? ''}`,
    note: (c.note ?? '').replace(/^원문:\s*/,'').slice(0, 200) });
}
console.log(`문헌이 비겁을 用神으로 지목한 사례 ${rows.length}건\n`);
for (const r of rows) {
  console.log(`${r.id} ${r.hit?'✅':'❌'} 일간 ${r.dayO} 강약 ${r.st}  엔진 ${r.got}(${r.method})  [${r.d}]  ${r.page}`);
  console.log(`   ${r.note}\n`);
}

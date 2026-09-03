// 「일간이 煖土(未·戌)의 지장간 火에만 통근한 명식」이 골든에 몇 건이나 있는지 센다.
// 규칙을 만들기 전에 **근거가 몇 건인지** 먼저 확인하는 게 목적이다(한 건짜리 규칙은 넣지 않는다).
import { readFileSync } from 'fs';
import { join } from 'path';
import { chartFromGanji } from '../lib/saju/fromGanji';
import { dayMasterStrength } from '../lib/saju/elements';
import { computeGyeokYong } from '../lib/saju/gyeokyong';
import { GAN_OHAENG, JI_OHAENG, JIJANGGAN, JIJI_HANJA } from '../lib/saju/constants';
const SAENG: any = { 목:'화', 화:'토', 토:'금', 금:'수', 수:'목' };
const inOf = (d:string)=>Object.keys(SAENG).find(k=>SAENG[k]===d)!;
const NANTO = new Set([7, 10]);   // 未(7) · 戌(10)
const raw = JSON.parse(readFileSync(join(__dirname, 'golden-cases.json'), 'utf8'));
const rows:any[]=[];
for (const c of (raw.cases as any[])) {
  if (c.school !== 'jeokcheonsu' || !c.expect?.yongsin || !c.pillars || c.dupOf) continue;
  const { dayGan, pillars } = chartFromGanji(c.pillars);
  const st = dayMasterStrength(dayGan, pillars);
  if (st > 0.38) continue;                       // 신약 구간만
  const dayO = GAN_OHAENG[dayGan], inO = inOf(dayO);
  const list=[pillars.year,pillars.month,pillars.day,pillars.hour].filter(Boolean) as any[];
  // 일간이 煖土 안에 숨은 형태로만 통근했는가
  let nanto=0, dayJeonggi=0, inJeonggi=0, inStem=0;
  for (const p of list) {
    if (JI_OHAENG[p.ji]===dayO) dayJeonggi++;
    if (JI_OHAENG[p.ji]===inO) inJeonggi++;
    if (p!==pillars.day && GAN_OHAENG[p.gan]===inO) inStem++;
    if (NANTO.has(p.ji)) { const j=JIJANGGAN[p.ji];
      const g=[j.yeogi.gan,...(j.junggi?[j.junggi.gan]:[]),j.jeonggi.gan];
      if (g.some((x:number)=>GAN_OHAENG[x]===dayO)) nanto++; }
  }
  if (!(dayJeonggi===0 && nanto>=1)) continue;    // 정기 뿌리는 없고 煖土에만 숨어 있음
  const gy = computeGyeokYong(pillars, dayGan, st);
  rows.push({ id:c.id, dayO, st:st.toFixed(3), want:c.expect.yongsin, got:gy.yongsin.primary,
    hit:gy.yongsin.primary===c.expect.yongsin, nanto, inJeonggi, inStem,
    jis:list.map((p:any)=>JIJI_HANJA[p.ji]).join(''),
    page:`${(c.source?.chapter??'').replace('卷二 通神論 ','')} ${c.source?.page??''}` });
}
console.log(`신약 + 일간이 煖土(未·戌) 지장간에만 통근한 명식: ${rows.length}건\n`);
console.log('ID       일간 강약    지지    煖土통근  인성(정기/천간)  문헌 / 엔진');
for (const r of rows)
  console.log(`${r.id} ${r.hit?'✅':'❌'} ${r.dayO} ${r.st}  ${r.jis}   ${r.nanto}자리      ${r.inJeonggi}/${r.inStem}          ${r.want} / ${r.got}   ${r.page}`);
console.log(`\n그중 '문헌이 비겁을 지목' 한 건: ${rows.filter(r=>r.want===r.dayO).length}건`);

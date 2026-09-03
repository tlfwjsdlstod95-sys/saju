// Track B 후보 — 「신약인데 일간을 도울 印이 원국에 전무」한 명식을 전부 찾는다.
// 규칙을 만들기 전에 **근거가 몇 건인지** 먼저 센다(JCS-091 한 건짜리 규칙은 넣지 않는다).
import { readFileSync } from 'fs';
import { join } from 'path';
import { chartFromGanji } from '../lib/saju/fromGanji';
import { dayMasterStrength } from '../lib/saju/elements';
import { computeGyeokYong } from '../lib/saju/gyeokyong';
import { GAN_OHAENG, JI_OHAENG, JIJANGGAN, JIJI_HANJA } from '../lib/saju/constants';
const SAENG: any = { 목:'화', 화:'토', 토:'금', 금:'수', 수:'목' };
const GEUK: any = { 목:'토', 토:'수', 수:'화', 화:'금', 금:'목' };
const inOf = (d: string) => Object.keys(SAENG).find(k => SAENG[k] === d)!;
const raw = JSON.parse(readFileSync(join(__dirname, 'golden-cases.json'), 'utf8'));
const rows: any[] = [];
for (const c of (raw.cases as any[])) {
  if (c.school !== 'jeokcheonsu' || !c.pillars || c.dupOf) continue;
  const { dayGan, pillars } = chartFromGanji(c.pillars);
  const st = dayMasterStrength(dayGan, pillars);
  if (st > 0.38) continue;                       // 신약만
  const dayO = GAN_OHAENG[dayGan], inO = inOf(dayO);
  const list = [pillars.year, pillars.month, pillars.day, pillars.hour].filter(Boolean) as any[];
  // 印이 '살아 있게' 존재하는가 — 천간·지지 정기, 그리고 극당하지 않은 지장간
  let alive = false, hiddenDead = 0;
  for (const p of list) {
    if (p !== pillars.day && GAN_OHAENG[p.gan] === inO) alive = true;
    if (JI_OHAENG[p.ji] === inO) alive = true;
    else {
      const j = JIJANGGAN[p.ji];
      const g = [j.yeogi.gan, ...(j.junggi ? [j.junggi.gan] : []), j.jeonggi.gan];
      if (g.some((x: number) => GAN_OHAENG[x] === inO)) {
        if (GEUK[JI_OHAENG[p.ji]] !== inO) alive = true; else hiddenDead++;
      }
    }
  }
  if (alive) continue;                           // 印이 살아 있으면 대상 아님
  const gy = computeGyeokYong(pillars, dayGan, st);
  rows.push({ id: c.id, dayO, inO, st: st.toFixed(3),
    want: c.expect?.yongsin ?? '-', got: gy.yongsin.primary, method: gy.yongsin.method,
    wantIsIn: c.expect?.yongsin === inO, hiddenDead,
    jis: list.map((p: any) => JIJI_HANJA[p.ji]).join(''),
    page: `${(c.source?.chapter ?? '').replace('卷二 通神論 ', '')} ${c.source?.page ?? ''}` });
}
console.log(`신약 + 印이 원국에 살아 있지 않은 명식: ${rows.length}건\n`);
console.log('ID       일간 印  강약    지지    문헌 / 엔진(방식)          문헌이 印을 지목?');
for (const r of rows)
  console.log(`${r.id} ${r.dayO}  ${r.inO}  ${r.st}  ${r.jis}   ${r.want} / ${r.got}(${r.method})`.padEnd(72) + (r.wantIsIn ? '★ 예' : '아니오') + `   ${r.page}`);
console.log(`\n▶ 그중 문헌이 印을 用神으로 지목한 건: ${rows.filter(r => r.wantIsIn).length}건`);

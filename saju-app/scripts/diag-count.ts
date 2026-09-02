// 임철초는 「四食相制」「一殺逢四制」「五殺逢五制」처럼 殺과 制의 개수를 직접 센다.
// 그 산술이 어느 집계 방식과 맞는지 확인한다 — 천간+정기 / 천간+정기+지장간.
import { readFileSync } from 'fs';
import { join } from 'path';
import { chartFromGanji } from '../lib/saju/fromGanji';
import { GAN_OHAENG, JI_OHAENG, JIJANGGAN } from '../lib/saju/constants';
const SAENG: any = { 목:'화', 화:'토', 토:'금', 금:'수', 수:'목' };
const GEUK: any = { 목:'토', 토:'수', 수:'화', 화:'금', 금:'목' };
const gwanO = (d: string) => Object.keys(GEUK).find(k => GEUK[k] === d)!;
const raw = JSON.parse(readFileSync(join(__dirname, 'golden-cases.json'), 'utf8'));
const want: Record<string,string> = {
  'JCS-088':'獨殺 + 四食相制','JCS-089':'一殺逢四制','JCS-090':'殺逢四制','JCS-091':'五殺逢五制',
  'JCS-092':'(대조: 合官留殺)','JCS-033':'(구 오발동)','JCS-063':'(구 오발동)','JCS-005':'(신 오발동)','JCS-044':'(신 오발동)',
};
console.log('ID        원문 표현            殺(천간+정기 / +지장간)   制(천간+정기 / +지장간)');
for (const c of (raw.cases as any[])) {
  if (!want[c.id]) continue;
  const { dayGan, pillars } = chartFromGanji(c.pillars);
  const dayO = GAN_OHAENG[dayGan], g = gwanO(dayO), sang = SAENG[dayO];
  const list = [pillars.year, pillars.month, pillars.day, pillars.hour].filter(Boolean) as any[];
  const cnt = (o: string, deep: boolean) => {
    let n = 0;
    for (const p of list) {
      if (p !== pillars.day && GAN_OHAENG[p.gan] === o) n++;
      if (JI_OHAENG[p.ji] === o) n++;
      else if (deep) {
        const j = JIJANGGAN[p.ji];
        const gans = [j.yeogi.gan, ...(j.junggi ? [j.junggi.gan] : []), j.jeonggi.gan];
        if (gans.some((x: number) => GAN_OHAENG[x] === o)) n++;
      }
    }
    return n;
  };
  console.log(`${c.id}  ${want[c.id].padEnd(18)} 殺 ${cnt(g,false)} / ${cnt(g,true)}          制 ${cnt(sang,false)} / ${cnt(sang,true)}`);
}

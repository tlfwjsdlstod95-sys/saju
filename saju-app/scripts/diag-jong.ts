// 종격으로 결정된 골든 케이스 전부 — '일간의 묘고(身庫)가 지지에 겹쳐 있는가'를 같이 찍는다.
// 원문 근거: 「幸而日時坐戌通根身庫」(官殺 p.66 / JCS-081) — 임철초는 이 명식을 從하지 않는다.
import { readFileSync } from 'fs';
import { join } from 'path';
import { chartFromGanji } from '../lib/saju/fromGanji';
import { dayMasterStrength } from '../lib/saju/elements';
import { computeGyeokYong } from '../lib/saju/gyeokyong';
import { GAN_OHAENG, JI_OHAENG, JIJANGGAN, JIJI_HANJA } from '../lib/saju/constants';
// 五行 墓庫 — 木墓未 · 火墓戌 · 金墓丑 · 水墓辰. 土는 火土同宮으로 戌을 함께 쓴다.
const MYOGO: Record<string, number> = { 목: 7, 화: 10, 토: 10, 금: 1, 수: 4 };
const raw = JSON.parse(readFileSync(join(__dirname, 'golden-cases.json'), 'utf8'));
console.log('종격으로 결정된 골든 케이스\n');
console.log('ID       일간 강약    문헌 / 엔진      일간뿌리(지장간 자리수)  身庫 겹침  본기투출');
for (const c of (raw.cases as any[])) {
  if (c.school !== 'jeokcheonsu' || !c.expect?.yongsin || !c.pillars || c.dupOf) continue;
  const { dayGan, pillars } = chartFromGanji(c.pillars);
  const st = dayMasterStrength(dayGan, pillars);
  const gy = computeGyeokYong(pillars, dayGan, st);
  if (gy.yongsin.method !== '종격') continue;
  const dayO = GAN_OHAENG[dayGan];
  const list = [pillars.year, pillars.month, pillars.day, pillars.hour].filter(Boolean) as any[];
  let rootPos = 0, myogo = 0;
  const myogoJi = MYOGO[dayO];
  for (const p of list) {
    const j = JIJANGGAN[p.ji];
    const gans = [j.yeogi.gan, ...(j.junggi ? [j.junggi.gan] : []), j.jeonggi.gan];
    if (gans.some((g: number) => GAN_OHAENG[g] === dayO)) rootPos++;
    if (p.ji === myogoJi) myogo++;
  }
  // 그 묘고지의 본기가 천간에 투출했는가 (「更妙戊土透出」)
  const bongi = myogo > 0 ? JIJANGGAN[myogoJi].jeonggi.gan : -1;
  const tuchul = bongi >= 0 && list.some((p) => p !== pillars.day && GAN_OHAENG[p.gan] === GAN_OHAENG[bongi]);
  const hit = gy.yongsin.primary === c.expect.yongsin;
  console.log(`${c.id} ${hit?'✅':'❌'} ${dayO} ${st.toFixed(3)}  ${c.expect.yongsin} / ${gy.yongsin.primary}        ${rootPos}자리                ${myogo}개(${JIJI_HANJA[myogoJi]})   ${tuchul?'예':'아니오'}`);
}

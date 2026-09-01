/**
 * 외부 만세력 교차검증 — lunar-javascript (6tail) 대조
 *
 * 왜: 우리 만세력은 외부 의존 0으로 직접 구현했다(VSOP87D + 뉴턴법 절기 + ΔT + 균시차).
 *     KASI 앵커 몇 건과 자체 불변식으로만 검증돼 있어서, **독립 구현과의 대조**가 없었다.
 *     lunar-javascript 는 명리 판정(강약·용신)은 없지만 간지·절기는 계산한다. 딱 이 층만 맞춰본다.
 *
 * ⚠️ 이 스크립트만 외부 패키지가 필요하다. package.json 에는 넣지 않았다
 *    (배포 빌드에 불필요한 의존성을 얹지 않으려고).  실행 전에:
 *      npm i -D lunar-javascript@1.7.7
 *    require() 호출이라 패키지가 없어도 타입체크·빌드는 통과한다.
 *
 * 대조 조건
 *   - 매일 현지 정오. 정오면 진태양시 보정(-32분)이 날짜를 넘지 않아 일주 비교가 깨끗하다.
 *   - lunar-javascript 는 입력을 **베이징 기준(UTC+8)** 으로 본다.
 *     우리 엔진이 그날 쓰는 표준자오선(135°=UTC+9 / 127.5°=UTC+8.5)에 맞춰
 *     같은 '절대 순간'이 되도록 시각을 환산해 넣는다. 안 그러면 절기 경계에서 가짜 불일치가 난다.
 *   - 서머타임 시행기는 제외(적용 규칙 자체가 서로 다름).
 */
import { computeSaju } from '../lib/saju';
const { Solar } = require('lunar-javascript');

const Y0 = Number(process.argv[2] ?? 1900), Y1 = Number(process.argv[3] ?? 2100);
let n = 0, skipDst = 0;
const miss = { year: 0, month: 0, day: 0 };
const samples: string[] = [];

for (let y = Y0; y <= Y1; y++) {
  for (let m = 1; m <= 12; m++) {
    const dim = new Date(Date.UTC(y, m, 0)).getUTCDate();
    for (let d = 1; d <= dim; d++) {
      const ours = computeSaju({ year: y, month: m, day: d, hour: 12, minute: 0, sex: 'M' } as any);
      if (ours.corrected.summerTimeApplied) { skipDst++; continue; }
      const offset = ours.corrected.standardMeridian === 135 ? 9 : 8.5;  // 우리 엔진이 쓰는 현지 시간대
      // 같은 순간을 베이징(UTC+8) 시각으로 환산
      const bj = 12 - offset + 8;                    // 12:00 현지 → 베이징 시각(시)
      const bjH = Math.floor(bj), bjM = Math.round((bj - bjH) * 60);
      const l = Solar.fromYmdHms(y, m, d, bjH, bjM, 0).getLunar();
      const g = {
        year: l.getYearInGanZhiExact(),
        month: l.getMonthInGanZhiExact(),
        day: l.getDayInGanZhiExact(),
      };
      const o = ours.pillars;
      const cmp = (a: string, b: any) => a === `${b.ganHanja}${b.jiHanja}`;
      let bad = '';
      if (!cmp(g.year, o.year)) { miss.year++; bad += ` 년(${g.year}≠${o.year.ganHanja}${o.year.jiHanja})`; }
      if (!cmp(g.month, o.month)) { miss.month++; bad += ` 월(${g.month}≠${o.month.ganHanja}${o.month.jiHanja})`; }
      if (!cmp(g.day, o.day)) { miss.day++; bad += ` 일(${g.day}≠${o.day.ganHanja}${o.day.jiHanja})`; }
      if (bad && samples.length < 25) samples.push(`${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}${bad}`);
      n++;
    }
  }
}
console.log(`\n외부 만세력 교차검증  lunar-javascript@1.7.7 ↔ 헤아림 엔진 v${require('../lib/saju/version').ENGINE_VERSION}`);
console.log(`대상 ${Y0}–${Y1}  비교 ${n.toLocaleString()}일  (서머타임 ${skipDst}일 제외)\n`);
const pct = (k: number) => `${(100 - k / n * 100).toFixed(4)}%  (불일치 ${k}일)`;
console.log(`  년주 일치  ${pct(miss.year)}`);
console.log(`  월주 일치  ${pct(miss.month)}`);
console.log(`  일주 일치  ${pct(miss.day)}`);
if (samples.length) { console.log('\n불일치 표본(최대 25건):'); samples.forEach(s => console.log('  ' + s)); }

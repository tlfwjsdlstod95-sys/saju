import { computeSaju } from '../lib/saju/index';

function show(label: string, input: any) {
  const r = computeSaju(input);
  const p = r.pillars;
  const fmt = (x: any) => x ? `${x.ganKor}${x.jiKor}(${x.ganHanja}${x.jiHanja})` : '—';
  console.log(`\n=== ${label} ===`);
  console.log(`년주 ${fmt(p.year)}  월주 ${fmt(p.month)}  일주 ${fmt(p.day)}  시주 ${fmt(p.hour)}`);
  console.log(`진태양시: ${r.corrected.apparentSolarDateTime}  경도보정 ${r.corrected.longitudeCorrectionMin}분  균시차 ${r.corrected.equationOfTimeMin}분  자시:${r.corrected.jasiType}`);
  console.log(`일간 ${r.dayMaster.ganKor}(${r.dayMaster.ohaeng})  강약 ${r.dayMasterStrength}`);
  console.log(`오행`, r.ohaeng);
  console.log(`십신`, r.sipsinSummary);
  console.log(`성향: ${r.ilju.name} — ${r.ilju.description}`);
  const L = r.luck;
  console.log(`대운(${L.direction}, 대운수 ${L.daewoonAge}): ` +
    L.daewoon.slice(0, 6).map((d) => `${d.age}세 ${d.ganKor}${d.jiKor}(${d.score > 0 ? '+' : ''}${d.score})`).join('  '));
  console.log(`세운: ` + L.sewoon.slice(0, 5).map((s) => `${s.year} ${s.ganKor}${s.jiKor}(${s.score > 0 ? '+' : ''}${s.score})`).join('  '));
  if (r.warnings.length) console.log('⚠️', r.warnings.join(' / '));
  return r;
}

// 1) 앵커 검증: 2000-01-01 → 일주 무오(戊午) 기대
const t1 = show('2000-01-01 12:00 서울 (앵커검증: 일주=무오 기대)', {
  year: 2000, month: 1, day: 1, hour: 12, minute: 0, longitude: 126.978,
});
console.assert(t1.pillars.day.ganKor === '무' && t1.pillars.day.jiKor === '오', '❌ 일주 앵커 불일치');

// 2) 년주 검증: 2024-06-20 → 갑진년 기대
const t2 = show('2024-06-20 09:30 서울 (년주=갑진 기대)', {
  year: 2024, month: 6, day: 20, hour: 9, minute: 30, longitude: 126.978,
});
console.assert(t2.pillars.year.ganKor === '갑' && t2.pillars.year.jiKor === '진', '❌ 2024 년주 불일치');

// 3) 입춘 경계: 2024-02-04 (입춘 전후) → 년주 계묘 vs 갑진 경계 확인
show('2024-02-03 23:00 서울 (입춘 직전 → 계묘년 기대)', {
  year: 2024, month: 2, day: 3, hour: 23, minute: 0, longitude: 126.978,
});
show('2024-02-05 12:00 서울 (입춘 직후 → 갑진년 기대)', {
  year: 2024, month: 2, day: 5, hour: 12, minute: 0, longitude: 126.978,
});

// 4) 야자시 테스트: 23:40 출생
show('1995-08-15 23:40 서울 (야자시)', {
  year: 1995, month: 8, day: 15, hour: 23, minute: 40, longitude: 126.978,
});

// 5) 1990-06-15 → 경오년(백말) 기대
const t5 = show('1990-06-15 14:00 서울 (년주=경오 기대)', {
  year: 1990, month: 6, day: 15, hour: 14, minute: 0, longitude: 126.978,
});
console.assert(t5.pillars.year.ganKor === '경' && t5.pillars.year.jiKor === '오', '❌ 1990 년주 불일치');

// 6) 시간 모름
show('1988-11-20 시간모름 서울', {
  year: 1988, month: 11, day: 20, hour: null, minute: 0, unknownTime: true, longitude: 126.978,
});

console.log('\n✅ 테스트 실행 완료');

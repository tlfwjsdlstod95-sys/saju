/**
 * 절기 시각 절대 정확도 — NASA JPL DE440/DE441 대조
 *
 * 왜 필요한가
 *   test-crosscheck.ts 는 lunar-javascript 라는 **다른 구현**과 맞춰 본다. 그건 "우리가 남들과
 *   같은 답을 내는가"만 알려준다. 여기서 재는 건 다른 것 — **우리 절기 시각이 실제로 몇 초
 *   틀리는가**다. 기준은 NASA JPL 행성력 DE440/441(천문학계 표준)이다.
 *
 *   왜 중요한가: 절(節) 경계가 어긋나면 그 근처에 태어난 사람의 **월주가 통째로 바뀐다.**
 *   월주가 바뀌면 격국·조후·용신이 전부 달라진다. 만세력 층에서 가장 비싼 오차다.
 *
 * 기준 데이터  scripts/jpl-solarterms-1900-2100.json
 *   twinysam/sui-gen (MIT) 이 Skyfield 로 DE440/441 에서 뽑은 TT 율리우스일.
 *   ⚠️ sui-gen 원본의 절기 '이름표'는 21칸 어긋나 있다. index→황경 매핑만 쓴다.
 *
 * 비교는 **TT(지구시) 기준**이다. ΔT 를 타지 않으므로 VSOP87D 절단급수 자체의 오차만 잰다.
 * (ΔT 모델 오차는 별개 항목이고, 1900~2000 은 0.1초 이내, 2020 에서 +2.2초다)
 */
import ref from './jpl-solarterms-1900-2100.json';
import { dateToJD, sunApparentLongitude } from '../lib/saju/astro';

/** solarTerms.ts 의 뉴턴 반복과 동일. 단 TT 로 반환해 ΔT 를 배제한다. */
function ourTermTT(targetLon: number, gy: number, gm: number, gd: number): number {
  let jde = dateToJD(gy, gm, gd, 0, 0, 0);
  for (let i = 0; i < 8; i++) {
    const lon = sunApparentLongitude(jde);
    const diff = ((targetLon - lon + 540) % 360) - 180;
    jde += diff / 0.985647;
    if (Math.abs(diff) < 1e-9) break;
  }
  return jde;
}
function jd2greg(jd: number) {
  const x = jd + 0.5; const Z = Math.floor(x); const F = x - Z;
  let A = Z;
  if (Z >= 2299161) { const a = Math.floor((Z - 1867216.25) / 36524.25); A = Z + 1 + a - Math.floor(a / 4); }
  const B = A + 1524, C = Math.floor((B - 122.1) / 365.25), D = Math.floor(365.25 * C), E = Math.floor((B - D) / 30.6001);
  const day = B - D - Math.floor(30.6001 * E) + F;
  const mo = E < 14 ? E - 1 : E - 13;
  return { y: mo > 2 ? C - 4716 : C - 4715, m: mo, d: Math.floor(day) };
}

const JEOL_LON = [315, 345, 15, 45, 75, 105, 135, 165, 195, 225, 255, 285];
const JEOL_NAME = ['입춘', '경칩', '청명', '입하', '망종', '소서', '입추', '백로', '한로', '입동', '대설', '소한'];
const terms = (ref as any).terms as Record<string, number[]>;

let nAll = 0, sumAll = 0, mxAll = 0;
let n = 0, sum = 0, mx = 0, mxinfo = '';
const hist: Record<string, number> = {};
const BUCKETS = ['<1s', '1~5s', '5~15s', '15~30s', '>30s'];
for (const [ys, tts] of Object.entries(terms)) {
  const y = Number(ys);
  tts.forEach((tt, index) => {
    const lon = (index * 15) % 360;
    const g = jd2greg(tt);
    const errSec = Math.abs(ourTermTT(lon, g.y, g.m, g.d) - tt) * 86400;
    nAll++; sumAll += errSec; if (errSec > mxAll) mxAll = errSec;
    const b = errSec < 1 ? '<1s' : errSec < 5 ? '1~5s' : errSec < 15 ? '5~15s' : errSec < 30 ? '15~30s' : '>30s';
    hist[b] = (hist[b] ?? 0) + 1;
    const ji = JEOL_LON.indexOf(lon);
    if (ji >= 0) {
      n++; sum += errSec;
      if (errSec > mx) { mx = errSec; mxinfo = `${y} ${JEOL_NAME[ji]}(황경 ${lon}도)`; }
    }
  });
}
const AVG_JEOL_SEC = 30.4368 * 86400; // 절 사이 평균 간격
console.log(`\n절기 시각 정확도  NASA JPL DE440/441 ↔ 헤아림 엔진(VSOP87D 절단급수)   1900–2100`);
console.log(`\n  24절기 전체 ${nAll.toLocaleString()}개`);
console.log(`    평균 ${(sumAll / nAll).toFixed(2)}초   최대 ${mxAll.toFixed(1)}초`);
console.log(`    분포  ${BUCKETS.filter((b) => hist[b]).map((b) => `${b}:${((hist[b] / nAll) * 100).toFixed(1)}%`).join('  ')}`);
console.log(`\n  節 12개 — 월주를 가르는 것 ${n.toLocaleString()}개`);
console.log(`    평균 ${(sum / n).toFixed(2)}초   최대 ${mx.toFixed(1)}초  (${mxinfo})`);
console.log(`\n  → 월주 오판 확률 ≈ 평균오차/절간격 = 1/${Math.round(AVG_JEOL_SEC / (sum / n)).toLocaleString()}`);
console.log(`     최악의 경우에도 1/${Math.round(AVG_JEOL_SEC / mx).toLocaleString()}`);

const FAIL = mx > 60; // 節 오차가 1분을 넘으면 회귀로 본다
console.log(`\n  판정: ${FAIL ? 'FAIL — 節 오차 60초 초과' : 'PASS — 節 오차 60초 이내'}`);
if (FAIL) process.exit(1);

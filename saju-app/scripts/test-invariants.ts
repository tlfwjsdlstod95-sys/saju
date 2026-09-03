// 엔진 불변식(invariant) 회귀 테스트
//
// 왜 이게 필요한가
//   강약·용신은 절기와 달리 **KASI 같은 공표 정답표가 없다**. 그래서 임계값을 바꿨을 때
//   그게 개선인지 개악인지 직접 확인할 방법이 없다. 다만 정답을 몰라도
//   "이건 반드시 성립해야 한다"는 성질(불변식)은 검증할 수 있다.
//   여기서 깨지면 그건 취향 차이가 아니라 **버그**다.
//
//   실행: npx tsx scripts/test-invariants.ts

import { computeSaju } from '../lib/saju/index';
import { computeYongsin } from '../lib/saju/gyeokyong';
import { SAENG, GEUK, GAN_OHAENG, type Ohaeng } from '../lib/saju/constants';

let pass = 0, fail = 0;
const fails: string[] = [];
function ok(name: string, cond: boolean, extra = '') {
  if (cond) { pass++; }
  else { fail++; fails.push(`${name}${extra ? '  → ' + extra : ''}`); }
}
function section(t: string) { console.log(`\n── ${t}`); }

// 재현 가능한 의사난수(테스트가 매번 같아야 회귀 비교가 된다)
let seed = 20260827;
function rnd() { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; }
function sampleInput() {
  const year = 1930 + Math.floor(rnd() * 96);
  const month = 1 + Math.floor(rnd() * 12);
  const day = 1 + Math.floor(rnd() * 28);
  const hour = Math.floor(rnd() * 24);
  const minute = Math.floor(rnd() * 60);
  return { year, month, day, hour, minute, longitude: 126.978, sex: rnd() < 0.5 ? 'M' : 'F' };
}

const N = 3000;
const samples = Array.from({ length: N }, sampleInput);
const results = samples.map((s) => computeSaju(s as any));

// ── 1) 결정론 ─────────────────────────────────────────────
section('결정론');
{
  let same = true;
  for (let i = 0; i < 200; i++) {
    const a = computeSaju(samples[i] as any);
    const b = computeSaju(samples[i] as any);
    if (a.dayMasterStrength !== b.dayMasterStrength) { same = false; break; }
    if (a.gyeokYong.yongsin.primary !== b.gyeokYong.yongsin.primary) { same = false; break; }
    if (a.gyeokYong.gyeokguk.key !== b.gyeokYong.gyeokguk.key) { same = false; break; }
  }
  ok('같은 입력은 항상 같은 판정', same);
}

// ── 2) 강약 값의 성질 ─────────────────────────────────────
section('강약(dayMasterStrength)');
{
  ok('0~1 범위', results.every((r) => r.dayMasterStrength >= 0 && r.dayMasterStrength <= 1));
  ok('NaN 없음', results.every((r) => Number.isFinite(r.dayMasterStrength)));

  // 단조성: 일간을 돕는 글자가 늘면 강해져야 한다.
  // (주의) 시(時)를 바꾸면 시두법 때문에 **시지뿐 아니라 시간(時干)도 함께** 바뀐다.
  //        그래서 '시지만' 비교하면 단일 변수 비교가 아니다 — 처음 이 테스트가 여기서 잘못됐다.
  //        시주 두 글자가 **둘 다 돕는 시** vs **둘 다 안 돕는 시** 로 비교해야 깨끗하다.
  //   또 하나 — 자정 무렵(0시대) 입력은 경도보정(-32분)·균시차 때문에 진태양시가 **전날 23시대**로
  //   넘어가 일주 자체가 바뀐다(엔진의 정상 동작). 절기 경계에서는 월지도 바뀐다.
  //   따라서 후보 시각은 **일주·월지가 기준과 동일한 것만** 쓴다.
  const helpsDay = (o: Ohaeng, dayO: Ohaeng) => o === dayO || SAENG[o] === dayO;
  let mono = 0, monoTotal = 0;
  for (let i = 0; i < 600; i++) {
    const base = { ...(samples[i] as any) };
    const ref = computeSaju({ ...base, hour: 12, minute: 0 });   // 정오 = 날짜가 안 넘어가는 기준
    const dayO = ref.dayMaster.ohaeng as Ohaeng;
    const samePillar = (r: any) =>
      r.pillars.day.gan === ref.pillars.day.gan && r.pillars.day.ji === ref.pillars.day.ji &&
      r.pillars.month.ji === ref.pillars.month.ji;
    let bothH = -1, noneH = -1;
    for (let h = 0; h < 24; h++) {
      const rr = computeSaju({ ...base, hour: h, minute: 0 });
      const hp = rr.pillars.hour;
      if (!hp || !samePillar(rr)) continue;                       // 일주·월지가 다르면 비교 대상 아님
      const g = helpsDay(hp.ganOhaeng as Ohaeng, dayO);
      const j = helpsDay(hp.jiOhaeng as Ohaeng, dayO);
      if (g && j && bothH < 0) bothH = h;
      if (!g && !j && noneH < 0) noneH = h;
    }
    if (bothH < 0 || noneH < 0) continue;
    const sBoth = computeSaju({ ...base, hour: bothH, minute: 0 }).dayMasterStrength;
    const sNone = computeSaju({ ...base, hour: noneH, minute: 0 }).dayMasterStrength;
    monoTotal++;
    if (sBoth > sNone) mono++;
  }
  ok('시주 두 글자가 모두 도우면 모두 안 도울 때보다 강함(단조성)',
     monoTotal > 0 && mono === monoTotal, `${mono}/${monoTotal}`);

  // 득령 반영: 월지가 일간을 돕는 명식의 평균 강약 > 안 돕는 명식의 평균
  {
    let hs = 0, hn = 0, ns = 0, nn = 0;
    for (const r of results) {
      const dayO = r.dayMaster.ohaeng as Ohaeng;
      const mo = r.pillars.month.jiOhaeng as Ohaeng;
      if (helpsDay(mo, dayO)) { hs += r.dayMasterStrength; hn++; }
      else { ns += r.dayMasterStrength; nn++; }
    }
    const avgH = hn ? hs / hn : 0, avgN = nn ? ns / nn : 0;
    ok('득령한 쪽의 평균 강약이 더 높음', avgH > avgN,
       `득령 ${avgH.toFixed(3)}(${hn}건) vs 실령 ${avgN.toFixed(3)}(${nn}건)`);
  }

  // 시주 미상이면 7글자가 아니라 6글자 → 값이 달라지되 범위는 유지
  const noTime = samples.slice(0, 100).map((s) => computeSaju({ ...(s as any), unknownTime: true }));
  ok('시간 모름도 0~1 유지', noTime.every((r) => r.dayMasterStrength >= 0 && r.dayMasterStrength <= 1));
  ok('시간 모름이면 시주 null', noTime.every((r) => r.pillars.hour === null));
}

// ── 2-b) 진태양시 보정의 날짜 넘김 (정상 동작을 못박아 둔다) ──
section('진태양시 경계');
{
  // 서울(126.978°E)은 표준자오선 135°E 대비 -32분. 0시대 출생은 진태양시가 전날로 넘어간다.
  const a = computeSaju({ year: 2011, month: 3, day: 24, hour: 0, minute: 0, longitude: 126.978 } as any);
  ok('0시 출생은 진태양시가 전날로 넘어감', a.corrected.apparentSolarDateTime.startsWith('2011-03-23'),
     a.corrected.apparentSolarDateTime);
  const b = computeSaju({ year: 2011, month: 3, day: 24, hour: 12, minute: 0, longitude: 126.978 } as any);
  ok('0시와 12시는 일주가 다를 수 있음(경도보정 결과)',
     !(a.pillars.day.gan === b.pillars.day.gan && a.pillars.day.ji === b.pillars.day.ji),
     `${a.pillars.day.ganKor}${a.pillars.day.jiKor} vs ${b.pillars.day.ganKor}${b.pillars.day.jiKor}`);
  // 경도를 표준자오선에 맞추면 넘어가지 않아야 한다 → 보정이 원인임을 확정
  const c = computeSaju({ year: 2011, month: 3, day: 24, hour: 0, minute: 40, longitude: 135 } as any);
  ok('경도 135°E·0시40분이면 당일 유지', c.corrected.apparentSolarDateTime.startsWith('2011-03-24'),
     c.corrected.apparentSolarDateTime);
}

// ── 3) 용신 정합성 ────────────────────────────────────────
section('용신(computeYongsin)');
{
  const OHS: Ohaeng[] = ['목', '화', '토', '금', '수'];
  let huisinOk = true, gisinOk = true, selfOk = true, methodOk = true;
  for (const r of results) {
    const y = r.gyeokYong.yongsin;
    // 희신 = 용신을 생하는 오행
    if (SAENG[y.huisin] !== y.primary) { huisinOk = false; }
    // 기신 = 용신을 극하는 오행
    if (GEUK[y.gisin] !== y.primary) { gisinOk = false; }
    // 용신이 곧 기신일 수는 없다
    if (y.primary === y.gisin) { selfOk = false; }
    if (!['조후우선', '억부', '종격', '통관', '병약'].includes(y.method)) { methodOk = false; }
    if (!OHS.includes(y.primary)) { methodOk = false; }
  }
  ok('희신은 용신을 생하는 오행', huisinOk);
  ok('기신은 용신을 극하는 오행', gisinOk);
  ok('용신 ≠ 기신', selfOk);
  ok('method·오행 값이 유효 범위', methodOk);

  // 억부 규칙 — 2026-09-02 v6 에서 '고정 매핑'에서 '후보 평가'로 바뀌었다.
  //   그래서 "신약이면 무조건 인성" 같은 검사는 더 이상 참이 아니다(그게 이번 변경의 핵심).
  //   대신 **방향**은 반드시 지켜져야 한다:
  //     신약  → 나를 돕는 쪽(인성 또는 비겁)
  //     그 외 → 나를 덜어내는 쪽(식상·재성·관살)
  //   또 채택된 용신은 반드시 후보 목록 안에 있어야 한다(임의의 오행이 튀어나오면 버그).
  let eokbuOk = true; let eokbuN = 0;
  for (const r of results) {
    const y = r.gyeokYong.yongsin;
    if (y.method !== '억부') continue;
    eokbuN++;
    const dayO = r.dayMaster.ohaeng as Ohaeng;
    const s = r.dayMasterStrength;
    const inseong = OHS.find((x) => SAENG[x] === dayO)!;
    // v7 — 상관격에서 印重(인성 ≥2 이며 식상보다 무거움)이면 신약이어도 식상이 후보에 들어간다.
    //   원전 근거: 「地支印星並旺 … 必以寅木爲用」(JCS-051) · 「必以卯木爲用」(JCS-050) — 母慈滅子 계열.
    //   그래서 '강약 방향'의 정의 자체가 v7에서 한 칸 넓어졌다. 불변식도 같이 넓힌다.
    // v8 官殺 — 관살 위협도가 높으면 **강약 불문** 방어 후보가 열린다.
    //   신강 쪽엔 인성(二曰 殺重用印), 신약 쪽엔 식상(三曰 食神制殺)이 들어온다.
    //   원전 근거 「眾殺橫行, 一仁可化」 · 「一將當關, 羣凶自伏」.
    //   그래서 '강약 방향'은 v7보다 한 칸 더 넓어졌다. 불변식도 같이 넓힌다.
    // v10 洩重用印 + 濕土 — 식상이 판을 덮으면 중화에서도 印이 열리고(v9),
    //   그 印의 뿌리가 濕土(辰·丑)뿐이면 印 대신 **比劫**이 열린다.
    //   원전 근거 「嫌其辰爲濕土, 生金拱水, **未足幫身**」(JCS-054) ·
    //            「過于洩氣, **全賴酉時扶身** … 用神必在酉金」(JCS-007).
    //   그래서 신강·중화 쪽에도 비겁(dayO)이 들어올 수 있다. 불변식을 또 한 칸 넓힌다.
    //   ⚠️ 넓힐 때마다 이 불변식이 잡아내는 힘은 약해진다. 근거 없이 넓히지 말 것.
    const allowed = s <= 0.38
      ? [inseong, dayO, SAENG[dayO]]
      : [SAENG[dayO], GEUK[dayO], OHS.find((x) => GEUK[x] === dayO)!, inseong, dayO];
    if (!allowed.includes(y.primary)) eokbuOk = false;
    const cands = (y as any).eokbuCandidates as { value: string }[] | undefined;
    if (cands && cands.length && !cands.some((c) => c.value === y.primary)) eokbuOk = false;
  }
  ok('억부 용신은 강약 방향의 후보 안에서 나온다(v7 상관격 印重·v8 관살 방어 포함)', eokbuOk, `표본 ${eokbuN}건`);

  // 경계 안정성: strength 를 아주 조금 흔들었을 때 용신이 요동치지 않아야 한다
  // (임계 근처를 제외하면 ±0.005 로는 바뀌면 안 된다)
  let jitter = 0, jitterN = 0;
  const BOUNDS = [0.03, 0.38, 0.55, 0.90];
  for (let i = 0; i < 500; i++) {
    const r = results[i];
    const s = r.dayMasterStrength;
    if (BOUNDS.some((b) => Math.abs(s - b) < 0.01)) continue; // 임계 바로 옆은 제외
    jitterN++;
    const dayGan = r.pillars.day.gan, monthJi = r.pillars.month.ji;
    const counts: Partial<Record<Ohaeng, number>> = {};
    for (const p of [r.pillars.year, r.pillars.month, r.pillars.day, r.pillars.hour]) {
      if (!p) continue;
      counts[p.ganOhaeng as Ohaeng] = (counts[p.ganOhaeng as Ohaeng] ?? 0) + 1;
      counts[p.jiOhaeng as Ohaeng] = (counts[p.jiOhaeng as Ohaeng] ?? 0) + 1;
    }
    const a = computeYongsin(dayGan, s - 0.005, monthJi, counts).primary;
    const b = computeYongsin(dayGan, s + 0.005, monthJi, counts).primary;
    if (a !== b) jitter++;
  }
  ok('임계 밖에서는 ±0.005 흔들어도 용신 불변', jitter === 0, `요동 ${jitter}/${jitterN}`);
}

// ── 4) 명식 구조 무결성 ───────────────────────────────────
section('명식 구조');
{
  ok('일간 십신은 항상 null(본인)', results.every((r) => r.pillars.day.ganSipsin === null));
  ok('일간 오행 = 일주 천간 오행', results.every((r) => r.dayMaster.ohaeng === GAN_OHAENG[r.pillars.day.gan]));
  ok('오행 합계 = 8 (시주 있을 때)', results.every((r) => {
    if (!r.pillars.hour) return true;
    const o = r.ohaeng as any;
    return (o.목 + o.화 + o.토 + o.금 + o.수) === 8;
  }));
  ok('오행 합계 = 6 (시주 없을 때)', results.slice(0, 100).every((s, i) => {
    const r = computeSaju({ ...(samples[i] as any), unknownTime: true });
    const o = r.ohaeng as any;
    return (o.목 + o.화 + o.토 + o.금 + o.수) === 6;
  }));
  ok('격국 key 유효', results.every((r) => !!r.gyeokYong.gyeokguk.key && !!r.gyeokYong.gyeokguk.name));
  ok('조후 climate 유효', results.every((r) => ['한습', '조열', '서늘', '온화'].includes(r.gyeokYong.johu.climate)));
}

// ── 5) 절기·일주 앵커 (이건 진짜 정답이 있는 영역) ─────────
section('천문 앵커 (KASI 검증 가능 영역)');
{
  const a = computeSaju({ year: 2000, month: 1, day: 1, hour: 12, minute: 0, longitude: 126.978 } as any);
  ok('2000-01-01 일주 = 무오', a.pillars.day.ganKor === '무' && a.pillars.day.jiKor === '오',
     `${a.pillars.day.ganKor}${a.pillars.day.jiKor}`);
  const b = computeSaju({ year: 2024, month: 6, day: 20, hour: 9, minute: 30, longitude: 126.978 } as any);
  ok('2024-06-20 년주 = 갑진', b.pillars.year.ganKor === '갑' && b.pillars.year.jiKor === '진',
     `${b.pillars.year.ganKor}${b.pillars.year.jiKor}`);
  const before = computeSaju({ year: 2024, month: 2, day: 3, hour: 23, minute: 0, longitude: 126.978 } as any);
  const after = computeSaju({ year: 2024, month: 2, day: 5, hour: 12, minute: 0, longitude: 126.978 } as any);
  ok('입춘 경계에서 년주가 바뀜', before.pillars.year.ganKor !== after.pillars.year.ganKor,
     `${before.pillars.year.ganKor}${before.pillars.year.jiKor} → ${after.pillars.year.ganKor}${after.pillars.year.jiKor}`);
  // 60갑자 순환: 60일 뒤 일주는 같아야 한다
  const d1 = computeSaju({ year: 2020, month: 3, day: 1, hour: 12, minute: 0, longitude: 126.978 } as any);
  const d2 = computeSaju({ year: 2020, month: 4, day: 30, hour: 12, minute: 0, longitude: 126.978 } as any); // +60일
  ok('60일 뒤 일주 동일(60갑자 순환)',
     d1.pillars.day.ganKor === d2.pillars.day.ganKor && d1.pillars.day.jiKor === d2.pillars.day.jiKor,
     `${d1.pillars.day.ganKor}${d1.pillars.day.jiKor} vs ${d2.pillars.day.ganKor}${d2.pillars.day.jiKor}`);
}

console.log(`\n${'─'.repeat(50)}`);
console.log(`불변식 테스트: ${pass} PASS / ${fail} FAIL  (표본 ${N}건)`);
if (fails.length) { console.log('\n실패 항목:'); fails.forEach((f) => console.log('  ✗ ' + f)); }
process.exit(fail ? 1 : 0);

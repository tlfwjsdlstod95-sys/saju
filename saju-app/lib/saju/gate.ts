// 무료/유료 경계 — 「화면에서 가리는 게 아니라 응답에서 뺀다」의 2차 적용.
//
// 1차(2026-09-03)는 12신살 길흉반전이었다(`stripSinsalFlips`, `무료유료_경계_설계.md`).
// 2차는 **용신·격국 판정 그 자체**다. 왜 이번엔 잠그기로 했나 —
//   12신살 배치표는 띠+지지 룩업이라 아무 데서나 나온다. 우리 자산이 아니라 안 잠갔다.
//   반대로 **『적천수천미』 120건으로 채점한 용신 판정은 3개월 캐낸 우리 것**이다.
//   판정을 공짜로 주면 /accuracy 의 채점표가 의미를 잃는다 — 살 게 문장 길이밖에 안 남으니까.
//
// 그래서 무료 구간이 파는 것은 **「여기서 갈린다」는 사실**이고,
// 유료 구간이 파는 것은 **「우리는 이렇게 판정했고, 그 판정은 채점받았다」** 이다.
// 숨기는 게 아니라 판정이 상품이라는 걸 드러내는 쪽이라, 진솔톤을 안 깬다.
//
// ⚠️ 이 파일은 **판정에 1비트도 관여하지 않는다.** 엔진은 그대로 전부 계산하고,
//    여기서 응답에 실을 것만 고른다. 회귀 지표가 이 파일 때문에 움직이면 그건 버그다.
import { stripSinsalFlips } from './advanced';
import { gyeokCandidates, type GyeokYong, type Climate } from './gyeokyong';
import type { Ohaeng } from './constants';
import type { SajuResult } from './types';
import type { BoundaryDiag } from './boundary';
import type { TimeUnknownScan } from './timeUnknown';

// ── 무료 응답의 모양 ─────────────────────────────────────────────
export interface YongsinLock {
  /**
   * 기준(법)별 결론에 등장한 오행. 순서로 답이 새지 않게 **셔플**해서 내려간다.
   *
   * ⚠️ **후보가 하나면 빈 배열로 내려간다.** 표본 1,500건을 재보니 **46.7%** 는 5용신 정법이
   *   한 답으로 모인다 — 그 하나를 보여주면 그건 후보가 아니라 **정답을 그냥 주는 것**이고,
   *   절반의 유입에게 페이월이 사라진다. 대신 「한 답으로 모인다」는 사실은 그대로 말해 준다.
   *   숨기는 게 아니라, 값이 아니라 판정을 판다는 원칙을 지키는 쪽이다.
   *
   * ⚠️ 반대로 후보가 셋이면 **셋 다 내려보낸다.** 스펙 초안은 「최대 2개」였는데, 잘라서 보내면
   *   화면이 「용신은 화·금 사이에서 갈립니다」라고 말하는데 **엔진의 답이 토** 인 일이 실제로 났다.
   *   그건 잠금이 아니라 **거짓말**이다. 후보를 다 열어도 어느 것이 답인지는 여전히 유료다.
   */
  candidates: Ohaeng[];
  /** 중복 제거 후 후보 수. 1이면 모든 법이 같은 답(이때 `candidates` 는 비어 있다) */
  candidateCount: number;
  /** 값이 나온 기준(법)의 수 — 「5용신 정법 중 N개가 값을 냈다」 */
  methodsCount: number;
  /** 기준에 따라 결론이 갈리는가 */
  conflict: boolean;
  /** 결손 진단(淸枯)에 걸렸는가 — 걸렸다는 사실만. 어느 오행인지는 유료 */
  hasLacking: boolean;
}

export interface FreeGyeokYong {
  /** 조후는 계절 판정이라 무료. 단 `need`(조후용신)는 곧 용신 후보라 뺀다 */
  johu: { climate: Climate };
  /** 월지 지장간이 각각 격이 된다면 무엇이 되는가 — 확정명이 아니라 후보(셔플) */
  gyeokCandidates: string[];
  yongsinLock: YongsinLock;
  locked: true;
}

/**
 * 무료 응답의 전체 모양.
 *   판정은 빠지고, 대신 **경계 진단이 붙는다** — 무료 구간이 파는 건 판정이 아니라
 *   「당신 명식이 다른 곳과 갈릴 수 있는 지점」이라는 증거이기 때문이다(`lib/saju/boundary.ts`).
 */
export type FreeSajuResult = Omit<SajuResult, 'gyeokYong'> & {
  gyeokYong: FreeGyeokYong;
  boundary?: BoundaryDiag;
  /** 시각 미상일 때만 — 그날 하루를 훑어 확정/미정을 나눈 결과(§E-4 ③) */
  timeScan?: TimeUnknownScan;
};

// ── 셔플 ────────────────────────────────────────────────────────
// 후보를 그냥 내려보내면 **순서로 답이 샌다** — bases 는 채택된 것이 앞에 오는 경우가 많다.
// 그래서 명식마다 고정된 시드로 섞는다(같은 명식이면 새로고침해도 같은 순서 → 흔들려 보이지 않는다).
function hash32(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h >>> 0;
}
export function seededShuffle<T>(arr: readonly T[], seed: string): T[] {
  const out = arr.slice();
  let h = hash32(seed) || 1;
  for (let i = out.length - 1; i > 0; i--) {
    h = (Math.imul(h, 1664525) + 1013904223) >>> 0;
    const j = h % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** 판정을 뺀 격국·용신. `gy` 원본은 건드리지 않는다(서버 진실값은 그대로 살아 있어야 한다). */
export function stripGyeokYong(gy: GyeokYong, gCands: string[], seed: string): FreeGyeokYong {
  const withValue = gy.yongsin.bases.filter((b) => b.value);
  const uniq = [...new Set(withValue.map((b) => b.value as Ohaeng))];
  return {
    johu: { climate: gy.johu.climate },
    gyeokCandidates: seededShuffle(gCands, seed + ':g'),
    yongsinLock: {
      candidates: uniq.length > 1 ? seededShuffle(uniq, seed) : [],
      candidateCount: uniq.length,
      methodsCount: withValue.length,
      conflict: gy.yongsin.conflict,
      hasLacking: !!gy.yongsin.lacking,
    },
    locked: true,
  };
}

// ── 규칙 풀이 줄이기 (2026-09-30) ─────────────────────────────────
// 무료 풀이가 리포트와 같은 10주제·약 2,900자였다 — 「이미 다 봤네」가 되면 결제할 이유가 없다.
// 그래서 무료는 **핵심 한 단락(essence, 최대 5문장)** 만 온전히 주고, 나머지 주제는 **첫 문장만**
// 실어 「리포트에서 이어지는 목차」로 보여 준다. 화면에서 자르는 게 아니라 응답에서 자른다.
// ⚠️ 경계 진단·명식·게이지는 여기서 건드리지 않는다 — 그건 무료 구간의 상품이다.
export const FREE_CORE_KEY = 'essence';
export const FREE_CORE_MAX_SENTENCES = 5;

/** 한국어 문장 나누기 — 마침표·물음표·느낌표(+닫는 따옴표) 뒤 공백에서 자른다 */
export function splitSentences(text: string): string[] {
  return text.replace(/\s+/g, ' ').trim().split(/(?<=[.!?。…][)'"’”」』]?)\s+/).filter(Boolean);
}

export function trimReadingForFree<T extends { key: string; body: string; teaser?: boolean }>(secs: T[]): T[] {
  return secs.map((s) => {
    if (s.key === FREE_CORE_KEY) {
      const firstPara = String(s.body).split('\n\n')[0] ?? '';
      return { ...s, body: splitSentences(firstPara).slice(0, FREE_CORE_MAX_SENTENCES).join(' ') };
    }
    return { ...s, body: splitSentences(String(s.body))[0] ?? '', teaser: true };
  });
}

/**
 * 무료 응답 한 벌. `/api/saju` · `/api/gunghap` 이 **둘 다 이걸 통과시킨다.**
 *   ⚠️ 궁합 라우트가 예전엔 명식 전체를 그대로 돌려주고 있었다 —
 *      정문을 잠가도 옆문이 열려 있으면 잠근 게 아니다.
 */
export function stripForFree(result: SajuResult, seed: string): FreeSajuResult {
  const y = stripSinsalFlips(result.advanced.sin12.byYear);
  const d = stripSinsalFlips(result.advanced.sin12.byDay);
  const sn = stripSinsalFlips(result.advanced.sinsal);
  const gCands = gyeokCandidates(result.pillars, result.dayMaster.gan);
  return {
    ...result,
    gyeokYong: stripGyeokYong(result.gyeokYong, gCands, seed),
    // 규칙 풀이 안에도 판정 문장이 섞여 있었다(격국 이름·용신 설명).
    // 문장을 잘라내는 게 아니라 **애초에 `paid` 칸에 따로 담아** 여기서 통째로 뺀다.
    interpretations: trimReadingForFree(result.interpretations.map(({ paid, ...s }) => s)),
    advanced: {
      ...result.advanced,
      sinsal: sn.list,
      sin12: { ...result.advanced.sin12, byYear: y.list, byDay: d.list },
      flipLock: { flips: y.summary.flips, names: y.summary.names, total: result.advanced.sin12.byYear.length },
    },
  } as FreeSajuResult;
}

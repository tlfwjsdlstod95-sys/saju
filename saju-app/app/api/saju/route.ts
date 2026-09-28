import { NextResponse } from 'next/server';
import { computeSaju } from '@/lib/saju';
import { guardCompute, clampInt } from '@/lib/apiGuard';
import { stripForFree } from '@/lib/saju/gate';
import { chartId } from '@/lib/chartId';
import { computeBoundary } from '@/lib/saju/boundary';
import { scanUnknownTime } from '@/lib/saju/timeUnknown';
import type { BirthInput } from '@/lib/saju/types';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const blocked = await guardCompute(req, 'saju');
  if (blocked) return blocked;

  try {
    const body = (await req.json()) as Partial<BirthInput>;

    if (!body.year || !body.month || !body.day) {
      return NextResponse.json({ error: '생년월일은 필수입니다.' }, { status: 400 });
    }

    const input: BirthInput = {
      year: clampInt(body.year, 1900, 2200, 2000),
      month: clampInt(body.month, 1, 12, 1),
      day: clampInt(body.day, 1, 31, 1),
      hour: body.unknownTime ? null : (body.hour == null ? null : clampInt(body.hour, 0, 23, 0)),
      minute: clampInt(body.minute ?? 0, 0, 59, 0),
      isLunar: !!body.isLunar,
      isLeapMonth: !!body.isLeapMonth,
      longitude: body.longitude ? Number(body.longitude) : undefined,
      sex: body.sex,
      unknownTime: !!body.unknownTime,
    jasiMode: body.jasiMode === 'jeongja' ? 'jeongja' : undefined,
      name: body.name ? String(body.name).slice(0, 20) : undefined,
    };

    const result = computeSaju(input);

    // ── 무료 응답에서 유료 판정을 뺀다 (세로 자르기) ──
    //   1차(9-03) 신살 길흉반전 + 2차(9-09) 용신·격국 판정. 자세한 이유는 `lib/saju/gate.ts`.
    //   무료로 여는 것: 명식 네 기둥 · 오행 개수 · 살 이름과 자리 · 격국/용신 **후보** · 「여기서 갈린다」는 사실.
    //   잠그는 것: 우리 엔진의 **확정 판정과 근거**(bases·method·결손 내용·반전 방향).
    //   ⚠️ 화면에서 가리는 게 아니라 응답에 안 싣는다. 번들을 열어도 없어야 잠근 것이다.
    //   시드는 chartId — 같은 명식이면 후보 순서가 새로고침해도 고정된다(흔들려 보이지 않게).
    const free = stripForFree(result, chartId(input));

    // ── 경계 진단 (무료 — 이게 무료 구간의 '상품'이다) ──
    //   「우리는 정확합니다」는 자랑이고, 「보정을 빼면 **당신** 일주가 무엇이 되는지」는 증거다.
    //   한 요인만 끄고 엔진을 다시 돌려 반사실 명식을 만든다(결정론이라 부작용 없음, 실측 평균 0.2ms).
    //   갈리는 게 없으면 변종 목록은 비고, 화면은 「경계에서 멀다」는 안심 카드를 띄운다.
    //   ⚠️ 채점 표본 수(표를 닫는 문장)는 여기서 싣지 않는다 — 골든 JSON(82KB)을 **가장 많이 불리는 라우트**에
    //      끌어들이게 된다. 화면은 이미 `/api/stats` 에서 같은 `totalCases()` 값을 받아 쓰고 있다.
    free.boundary = computeBoundary(input, result);

    // ── 시각 미상 분기 (§E-4 ③) ── 시각을 모르면 그날 00:00~23:59 를 훑어 확정/미정을 나눈다.
    //   10분 간격 + 바뀐 자리만 1분 이분 탐색 → 엔진 약 200회, 실측 30~40ms. 시각 미상 요청(약 17%)에만 돈다.
    if (input.unknownTime) free.timeScan = scanUnknownTime(input);

    // 카운터 (실측 — 랜딩 사회적 증거용. env 없으면 생략, 실패 무시)
    //   · readings_total : 계산 **횟수**. 내부 지표로만 쓴다.
    //   · unique_charts  : 고유 **명식 수**(HyperLogLog). 화면에 「N명」으로 나가는 건 이쪽이다 —
    //     같은 생일을 100번 눌러도 1로 세므로 개발 중 테스트 중복이 빠지고, 문장이 사실이 된다.
    const kvUrl = process.env.UPSTASH_REDIS_REST_URL, kvTok = process.env.UPSTASH_REDIS_REST_TOKEN;
    if (kvUrl && kvTok) {
      const h = { Authorization: `Bearer ${kvTok}` };
      fetch(`${kvUrl}/incr/stat:readings_total`, { headers: h }).catch(() => {});
      fetch(`${kvUrl}/pfadd/stat:unique_charts/${chartId(input)}`, { headers: h }).catch(() => {});
    }
    return NextResponse.json(free);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? '계산 중 오류가 발생했습니다.' }, { status: 500 });
  }
}

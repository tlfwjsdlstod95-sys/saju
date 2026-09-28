import { NextResponse } from 'next/server';
import { computeSaju } from '@/lib/saju';
import { computeCompatibility } from '@/lib/saju/compatibility';
import { guardCompute, clampInt } from '@/lib/apiGuard';
import { stripForFree } from '@/lib/saju/gate';
import { chartId } from '@/lib/chartId';
import type { BirthInput } from '@/lib/saju/types';

export const runtime = 'nodejs';

function parse(b: any): BirthInput {
  return {
    year: clampInt(b.year, 1900, 2200, 2000),
    month: clampInt(b.month, 1, 12, 1),
    day: clampInt(b.day, 1, 31, 1),
    hour: b.unknownTime ? null : (b.hour == null ? null : clampInt(b.hour, 0, 23, 0)),
    minute: clampInt(b.minute ?? 0, 0, 59, 0),
    longitude: b.longitude ? Number(b.longitude) : undefined,
    sex: b.sex, unknownTime: !!b.unknownTime,
  };
}

export async function POST(req: Request) {
  const blocked = await guardCompute(req, 'gunghap');
  if (blocked) return blocked;

  try {
    const { a, b } = await req.json();
    if (!a?.year || !b?.year) {
      return NextResponse.json({ error: '두 사람의 생년월일을 모두 입력하세요.' }, { status: 400 });
    }
    const inA = parse(a), inB = parse(b);
    const sajuA = computeSaju(inA);
    const sajuB = computeSaju(inB);
    // 궁합 점수는 **서버가 진실값(판정 포함)으로** 계산한다. 클라에 내려보내는 명식만 잠근다.
    //   ⚠️ 여기가 옆문이었다 — /api/saju 에서 뺀 용신·격국 판정이 궁합 응답으로는 그대로 나가고 있었다.
    //      정문만 잠그면 잠근 게 아니다. 두 라우트가 **같은 `stripForFree`** 를 통과하게 맞춘다.
    const compat = computeCompatibility(sajuA, sajuB);
    return NextResponse.json({
      a: stripForFree(sajuA, chartId(inA)),
      b: stripForFree(sajuB, chartId(inB)),
      compat,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? '계산 오류' }, { status: 500 });
  }
}

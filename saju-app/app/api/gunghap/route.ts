import { NextResponse } from 'next/server';
import { computeSaju } from '@/lib/saju';
import { computeCompatibility } from '@/lib/saju/compatibility';
import { guardCompute, clampInt } from '@/lib/apiGuard';
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
  const blocked = guardCompute(req, 'gunghap');
  if (blocked) return blocked;

  try {
    const { a, b } = await req.json();
    if (!a?.year || !b?.year) {
      return NextResponse.json({ error: '두 사람의 생년월일을 모두 입력하세요.' }, { status: 400 });
    }
    const sajuA = computeSaju(parse(a));
    const sajuB = computeSaju(parse(b));
    const compat = computeCompatibility(sajuA, sajuB);
    return NextResponse.json({ a: sajuA, b: sajuB, compat });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? '계산 오류' }, { status: 500 });
  }
}

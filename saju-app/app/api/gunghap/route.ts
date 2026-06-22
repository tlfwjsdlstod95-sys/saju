import { NextResponse } from 'next/server';
import { computeSaju } from '@/lib/saju';
import { computeCompatibility } from '@/lib/saju/compatibility';
import type { BirthInput } from '@/lib/saju/types';

export const runtime = 'nodejs';

function parse(b: any): BirthInput {
  return {
    year: Number(b.year), month: Number(b.month), day: Number(b.day),
    hour: b.unknownTime ? null : (b.hour ?? null),
    minute: Number(b.minute ?? 0),
    longitude: b.longitude ? Number(b.longitude) : undefined,
    sex: b.sex, unknownTime: !!b.unknownTime,
  };
}

export async function POST(req: Request) {
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

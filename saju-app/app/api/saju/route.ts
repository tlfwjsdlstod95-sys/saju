import { NextResponse } from 'next/server';
import { computeSaju } from '@/lib/saju';
import type { BirthInput } from '@/lib/saju/types';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Partial<BirthInput>;

    if (!body.year || !body.month || !body.day) {
      return NextResponse.json({ error: '생년월일은 필수입니다.' }, { status: 400 });
    }

    const input: BirthInput = {
      year: Number(body.year),
      month: Number(body.month),
      day: Number(body.day),
      hour: body.unknownTime ? null : (body.hour ?? null) as number | null,
      minute: Number(body.minute ?? 0),
      isLunar: !!body.isLunar,
      isLeapMonth: !!body.isLeapMonth,
      longitude: body.longitude ? Number(body.longitude) : undefined,
      sex: body.sex,
      unknownTime: !!body.unknownTime,
      name: body.name ? String(body.name).slice(0, 20) : undefined,
    };

    const result = computeSaju(input);
    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? '계산 중 오류가 발생했습니다.' }, { status: 500 });
  }
}

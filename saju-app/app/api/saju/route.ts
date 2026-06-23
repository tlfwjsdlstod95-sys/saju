import { NextResponse } from 'next/server';
import { computeSaju } from '@/lib/saju';
import { guardCompute, clampInt } from '@/lib/apiGuard';
import type { BirthInput } from '@/lib/saju/types';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const blocked = guardCompute(req, 'saju');
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
      name: body.name ? String(body.name).slice(0, 20) : undefined,
    };

    const result = computeSaju(input);
    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? '계산 중 오류가 발생했습니다.' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { computeSaju } from '@/lib/saju';
import { guardCompute, clampInt } from '@/lib/apiGuard';
import { stripSinsalFlips } from '@/lib/saju/advanced';
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

    // ── 무료 응답에서 신살 길흉반전을 뺀다 (유료 구간) ──
    //   살 이름·자리·기본 뜻은 그대로 준다. 잠그는 건 「내 용신 기준으로 뒤집히는가」뿐이고,
    //   그건 용신 판정이 서 있어야만 나오는 값이라 우리만 줄 수 있다.
    //   개수와 이름은 열어 둔다 — 무엇이 걸렸는지 알아야 궁금해진다.
    const y = stripSinsalFlips(result.advanced.sin12.byYear);
    const d = stripSinsalFlips(result.advanced.sin12.byDay);
    const sn = stripSinsalFlips(result.advanced.sinsal);
    const free = {
      ...result,
      advanced: {
        ...result.advanced,
        sinsal: sn.list,
        sin12: { ...result.advanced.sin12, byYear: y.list, byDay: d.list },
        flipLock: { flips: y.summary.flips, names: y.summary.names, total: result.advanced.sin12.byYear.length },
      },
    };

    // 누적 풀이 수 카운터 (실측 — 랜딩 사회적 증거용. env 없으면 생략, 실패 무시)
    const kvUrl = process.env.UPSTASH_REDIS_REST_URL, kvTok = process.env.UPSTASH_REDIS_REST_TOKEN;
    if (kvUrl && kvTok) {
      fetch(`${kvUrl}/incr/stat:readings_total`, { headers: { Authorization: `Bearer ${kvTok}` } }).catch(() => {});
    }
    return NextResponse.json(free);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? '계산 중 오류가 발생했습니다.' }, { status: 500 });
  }
}

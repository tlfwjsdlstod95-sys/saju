import { NextResponse } from 'next/server';
import { computeSaju } from '@/lib/saju';
import { guardCompute, clampInt } from '@/lib/apiGuard';
import { chartId } from '@/lib/chartId';
import { checkEntitled } from '@/lib/entitlement';
import { computeGaeun } from '@/lib/saju/gaeun';
import { pickAuspicious, topAuspicious, type Purpose } from '@/lib/saju/auspicious';
import { computeYearlyFortune } from '@/lib/saju/yearly';
import type { BirthInput } from '@/lib/saju/types';

export const runtime = 'nodejs';

// 프리미엄 콘텐츠 계산 — **서버에서만** 한다.
//
// 왜 만들었나 (2026-09-02)
//   개운법·택일·신년운세는 결제자 전용인데, 계산이 클라이언트에 있었다.
//   `if (!premium) return <잠금화면/>` 은 **화면만 가린 것**이라, 번들을 열면 같은 함수로
//   누구나 같은 결과를 뽑을 수 있었다. 실결제가 시작되면 그대로 매출 누수가 된다.
//   그래서 계산을 서버로 옮기고, 이용권이 확인된 요청에만 결과를 준다.
//
// 원칙
//   - 명식은 **요청 본문에서 서버가 직접 해싱**한다(클라가 보낸 chart 값은 신뢰하지 않는다).
//   - 이용권 없으면 402 + needsPurchase — 클라는 잠금 화면을 유지한다.
//   - AI 호출이 없는 순수 계산이라 guardAI 가 아니라 guardCompute 를 쓴다(일일 상한 불필요).

type Kind = 'gaeun' | 'auspicious' | 'yearly' | 'sin12';
const KINDS: Kind[] = ['gaeun', 'auspicious', 'yearly', 'sin12'];
const PURPOSE_KEYS: Purpose[] = ['wedding', 'moving', 'contract', 'travel', 'decision'];

export async function POST(req: Request) {
  const blocked = await guardCompute(req, 'premium', { windowMs: 60_000, max: 40 });
  if (blocked) return blocked;

  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: '잘못된 요청' }, { status: 400 }); }

  const kind = String(body?.kind ?? '') as Kind;
  if (!KINDS.includes(kind)) return NextResponse.json({ error: '잘못된 요청' }, { status: 400 });
  if (!body?.year || !body?.month || !body?.day) {
    return NextResponse.json({ error: '생년월일은 필수입니다.' }, { status: 400 });
  }

  const input: BirthInput = {
    year: clampInt(body.year, 1900, 2200, 2000),
    month: clampInt(body.month, 1, 12, 1),
    day: clampInt(body.day, 1, 31, 1),
    hour: body.unknownTime ? null : (body.hour == null ? null : clampInt(body.hour, 0, 23, 0)),
    minute: clampInt(body.minute ?? 0, 0, 59, 0),
    longitude: body.longitude ? Number(body.longitude) : undefined,
    sex: body.sex, unknownTime: !!body.unknownTime,
    jasiMode: body.jasiMode === 'jeongja' ? 'jeongja' : undefined,
    name: body.name ? String(body.name).slice(0, 20) : undefined,
  };

  const chart = chartId(input);
  const { entitled } = await checkEntitled(chart);
  if (!entitled) {
    return NextResponse.json(
      { error: '이 사주의 정밀 리포트를 아직 구매하지 않으셨어요.', needsPurchase: true },
      { status: 402 },
    );
  }

  const result = computeSaju(input);

  if (kind === 'gaeun') {
    return NextResponse.json({ data: computeGaeun(result) });
  }

  // 신살 길흉반전 — 무료 응답에서 뺀 그 값.
  //   같은 장성살이라도 그 글자가 용신 편이면 힘이 되고 기신 편이면 반감된다.
  //   이 판정은 용신이 서 있어야만 가능해서, 룩업표만 가진 곳은 흉내를 못 낸다.
  if (kind === 'sin12') {
    const pick = (l: { name: string; tone: string; flip?: unknown }[]) =>
      l.map((x) => ({ name: x.name, baseTone: x.tone, flip: x.flip ?? null }));
    return NextResponse.json({
      data: {
        byYear: pick(result.advanced.sin12.byYear),
        byDay: pick(result.advanced.sin12.byDay),
        sinsal: pick(result.advanced.sinsal as unknown as { name: string; tone: string; flip?: unknown }[]),
        yongsin: {
          primary: result.gyeokYong.yongsin.primary,
          huisin: result.gyeokYong.yongsin.huisin,
          gisin: result.gyeokYong.yongsin.gisin,
        },
      },
    });
  }

  if (kind === 'yearly') {
    const now = new Date().getFullYear();
    const year = clampInt(body.year2 ?? now, now - 1, now + 5, now);
    return NextResponse.json({ data: computeYearlyFortune(result, year) });
  }

  // 택일 — 지난 날짜 제외·상위 6개·주의일 추리기까지 서버에서 끝낸다(클라에 로직을 남기지 않는다).
  const purpose = (PURPOSE_KEYS.includes(body.purpose) ? body.purpose : 'wedding') as Purpose;
  const today = new Date();
  const ty = clampInt(body.targetYear ?? today.getFullYear(), today.getFullYear() - 1, today.getFullYear() + 2, today.getFullYear());
  const tm = clampInt(body.targetMonth ?? today.getMonth() + 1, 1, 12, today.getMonth() + 1);
  let all = pickAuspicious(result, purpose, ty, tm);
  if (ty === today.getFullYear() && tm === today.getMonth() + 1) {
    all = all.filter((d) => d.day >= today.getDate());
  }
  return NextResponse.json({
    data: { top: topAuspicious(all, 6), avoided: all.filter((d) => d.warn).map((d) => d.day) },
  });
}

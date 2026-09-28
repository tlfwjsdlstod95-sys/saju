// 공개 통계 — 랜딩의 사회적 증거. **전부 실측값**이고, env 없으면 0을 준다(가짜 숫자 금지).
//
// 세는 대상을 2026-09-09에 바꿨다.
//   기존 `stat:readings_total` 은 **계산 횟수**다 — 같은 사람이 여러 번 돌리면 중복되고,
//   개발하며 돌린 본인 테스트가 전부 포함된다. 그걸 「N명이 확인했어요」라고 쓰면 그건 사실이 아니다.
//   분모를 정직하게 밝히는 브랜드가 스스로 그 원칙을 어기는 자리라 고쳤다.
//   → **고유 명식(chartId)** 을 HyperLogLog 로 센다(`stat:unique_charts`). 같은 생일 100번 테스트해도 1이다.
//   문구(「N명이 명식을 확인했어요」)는 그대로 두고 **숫자를 사실로** 만든 것. 임계값은 1,000.
//   `readings_total` 은 내부 지표로 계속 센다(공개는 unique 쪽).
import { NextResponse } from 'next/server';
import { totalCases, transcribedCases } from '@/lib/goldenReport';

export const runtime = 'nodejs';

export async function GET() {
  // 채점 표본 수는 /accuracy 와 **같은 출처**를 쓴다.
  //   첫 화면에 「59命」을 손으로 박아 두는 바람에 검증 페이지(120건)와 어긋나 있었다.
  //   숫자로 신뢰를 파는 사이트가 첫 화면에서 숫자를 어긋내면 검증 페이지 전체가 의심받는다.
  //   근본 수정은 문구를 고치는 게 아니라 **한 곳에서만 계산하는 것**이다.
  const cases = totalCases();
  const transcribed = transcribedCases();   // 「원전 192건 중 채점 기준이 있는 163건」 — 두 숫자를 한 문장에

  const kvUrl = process.env.UPSTASH_REDIS_REST_URL;
  const kvTok = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!kvUrl || !kvTok) return NextResponse.json({ total: 0, people: 0, cases, transcribed });
  const h = { Authorization: `Bearer ${kvTok}` };
  try {
    const [tRes, pRes] = await Promise.all([
      fetch(`${kvUrl}/get/stat:readings_total`, { headers: h, cache: 'no-store' }),
      fetch(`${kvUrl}/pfcount/stat:unique_charts`, { headers: h, cache: 'no-store' }),
    ]);
    const tJ = await tRes.json().catch(() => ({}));
    const pJ = await pRes.json().catch(() => ({}));
    const total = parseInt(tJ?.result ?? '0', 10) || 0;
    const people = parseInt(pJ?.result ?? '0', 10) || 0;
    return NextResponse.json({ total, people, cases, transcribed }, { headers: { 'cache-control': 'public, s-maxage=300' } });
  } catch {
    return NextResponse.json({ total: 0, people: 0, cases, transcribed });
  }
}

// 상품 안내 페이지 — PG(토스페이먼츠) 심사 요건: '판매 가능한 상품 1개 이상 노출'
// 전자상거래 표기(상품명/가격/제공방식/결제수단/환불) 한 곳에 정리.
import Link from 'next/link';
import type { Metadata } from 'next';
import { BIZ } from '../biz';

export const metadata: Metadata = {
  title: '이용권 안내 · 가격 | 헤아림',
  description: '헤아림 정밀 사주 리포트와 AI 궁합 리포트 상품 안내 — 가격, 제공 방식, 결제 수단, 환불 규정.',
};

const ITEMS = [
  {
    name: '정밀 사주 리포트 1건',
    price: 5900,
    list: 9900,
    unit: '생년월일시 1건 기준',
    desc: 'AI가 그 명식만을 위해 새로 쓰는 심층 풀이(말투 선택 가능) + 신년운세 월별 캘린더 + 결혼·이사·계약 택일 + 개운법 + 인생 가이드북 PDF + 대운 80년 상세.',
    how: '결제 승인 즉시 해당 생년월일시의 리포트가 생성되어 웹에서 열람 (별도 배송 없는 디지털 콘텐츠)',
  },
  {
    name: 'AI 궁합 심층 리포트 1건',
    price: 4900,
    list: null,
    unit: '두 사람의 생년월일시 1쌍 기준',
    desc: '두 사람의 명식을 대조해 상성 점수·잘 맞는 지점·부딪히는 지점·관계 운영법을 AI가 길게 풀어주는 궁합 리포트.',
    how: '결제 승인 즉시 해당 두 명식의 궁합 리포트가 생성되어 웹에서 열람 (별도 배송 없는 디지털 콘텐츠)',
  },
];

export default function Pricing() {
  return (
    <main className="wrap">
      <div className="hero" style={{ paddingTop: 40 }}>
        <div className="hero-kr">利用券</div>
        <h1 style={{ fontSize: 40 }}>이용권 <span>안내</span></h1>
        <p>명식·기본 풀이·오늘의 운세·행운 부적 카드는 <b>무료</b>입니다. 아래는 유료 상품이에요.</p>
        <Link href="/" className="backlink">← 내 사주 분석으로</Link>
      </div>

      {ITEMS.map((it) => (
        <div className="card" key={it.name}>
          <h2>{it.name}</h2>
          <div className="chips" style={{ marginBottom: 12 }}>
            <div className="chip">
              판매가 <b style={{ color: 'var(--gold)' }}>{it.price.toLocaleString()}원</b>
              {it.list && <s style={{ opacity: 0.6, marginLeft: 6 }}>{it.list.toLocaleString()}원</s>}
            </div>
            <div className="chip">부가세 포함</div>
            <div className="chip">건별 결제 · 자동갱신 없음</div>
            <div className="chip">{it.unit}</div>
          </div>
          <p style={{ lineHeight: 1.75 }}>{it.desc}</p>
          <p style={{ marginTop: 10, fontSize: 14, color: 'var(--text-mute)' }}>
            제공 방식: {it.how}<br />
            판매 단위: <b>리포트 1건</b>입니다. 다른 생년월일시의 리포트가 필요하면 건별로 다시 결제하셔야 하며,
            1회 결제로 무제한 이용되는 구조가 아닙니다. 구매하신 리포트는 로그인 계정에 저장되어 다시 열람하실 수 있습니다.<br />
            결제 수단: 신용·체크카드, 계좌이체, 간편결제 (결제 대행: 토스페이먼츠)
          </p>
        </div>
      ))}

      <div className="card">
        <h2>결제 · 환불 안내</h2>
        <ul className="bullet-list" style={{ paddingLeft: 0, listStyle: 'none' }}>
          <li style={{ marginBottom: 8 }}>· 디지털 콘텐츠 상품으로, 결제 후 즉시 열람이 시작됩니다.</li>
          <li style={{ marginBottom: 8 }}>· 풀이가 열람되지 않았거나 오류로 이용하지 못한 경우 전액 환불해 드립니다.</li>
          <li style={{ marginBottom: 8 }}>· 자세한 기준은 <Link href="/refund" style={{ color: 'var(--gold)' }}>취소·환불 정책</Link>을 확인해 주세요.</li>
          <li style={{ marginBottom: 8 }}>· 문의: {BIZ.email}{BIZ.tel ? ` · ${BIZ.tel}` : ''}</li>
        </ul>
        <p style={{ marginTop: 8, fontSize: 13, color: 'var(--text-mute)' }}>
          ※ 사주·운세 풀이는 참고용 콘텐츠이며, 의학·법률·재정적 조언이 아닙니다.
        </p>
      </div>

      <div className="card" style={{ textAlign: 'center' }}>
        <p className="meta" style={{ marginBottom: 12 }}>먼저 무료로 내 명식과 기본 풀이를 확인해 보세요.</p>
        <Link href="/" className="btn share-btn" style={{ textDecoration: 'none', display: 'inline-block' }}>무료로 사주 보기 →</Link>
      </div>
    </main>
  );
}

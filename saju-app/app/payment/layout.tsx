import type { Metadata } from 'next';

// 결제 결과(성공·실패)는 검색에 뜰 이유가 없다 — 주소에 주문번호가 붙는다. (2026-09-29)
// robots.txt 의 /payment/ 차단 + next.config 의 X-Robots-Tag 헤더와 함께 세 겹.
export const metadata: Metadata = { robots: { index: false, follow: false, nocache: true } };

export default function PaymentLayout({ children }: { children: React.ReactNode }) {
  return children;
}

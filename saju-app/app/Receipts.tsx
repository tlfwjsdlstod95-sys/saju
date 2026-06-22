'use client';

import { useEffect, useState } from 'react';
import { listReceipts, type Receipt } from '@/lib/receipts';

function fmtDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}
const won = (n: number) => '₩' + n.toLocaleString('ko-KR');

export default function Receipts() {
  const [list, setList] = useState<Receipt[]>([]);
  const [open, setOpen] = useState<string | null>(null);
  useEffect(() => { setList(listReceipts()); }, []);

  if (list.length === 0) return null;

  return (
    <div className="card">
      <h2>🧾 결제 · 이용 내역</h2>
      <div className="meta" style={{ marginBottom: 16 }}>프리미엄 결제 내역이에요. 영수증을 눌러 상세를 확인할 수 있어요.</div>
      <div className="rcpt-list">
        {list.map((r) => (
          <div className="rcpt-row" key={r.orderId}>
            <div className="rcpt-row-main" onClick={() => setOpen(open === r.orderId ? null : r.orderId)}>
              <div className="rcpt-info">
                <b>{r.orderName}{r.isTest && <span className="rcpt-test">TEST</span>}</b>
                <small>{fmtDate(r.approvedAt)} · {r.method}</small>
              </div>
              <div className="rcpt-amt">{won(r.amount)}</div>
              <span className="rcpt-caret">{open === r.orderId ? '▴' : '▾'}</span>
            </div>
            {open === r.orderId && (
              <div className="rcpt-detail">
                <div className="rcpt-paper">
                  <div className="rcpt-paper-head">영수증 / RECEIPT</div>
                  <div className="rcpt-line"><span>상품</span><b>{r.orderName}</b></div>
                  <div className="rcpt-line"><span>결제수단</span><b>{r.method}</b></div>
                  <div className="rcpt-line"><span>승인일시</span><b>{fmtDate(r.approvedAt)}</b></div>
                  <div className="rcpt-line"><span>주문번호</span><b className="rcpt-oid">{r.orderId}</b></div>
                  <div className="rcpt-line total"><span>결제금액</span><b>{won(r.amount)}</b></div>
                  <div className="rcpt-paper-foot">
                    토스페이먼츠 {r.isTest ? '· 테스트 결제(실제 청구 없음)' : '승인 완료'}
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

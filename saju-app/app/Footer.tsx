import Link from 'next/link';
import { BIZ } from './biz';

export default function Footer() {
  return (
    <footer className="site-footer">
      <nav className="footer-links">
        <Link href="/terms">이용약관</Link>
        <span aria-hidden>·</span>
        <Link href="/privacy">개인정보처리방침</Link>
        <span aria-hidden>·</span>
        <Link href="/refund">취소·환불 정책</Link>
      </nav>
      <div className="footer-biz">
        <p>상호 {BIZ.corpName} (서비스명 {BIZ.name}) · 대표 {BIZ.owner}</p>
        <p>사업자등록번호 {BIZ.bizNo} · 통신판매업신고 {BIZ.mailOrderNo}</p>
        {BIZ.address && <p>사업장 소재지 {BIZ.address}</p>}
        <p>고객문의 {BIZ.email}{BIZ.tel ? ` · 전화 ${BIZ.tel}` : ''}</p>
        <p className="footer-disc">본 서비스의 사주·운세 풀이는 참고용 콘텐츠이며, 의학·법률·재정적 조언이 아닙니다.</p>
      </div>
    </footer>
  );
}

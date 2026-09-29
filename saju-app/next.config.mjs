/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // 결제 결과 페이지는 주소에 주문번호가 붙는다. robots.txt 차단만으로는 링크된 주소가
  // URL만 색인될 수 있어 헤더로도 noindex 를 건다 (2026-09-29, app/payment/layout.tsx 메타와 이중).
  async headers() {
    return [{ source: '/payment/:path*', headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }] }];
  },
};

export default nextConfig;

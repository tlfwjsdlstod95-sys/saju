import type { MetadataRoute } from 'next';
import { CHEONGAN, JIJI } from '@/lib/saju/constants';
import { SIN12_ORDER } from '@/lib/saju/advanced';
import { SITE_URL } from '@/lib/siteUrl';
import { DICT } from '@/lib/dict';

const BASE = SITE_URL;   // 주소는 한 곳(lib/siteUrl.ts)에서만 정한다

export default function sitemap(): MetadataRoute.Sitemap {
  const iljoo: MetadataRoute.Sitemap = [];
  for (let g = 0; g < 10; g++) for (let j = 0; j < 12; j++) {
    if (g % 2 === j % 2) iljoo.push({ url: `${BASE}/iljoo/${CHEONGAN[g]}${JIJI[j]}`, changeFrequency: 'monthly', priority: 0.6 });
  }
  const sinsal: MetadataRoute.Sitemap = SIN12_ORDER.map((n) => ({
    url: `${BASE}/sinsal/${n}`, changeFrequency: 'monthly' as const, priority: 0.6,
  }));
  return [
    { url: BASE, changeFrequency: 'weekly', priority: 1 },
    { url: `${BASE}/gunghap`, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${BASE}/iljoo`, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${BASE}/sinsal`, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${BASE}/accuracy`, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${BASE}/pricing`, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${BASE}/sample`, changeFrequency: 'monthly', priority: 0.7 },   // 리포트 샘플 1쪽 (9-23)
    { url: `${BASE}/dict`, changeFrequency: 'monthly', priority: 0.8 },   // 용어 사전 (9-29)
    ...DICT.map((e) => ({ url: `${BASE}/dict/${e.slug}`, changeFrequency: 'monthly' as const, priority: 0.7 })),
    ...iljoo,
    ...sinsal,
  ];
}

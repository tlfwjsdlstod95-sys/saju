import type { MetadataRoute } from 'next';
import { CHEONGAN, JIJI } from '@/lib/saju/constants';
import { SIN12_ORDER } from '@/lib/saju/advanced';

const BASE = process.env.NEXT_PUBLIC_SITE_URL || 'https://saju-cznh.vercel.app';

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
    { url: `${BASE}/pricing`, changeFrequency: 'monthly', priority: 0.7 },
    ...iljoo,
    ...sinsal,
  ];
}

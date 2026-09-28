'use client';
import { useEffect } from 'react';
import { rememberSource } from '@/lib/track';

// 첫 방문 출처(utm_source / referrer) 기억 — 화면에는 아무것도 그리지 않는다.
export default function TrackInit() {
  useEffect(() => { rememberSource(); }, []);
  return null;
}

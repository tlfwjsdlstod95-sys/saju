'use client';

import { useEffect } from 'react';

export default function PwaSetup() {
  useEffect(() => {
    // 서비스워커 등록 (오프라인 지원) — 설치 안내 배너는 표시하지 않음
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
  }, []);

  return null;
}

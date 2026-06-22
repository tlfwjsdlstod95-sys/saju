'use client';

import { useEffect, useState } from 'react';

interface BIPEvent extends Event { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }>; }

export default function PwaSetup() {
  const [deferred, setDeferred] = useState<BIPEvent | null>(null);
  const [iosHint, setIosHint] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // 서비스워커 등록 (오프라인 지원)
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }

    const onBIP = (e: Event) => { e.preventDefault(); setDeferred(e as BIPEvent); };
    window.addEventListener('beforeinstallprompt', onBIP);

    // iOS Safari는 beforeinstallprompt 미지원 → 안내만
    const ua = window.navigator.userAgent;
    const isIOS = /iphone|ipad|ipod/i.test(ua);
    const standalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
    if (isIOS && !standalone) setIosHint(true);

    window.addEventListener('appinstalled', () => { setDeferred(null); setIosHint(false); });
    return () => window.removeEventListener('beforeinstallprompt', onBIP);
  }, []);

  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice.catch(() => {});
    setDeferred(null);
  }

  if (dismissed) return null;
  if (deferred) {
    return (
      <div className="pwa-install">
        <span>📲 사주 명리를 앱으로 설치하면 더 빠르게 열려요</span>
        <button className="pwa-go" onClick={install}>설치</button>
        <button className="pwa-x" onClick={() => setDismissed(true)} aria-label="닫기">✕</button>
      </div>
    );
  }
  if (iosHint) {
    return (
      <div className="pwa-install">
        <span>📲 앱으로 설치: 공유 버튼 → ‘홈 화면에 추가’</span>
        <button className="pwa-x" onClick={() => setDismissed(true)} aria-label="닫기">✕</button>
      </div>
    );
  }
  return null;
}

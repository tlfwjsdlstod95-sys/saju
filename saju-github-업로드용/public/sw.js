// 사주 명리 PWA 서비스워커 — 오프라인 지원(앱 셸 캐시)
const CACHE = 'saju-v1';
const SHELL = ['/', '/gunghap', '/manifest.webmanifest', '/icon-192.png', '/icon-512.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).catch(() => {}));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))),
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // API/스트리밍/외부 도메인은 항상 네트워크 (오프라인이면 그대로 실패)
  if (url.pathname.startsWith('/api/') || url.origin !== self.location.origin) return;

  // 페이지(navigate): 네트워크 우선, 실패 시 캐시 폴백
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
        return res;
      }).catch(() => caches.match(req).then((m) => m || caches.match('/'))),
    );
    return;
  }

  // 정적 자원: 캐시 우선, 없으면 네트워크 후 캐시 적재
  e.respondWith(
    caches.match(req).then((hit) => hit || fetch(req).then((res) => {
      const copy = res.clone();
      caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
      return res;
    }).catch(() => hit)),
  );
});

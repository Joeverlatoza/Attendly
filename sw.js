/* Attendly service worker: network-first so updates show right away, cache fallback for offline use. */
const CACHE = 'attendly-v30';
self.addEventListener('install', (e) => { self.skipWaiting(); });
self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.hostname.endsWith('supabase.co') || url.pathname.includes('/auth/')) return;
  e.respondWith((async () => {
    try {
      const fresh = await fetch(req, { cache: 'no-cache' });
      if (fresh && fresh.ok && (url.origin === location.origin || /cdn|unpkg|jsdelivr|cloudflare|fonts/.test(url.hostname))) {
        const c = await caches.open(CACHE);
        c.put(req, fresh.clone()).catch(() => {});
      }
      return fresh;
    } catch (err) {
      const hit = await caches.match(req, { ignoreSearch: true });
      if (hit) return hit;
      if (req.mode === 'navigate') {
        const home = await caches.match('./index.html', { ignoreSearch: true }) || await caches.match('./', { ignoreSearch: true });
        if (home) return home;
      }
      throw err;
    }
  })());
});

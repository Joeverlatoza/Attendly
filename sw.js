/* SJBHS Portal service worker: network-first so updates show right away; the app shell and libraries are kept for offline use. */
const CACHE = 'attendly-v31';
const SHELL = ['./', './index.html'];
const OFFLINE = '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Offline</title><body style="font-family:system-ui;padding:2rem;text-align:center"><h2>You are offline</h2><p>Open the portal once while online so it can be saved on this phone, then it works offline.</p><button onclick="location.reload()" style="padding:.6rem 1rem;font-size:1rem">Try again</button>';
self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil((async () => { const c = await caches.open(CACHE); await Promise.all(SHELL.map((u) => c.add(new Request(u, { cache: 'reload' })).catch(() => {}))); })());
});
self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});
async function shell() { return (await caches.match('./index.html', { ignoreSearch: true })) || (await caches.match('./', { ignoreSearch: true })); }
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.hostname.endsWith('supabase.co') || url.pathname.includes('/auth/')) return;
  e.respondWith((async () => {
    const nav = req.mode === 'navigate';
    try {
      const fresh = await fetch(req, { cache: 'no-cache' });
      const ok = fresh && (fresh.ok || fresh.type === 'opaque');
      if (nav && fresh && !ok) { const home = await shell(); if (home) return home; }
      if (ok && (url.origin === location.origin || /cdn|unpkg|jsdelivr|cloudflare|fonts|gstatic|googleapis/.test(url.hostname))) {
        const c = await caches.open(CACHE);
        c.put(req, fresh.clone()).catch(() => {});
        if (nav) { c.put('./index.html', fresh.clone()).catch(() => {}); }
      }
      return fresh;
    } catch (err) {
      const hit = await caches.match(req, { ignoreSearch: true });
      if (hit) return hit;
      if (nav) { const home = await shell(); return home || new Response(OFFLINE, { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } }); }
      return new Response('', { status: 504, statusText: 'Offline' });
    }
  })());
});

const CACHE = 'flappy-v1.0.1';
const PRECACHE = ['./'];

function shouldFetchFresh(url) {
  return url.pathname.endsWith('/characters.json') || url.pathname.includes('/api/');
}

function isAppShellRequest(request) {
  return request.mode === 'navigate'
    || request.destination === 'document'
    || request.headers.get('accept')?.includes('text/html');
}

async function networkFirst(request) {
  try {
    const fresh = await fetch(request, { cache: 'no-store' });
    if (fresh && fresh.status === 200 && fresh.type !== 'opaque') {
      const cache = await caches.open(CACHE);
      await cache.put(request, fresh.clone());
    }
    return fresh;
  } catch {
    return (await caches.match(request)) || caches.match('./');
  }
}

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);

  // Always fetch fresh runtime data; do not cache it.
  if (shouldFetchFresh(url)) {
    e.respondWith(fetch(e.request, { cache: 'no-store' }));
    return;
  }

  if (isAppShellRequest(e.request)) {
    e.respondWith(networkFirst(e.request));
    return;
  }

  e.respondWith(
    caches.match(e.request).then((cached) => {
      if (cached) return cached;
      return fetch(e.request).then((res) => {
        if (!res || res.status !== 200 || res.type === 'opaque') return res;
        const clone = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, clone));
        return res;
      });
    })
  );
});

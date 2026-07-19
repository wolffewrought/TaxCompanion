const CACHE = 'taxcompanion-v23';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
];
const CDN_ASSETS = [
  'https://cdn.sheetjs.com/xlsx-0.20.1/package/dist/xlsx.full.min.js',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => Promise.all(ASSETS.map(u => fetch(u, {cache:'reload'}).then(r => { if(r.ok) return c.put(u, r); }).catch(()=>{}))))
      .then(() => {
        // Cache CDN assets separately — don't block install if CDN is offline
        caches.open(CACHE).then(c => {
          CDN_ASSETS.forEach(url => fetch(url).then(r => { if(r.ok) c.put(url, r) }).catch(()=>{}));
        });
      })
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // App shell & navigations — NETWORK FIRST so updates land immediately; cache = offline fallback
  if (url.origin === location.origin) {
    e.respondWith(
      fetch(e.request, {cache:'no-cache'})
        .then(r => { const cl = r.clone(); caches.open(CACHE).then(c => c.put(e.request, cl)); return r; })
        .catch(() => caches.match(e.request).then(x => x || caches.match('./index.html')))
    );
    return;
  }

  const url = new URL(e.request.url);

  // Fonts — network first, cache fallback
  if (url.hostname.includes('fonts.g')) {
    e.respondWith(
      fetch(e.request)
        .then(r => { caches.open(CACHE).then(c => c.put(e.request, r.clone())); return r; })
        .catch(() => caches.match(e.request))
    );
    return;
  }

  // Local assets — cache first, network fallback
  if (url.origin === location.origin) {
    e.respondWith(
      caches.match(e.request).then(cached => cached ||
        fetch(e.request).then(r => {
          if (r.ok) caches.open(CACHE).then(c => c.put(e.request, r.clone()));
          return r;
        }).catch(() => caches.match('./index.html'))
      )
    );
  }
});

// Offline-Speicher für Neon Cargo Express. Bei Änderungen am Spiel die Versionsnummer erhöhen.
const CACHE = 'ncx-v1';
const CORE = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
  './icons/favicon-32.png',
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const isFont = url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';
  if (url.origin !== self.location.origin && !isFont) return;

  // Spielseite: zuerst das Netz (für Updates), nach 3 s oder offline die gespeicherte Fassung
  if (req.mode === 'navigate') {
    const fromNet = fetch(req).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(cache => cache.put('./index.html', copy)); }
      return res;
    });
    const fallback = () => caches.match('./index.html');
    event.respondWith(
      Promise.race([fromNet, new Promise(resolve => setTimeout(resolve, 3000)).then(fallback)])
        .then(res => res || fromNet)
        .catch(fallback)
    );
    return;
  }

  // Icons, Schriften usw.: aus dem Speicher, sonst laden und merken
  event.respondWith(
    caches.match(req).then(hit => hit || fetch(req).then(res => {
      if (res.ok || res.type === 'opaque') { const copy = res.clone(); caches.open(CACHE).then(cache => cache.put(req, copy)); }
      return res;
    }))
  );
});

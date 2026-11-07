// Offline-Cache: App läuft auch ohne Internet in der Halle.
// Bei jeder Änderung hochzählen (zusammen mit APP_VERSION in app.js).
const CACHE = 'cheerplan-v8';
const FILES = ['./', 'index.html', 'styles.css', 'app.js', 'manifest.webmanifest',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png', 'icons/logo.jpg',
  ...['1', '2', '3', '4', '5', '6', '7', '8', 'rest', 'go', 'ready', 'done'].map(n => `audio/${n}.mp3`)];
self.addEventListener('install', e => {
  // cache: 'reload' – frisch vom Server, nicht aus dem Browser-Zwischenspeicher
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES.map(f => new Request(f, { cache: 'reload' }))))
    .then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
// Erst Netz (immer beim Server nachfragen, damit Updates sofort da sind), bei Funkloch aus dem Cache
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(fetch(e.request, { cache: 'no-cache' }).then(res => {
    if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); }
    return res;
  }).catch(() => caches.match(e.request, { ignoreSearch: true })));
});

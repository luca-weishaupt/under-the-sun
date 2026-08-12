/**
 * Offline cache.
 *
 * Meeting-room WiFi is often unreliable. Everything except the YouTube embeds
 * is a static file, so once the site has been opened once on a device it keeps
 * working with no signal at all.
 */

const CACHE = 'underthesun-v1';

const CORE = [
  './',
  './index.html',
  './assets/app.css',
  './assets/icon.svg',
  './assets/js/app.js',
  './assets/js/data.js',
  './assets/js/player.js',
  './assets/js/scripture.js',
  './assets/js/store.js',
  './assets/js/ui.js',
  './assets/js/views/home.js',
  './assets/js/views/session.js',
  './assets/js/views/read.js',
  './assets/js/views/vapor.js',
  './assets/js/views/leading.js',
  './assets/js/views/credits.js',
  './data/sessions.json',
  './data/hevel.json',
  './data/bible/index.json',
  './data/bible/BSB.json',
  './data/bible/BBE.json',
  './data/bible/WEB.json',
  './data/bible/FBV.json',
  './data/bible/LSV.json',
  './data/bible/KJV.json',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      // One bad entry must not sink the whole install, so add them individually.
      .then((cache) => Promise.allSettled(CORE.map((url) => cache.add(url))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== location.origin) return; // YouTube and thumbnails go straight to the network

  // Stale-while-revalidate: instant on a bad connection, still picks up edits.
  event.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const cached = await cache.match(request);
      const network = fetch(request)
        .then((response) => {
          if (response.ok) cache.put(request, response.clone());
          return response;
        })
        .catch(() => cached || cache.match('./index.html'));
      return cached || network;
    }),
  );
});

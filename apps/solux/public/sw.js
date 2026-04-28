// Solux service worker — minimal app-shell + asset caching.
//
// Strategy:
//   - Static assets (JS, CSS, fonts, icons): cache-first.
//     Build artifacts are content-hashed by Next, so cached entries are
//     stable until the bundle changes. New URLs trigger fresh fetches.
//   - HTML / API: network-first, fall through to cache for HTML offline.
//
// We deliberately do NOT cache /transactions, /chain/info, etc — wallets
// must reflect live chain state, never stale.

// VERSION is replaced at build time by scripts/inject-sw-version.mjs with
// the Next.js BUILD_ID (a content hash). Keeping the placeholder string
// here means a build that forgets to run the script still produces a
// distinct cache namespace per SW file content via byte-diff.
const VERSION = 'solux-sw-rvo4P9WQ9oht_w305VD80';
const STATIC_CACHE = `${VERSION}-static`;
const HTML_CACHE = `${VERSION}-html`;

const APP_SHELL = ['/', '/wallet'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(HTML_CACHE).then((cache) => cache.addAll(APP_SHELL).catch(() => {})),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k)),
      ),
    ),
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Skip cross-origin requests entirely (API calls go to api.sentrixchain.com).
  if (url.origin !== self.location.origin) return;

  // Static build assets — cache-first
  if (url.pathname.startsWith('/_next/static/') || url.pathname.startsWith('/icon-') ||
      url.pathname === '/favicon.ico' || url.pathname.endsWith('.png') ||
      url.pathname.endsWith('.svg') || url.pathname.endsWith('.webmanifest')) {
    event.respondWith(
      caches.open(STATIC_CACHE).then(async (cache) => {
        const cached = await cache.match(req);
        if (cached) return cached;
        const res = await fetch(req);
        if (res.ok) cache.put(req, res.clone()).catch(() => {});
        return res;
      }),
    );
    return;
  }

  // HTML pages — network-first, fallback to cache
  if (req.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          caches.open(HTML_CACHE).then((cache) => cache.put(req, res.clone()).catch(() => {}));
          return res;
        })
        .catch(() => caches.match(req).then((c) => c ?? caches.match('/wallet'))),
    );
    return;
  }
});

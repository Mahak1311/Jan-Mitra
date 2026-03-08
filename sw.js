/**
 * JanMitra Service Worker
 * Provides offline support with cache-first strategy for static assets
 * and network-first for API routes.
 */

const CACHE_NAME = 'janmitra-v1';
const STATIC_CACHE = 'janmitra-static-v1';
const API_CACHE = 'janmitra-api-v1';

// Pages and assets to precache on install
const PRECACHE_URLS = [
  '/index.html',
  '/schemes.html',
  '/eligibility.html',
  '/checklist.html',
  '/chat.html',
  '/voice.html',
  '/about.html',
  '/whatsapp.html',
  '/rights.html',
  '/jobs.html',
  '/low-bandwidth.html',
  '/js/api.js',
  '/js/auth-ui.js',
  '/js/lang-switcher.js',
  '/data/schemes.json',
  '/data/documents.json',
  '/data/helplines.json',
  '/data/jobs.json',
  '/icons/icon.svg',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/manifest.json'
];

// ── Install: precache all static assets ──────────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

// ── Activate: clean up old caches ────────────────────────────────────────────
self.addEventListener('activate', event => {
  const validCaches = [STATIC_CACHE, API_CACHE];
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(key => !validCaches.includes(key))
          .map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

// ── Fetch: routing strategy ───────────────────────────────────────────────────
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle same-origin requests
  if (url.origin !== location.origin) return;

  // API routes: Network-first, fall back to cached response
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirst(request, API_CACHE));
    return;
  }

  // Auth routes: always network-only (never cache)
  if (url.pathname.startsWith('/auth/')) {
    event.respondWith(fetch(request));
    return;
  }

  // Static HTML pages: Stale-while-revalidate
  if (request.mode === 'navigate' || url.pathname.endsWith('.html') || url.pathname === '/') {
    event.respondWith(staleWhileRevalidate(request, STATIC_CACHE));
    return;
  }

  // JS, JSON data, images: Cache-first
  event.respondWith(cacheFirst(request, STATIC_CACHE));
});

// ── Strategy: Network-first ───────────────────────────────────────────────────
async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const networkRes = await fetch(request);
    if (networkRes.ok) {
      cache.put(request, networkRes.clone());
    }
    return networkRes;
  } catch {
    const cached = await cache.match(request);
    return cached || offlineFallback(request);
  }
}

// ── Strategy: Cache-first ─────────────────────────────────────────────────────
async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const networkRes = await fetch(request);
    if (networkRes.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkRes.clone());
    }
    return networkRes;
  } catch {
    return offlineFallback(request);
  }
}

// ── Strategy: Stale-while-revalidate ─────────────────────────────────────────
async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  const networkPromise = fetch(request).then(res => {
    if (res.ok) cache.put(request, res.clone());
    return res;
  }).catch(() => null);

  return cached || networkPromise || offlineFallback(request);
}

// ── Offline fallback ──────────────────────────────────────────────────────────
function offlineFallback(request) {
  if (request.mode === 'navigate') {
    return caches.match('/low-bandwidth.html');
  }
  return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
}

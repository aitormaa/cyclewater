// CycleWater Service Worker — v48
// Bump CACHE version whenever you deploy new files

const CACHE = 'cyclewater-v48';

const APP_FILES = [
  './',
  './index.html',
  './manifest.json',
  './cw-theme.css',
  './cw-extras.js',
  './cw-fixes.js',
  './recent-routes.js',
  './gamification.js',
  './cw-community.js',
  './recent-routes.js',
  './cw-search.js',
  './cw-identity.js',
  './sw.js',
  './icon-192.png',
  './icon-512.png'
];

const CDN_FILES = [
  'https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.css',
  'https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.js',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js'
];

// ── Install: pre-cache everything ────────────────────────────────────────────
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll([...APP_FILES, ...CDN_FILES]))
      .catch(() => caches.open(CACHE).then(c => c.addAll(APP_FILES))) // CDN optional
  );
  self.skipWaiting();
});

// ── Activate: delete old caches ───────────────────────────────────────────────
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ── Fetch strategy ────────────────────────────────────────────────────────────
self.addEventListener('fetch', e => {
  const url = e.request.url;

  // Skip non-GET and browser internals
  if (e.request.method !== 'GET' || url.startsWith('chrome-extension')) return;

  // Network-first for live data (tiles, APIs, routing)
  const isLive =
    url.includes('openfreemap.org') ||
    url.includes('overpass') ||
    url.includes('osrm') ||
    url.includes('open-meteo') ||
    url.includes('supabase.co') ||
    url.includes('nominatim') ||
    url.includes('openstreetmap.org/api');

  if (isLive) {
    e.respondWith(
      fetch(e.request)
        .catch(() => caches.match(e.request))
    );
    return;
  }

  // Cache-first for app shell + CDN assets
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(res => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      });
    })
  );
});

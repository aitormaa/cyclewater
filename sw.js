// CycleWater Service Worker
// Update this CACHE name whenever you want to force browsers to refresh cached files.
const CACHE = 'cyclewater-v3';

const APP_SHELL = [
  './',
  './index.html',
  'https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.css',
  'https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.js',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => Promise.allSettled(APP_SHELL.map(url => cache.add(url))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);

  // Always try the latest app HTML first, then fall back to cache if offline.
  // This prevents users getting stuck on an old version.
  if (request.mode === 'navigate' || url.pathname.endsWith('/index.html')) {
    event.respondWith(
      fetch(request)
        .then(response => {
          const copy = response.clone();
          caches.open(CACHE).then(cache => cache.put('./index.html', copy));
          return response;
        })
        .catch(() => caches.match('./index.html').then(cached => cached || caches.match('./')))
    );
    return;
  }

  // Map tiles and libraries: cache first, then network.
  // This helps repeated rides load faster and gives partial offline support.
  if (
    url.hostname.includes('openfreemap') ||
    url.hostname.includes('unpkg') ||
    url.hostname.includes('jsdelivr')
  ) {
    event.respondWith(
      caches.match(request).then(cached => {
        if (cached) return cached;
        return fetch(request).then(response => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(CACHE).then(cache => cache.put(request, copy));
          }
          return response;
        });
      })
    );
    return;
  }

  // Everything else, including Overpass, OSRM, Open-Meteo, Supabase:
  // network first. These should stay live/fresh.
  event.respondWith(fetch(request).catch(() => caches.match(request)));
});

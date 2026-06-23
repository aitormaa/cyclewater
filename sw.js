// CycleWater Service Worker
// v4 adds Recent Routes injection and prevents old HTML cache issues.
const CACHE = 'cyclewater-v4';

const APP_SHELL = [
  './',
  './index.html',
  './recent-routes.js',
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

function injectRecentRoutes(html) {
  if (html.includes('recent-routes.js')) return html;
  const tag = '<script src="./recent-routes.js"></script>';
  if (html.includes('</body>')) return html.replace('</body>', tag + '\n</body>');
  return html + tag;
}

async function htmlResponse(request) {
  const cache = await caches.open(CACHE);
  try {
    const network = await fetch(request, { cache: 'no-store' });
    const html = await network.text();
    const injected = injectRecentRoutes(html);
    const response = new Response(injected, {
      status: network.status,
      statusText: network.statusText,
      headers: { 'Content-Type': 'text/html; charset=utf-8' }
    });
    cache.put('./index.html', response.clone());
    return response;
  } catch (e) {
    const cached = await cache.match('./index.html') || await cache.match('./');
    if (cached) return cached;
    return new Response('CycleWater is offline and not cached yet.', {
      status: 503,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' }
    });
  }
}

self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);

  // App HTML: network first + inject Recent Routes script.
  if (request.mode === 'navigate' || url.pathname.endsWith('/index.html') || url.pathname.endsWith('/cyclewater/')) {
    event.respondWith(htmlResponse(request));
    return;
  }

  // App JS and libraries: cache first, then network.
  if (
    url.pathname.endsWith('/recent-routes.js') ||
    url.hostname.includes('unpkg') ||
    url.hostname.includes('jsdelivr') ||
    url.hostname.includes('openfreemap')
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

  // Live APIs: network first, never force stale data.
  event.respondWith(fetch(request).catch(() => caches.match(request)));
});

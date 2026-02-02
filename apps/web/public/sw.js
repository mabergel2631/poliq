const CACHE_NAME = 'poliq-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Network-first strategy for API calls
  if (event.request.url.includes('/api/') || event.request.url.includes(':8000')) {
    return;
  }

  // Cache-first for static assets
  if (event.request.destination === 'image' || event.request.destination === 'style' || event.request.destination === 'font') {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        return cached || fetch(event.request).then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          return response;
        });
      })
    );
    return;
  }

  // Network-first for pages
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});

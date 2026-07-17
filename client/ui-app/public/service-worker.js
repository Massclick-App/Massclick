const CACHE_NAME = 'massclick-v2';
const IMAGE_CACHE = 'massclick-images-v2';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(urlsToCache).catch(() => undefined);
      })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName !== IMAGE_CACHE) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== 'GET') {
    return;
  }

  if (shouldBypassRequest(url)) {
    return;
  }

  if (isImageRequest(request)) {
    event.respondWith(cacheFirstStrategy(request, IMAGE_CACHE));
    return;
  }

  event.respondWith(networkFirstStrategy(request));
});

function isImageRequest(request) {
  return /\.(png|jpg|jpeg|gif|webp|svg)$/i.test(request.url) ||
         request.destination === 'image';
}

function shouldBypassRequest(url) {
  return url.pathname.startsWith('/api/');
}

function cacheFirstStrategy(request, cacheName) {
  return caches.match(request)
    .then((response) => {
      if (response) {
        return response;
      }

      return fetch(request)
        .then((response) => {
          if (!response || response.status !== 200 || response.type === 'error') {
            return response;
          }

          const responseToCache = response.clone();
          caches.open(cacheName)
            .then((cache) => {
              cache.put(request, responseToCache).catch(() => {});
            })
            .catch(() => {});

          return response;
        })
        .catch(() => {
          return caches.match(request) || new Response('Image not available', { status: 404 });
        });
    })
    .catch(() => {
      return new Response('Cache error', { status: 500 });
    });
}

function networkFirstStrategy(request) {
  return fetch(request)
    .then((response) => {
      if (!response || response.status !== 200) {
        return response;
      }

      const responseToCache = response.clone();
      caches.open(CACHE_NAME)
        .then((cache) => {
          cache.put(request, responseToCache);
        });

      return response;
    })
    .catch(() => {
      return caches.match(request)
        .then((response) => response || new Response('Offline'));
    });
}

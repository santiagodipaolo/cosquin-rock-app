const CACHE_NAME = 'cosquin-rock-v4';
const RUNTIME_CACHE = 'runtime-cache-v4';

// Recursos para pre-cachear
const PRE_CACHE_URLS = [
  '/',
  '/schedule',
  '/my-bands',
  '/groups',
  '/profile',
  '/login',
  '/manifest.json',
];

// Instalación - Pre-cachear recursos críticos
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Pre-caching critical resources');
        return cache.addAll(PRE_CACHE_URLS);
      })
      .then(() => self.skipWaiting())
  );
});

// Activación - Limpiar caches viejos
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME && name !== RUNTIME_CACHE)
          .map((name) => {
            console.log('[SW] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch - Estrategia híbrida
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignorar chrome extensions y otros protocolos
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // Estrategia para APIs: Network First con fallback a cache
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cachear respuestas exitosas de APIs específicas
          if (response.ok && (
            url.pathname.includes('/api/bands') ||
            url.pathname.includes('/api/attendance') ||
            url.pathname.includes('/api/groups') ||
            url.pathname.includes('/api/friends')
          )) {
            const responseClone = response.clone();
            caches.open(RUNTIME_CACHE).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          // Si falla, intentar desde cache
          return caches.match(request).then((cachedResponse) => {
            if (cachedResponse) {
              console.log('[SW] Serving API from cache:', url.pathname);
              return cachedResponse;
            }
            // Retornar respuesta offline genérica
            return new Response(
              JSON.stringify({ error: 'Sin conexión', offline: true }),
              {
                headers: { 'Content-Type': 'application/json' },
                status: 503
              }
            );
          });
        })
    );
    return;
  }

  // Estrategia para páginas: Network First con fallback a cache
  // Esto asegura que los usuarios siempre vean la versión más reciente
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const responseClone = response.clone();
            caches.open(RUNTIME_CACHE).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          return caches.match(request)
            .then((cachedResponse) => cachedResponse || caches.match('/') || new Response('Offline'));
        })
    );
    return;
  }

  // Estrategia para assets (JS, CSS, imágenes): Cache First con Network Fallback
  event.respondWith(
    caches.match(request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }

        return fetch(request)
          .then((response) => {
            if (!response || response.status !== 200 || response.type === 'error') {
              return response;
            }

            const responseClone = response.clone();
            caches.open(RUNTIME_CACHE).then((cache) => {
              cache.put(request, responseClone);
            });

            return response;
          })
          .catch((error) => {
            console.log('[SW] Fetch failed:', url.pathname, error);
            return new Response('Offline');
          });
      })
  );
});

// Mensajes desde el cliente
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

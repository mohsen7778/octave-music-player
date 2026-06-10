const CACHE_NAME = 'octave-v3';
const APP_ASSETS = [
    '/',
    '/index.html',
    '/css/style.css',
    '/css/routing.css',
    '/js/app.js',
    '/js/player.js',
    '/js/algorithm.js',
    '/logo.png'
];

// Install the service worker and cache the app files
self.addEventListener('install', (event) => {
    self.skipWaiting(); 
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return Promise.allSettled(APP_ASSETS.map(url => cache.add(url)));
        })
    );
});

// Clean up old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(self.clients.claim());
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((name) => {
                    if (name !== CACHE_NAME) {
                        return caches.delete(name);
                    }
                })
            );
        })
    );
});

// INSTANT LOAD: Stale-While-Revalidate Strategy
self.addEventListener('fetch', (event) => {
    if (!event.request.url.startsWith(self.location.origin)) return;

    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            const fetchPromise = fetch(event.request).then((networkResponse) => {
                caches.open(CACHE_NAME).then((cache) => {
                    cache.put(event.request, networkResponse.clone());
                });
                return networkResponse;
            }).catch(() => {
                // Ignore network errors, rely on cache
            });

            return cachedResponse || fetchPromise;
        })
    );
});

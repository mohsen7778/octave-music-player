const CACHE_NAME = 'octave-v4';
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

// Install: cache only the static app shell
self.addEventListener('install', (event) => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return Promise.allSettled(APP_ASSETS.map(url => cache.add(url)));
        })
    );
});

// Activate: nuke ALL old caches (v1/v2/v3 all get deleted here)
self.addEventListener('activate', (event) => {
    event.waitUntil(
        Promise.all([
            self.clients.claim(),
            caches.keys().then((cacheNames) => {
                return Promise.all(
                    cacheNames.map((name) => {
                        if (name !== CACHE_NAME) {
                            console.log('[SW] Deleting old cache:', name);
                            return caches.delete(name);
                        }
                    })
                );
            })
        ])
    );
});

// FIXED FETCH STRATEGY:
// Only cache the known static app shell files.
// External requests (Invidious, YouTube, iTunes, Telegram, corsproxy, etc.) = always network-only.
// API-style paths = always network-only.
// This prevents unbounded cache growth and stale API responses.
self.addEventListener('fetch', (event) => {
    const url = event.request.url;

    // Only handle GET requests
    if (event.request.method !== 'GET') return;

    // External requests: never cache, pass straight through
    if (!url.startsWith(self.location.origin)) return;

    // Build a set of exact cacheable URLs from APP_ASSETS
    const origin = self.location.origin;
    const cacheableUrls = new Set(
        APP_ASSETS.map(asset => new URL(asset, origin).href)
    );

    // Check if this is a known static asset (strip query strings for matching)
    const urlWithoutQuery = url.split('?')[0];
    const isAppAsset = cacheableUrls.has(url) || cacheableUrls.has(urlWithoutQuery);

    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            const fetchPromise = fetch(event.request).then((networkResponse) => {
                // Only write to cache for known static app shell files
                if (isAppAsset && networkResponse && networkResponse.status === 200) {
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, networkResponse.clone());
                    });
                }
                return networkResponse;
            }).catch(() => {
                // Network failed: fall back to cache if we have it
                if (cachedResponse) return cachedResponse;
                // Otherwise let it fail naturally
            });

            // Serve cache immediately (fast load), revalidate in background
            return cachedResponse || fetchPromise;
        })
    );
});

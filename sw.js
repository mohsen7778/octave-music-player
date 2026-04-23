const CACHE_NAME = 'octave-v1';
const APP_ASSETS = [
    './',
    './index.html',
    './css/style.css',
    './js/app.js',
    './js/player.js',
    './js/algorithm.js',
    './logo.png'
];

// Install the service worker and cache the app files
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(APP_ASSETS);
        })
    );
});

// Serve cached files when offline
self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request).then((response) => {
            return response || fetch(event.request);
        }).catch(() => {
            // Fallback if totally offline and not in cache
        })
    );
});

// Clean up old caches if we update the app
self.addEventListener('activate', (event) => {
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

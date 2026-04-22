// ============================================================
// sw.js — Octave Background Keepalive Service Worker
// Runs in a separate thread independent of the page's JS thread.
// When Android suspends the tab, this SW thread stays alive,
// holding Chrome's process open and preventing full tab death.
// ============================================================

const SW_VERSION = 'octave-sw-v1';

// Install immediately — don't wait for old SW to die
self.addEventListener('install', () => self.skipWaiting());

// Take control of all clients immediately
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));

// Respond to keepalive pings from player.js
// event.waitUntil() tells the browser "don't kill this SW yet, work is pending"
// This is the hook that keeps the Chrome process alive
self.addEventListener('message', e => {
    if (e.data === 'keepalive') {
        e.waitUntil(
            // Claim all clients to stay authoritative
            self.clients.matchAll().then(clients => {
                // SW is alive — no action needed, waitUntil is the point
                return Promise.resolve();
            })
        );
    }
});

// Background Sync event — fired by the browser even when tab is suspended
// Acts as a secondary keepalive mechanism on supported Android versions
self.addEventListener('sync', e => {
    if (e.tag === 'octave-keepalive') {
        e.waitUntil(Promise.resolve());
    }
});

// Fetch handler — pass all requests straight through, no caching
// We're not a caching SW, just a keepalive thread
self.addEventListener('fetch', e => {
    e.respondWith(fetch(e.request));
});

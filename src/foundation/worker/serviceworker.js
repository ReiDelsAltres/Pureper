/**
 * Purper Service Worker
 * Handles caching, offline support, and connectivity detection.
 *
 * Message API (postMessage from client):
 *   CACHE_URL        { url }              — add a URL to cache
 *   CACHE_URLS       { urls }             — add multiple URLs to cache
 *   REMOVE_URL       { url }              — remove a URL from cache
 *   CLEAR_CACHE      —                    — wipe entire cache
 *   GET_CACHE_KEYS   —                    — list all cached URLs
 *   HAS_URL          { url }              — check if URL is cached
 *   SKIP_WAITING     —                    — activate new SW immediately
 *   GET_VERSION      —                    — return SW version string
 *   IS_ONLINE        —                    — connectivity check from SW context
 */

const CACHE_VERSION = 'purper-v1';
const SW_VERSION = '1.0.0';

// ── Install ─────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
    console.log(`[ServiceWorker ${SW_VERSION}]: Installing...`);
    event.waitUntil(
        caches.open(CACHE_VERSION)
            .then(() => {
                console.log(`[ServiceWorker ${SW_VERSION}]: Cache "${CACHE_VERSION}" opened`);
                return self.skipWaiting();
            })
    );
});

// ── Activate ────────────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
    console.log(`[ServiceWorker ${SW_VERSION}]: Activating...`);
    event.waitUntil(
        caches.keys()
            .then((keys) => {
                return Promise.all(
                    keys
                        .filter((key) => key !== CACHE_VERSION)
                        .map((key) => {
                            console.log(`[ServiceWorker ${SW_VERSION}]: Deleting old cache "${key}"`);
                            return caches.delete(key);
                        })
                );
            })
            .then(() => {
                console.log(`[ServiceWorker ${SW_VERSION}]: Claiming clients`);
                return self.clients.claim();
            })
    );
});

// ── Fetch ───────────────────────────────────────────────────────────
// Network-first for navigation, cache-first for assets.
self.addEventListener('fetch', (event) => {
    const request = event.request;

    // Only handle GET requests
    if (request.method !== 'GET') return;

    // Navigation requests (HTML pages) — network-first, fall back to cache
    if (request.mode === 'navigate') {
        event.respondWith(
            fetch(request)
                .then((response) => {
                    if (response.ok) {
                        const clone = response.clone();
                        caches.open(CACHE_VERSION).then((cache) => cache.put(request, clone));
                    }
                    return response;
                })
                .catch(() => {
                    return caches.match(request).then((cached) => {
                        return cached || caches.match('/index.html');
                    });
                })
        );
        return;
    }

    // Sub-resources (CSS, JS, images, fonts, JSON) — cache-first, fall back to network
    event.respondWith(
        caches.match(request).then((cached) => {
            if (cached) return cached;

            return fetch(request).then((response) => {
                if (response.ok && response.type === 'basic') {
                    const clone = response.clone();
                    caches.open(CACHE_VERSION).then((cache) => cache.put(request, clone));
                }
                return response;
            });
        })
    );
});

// ── Message handling ────────────────────────────────────────────────
self.addEventListener('message', (event) => {
    const { type, url, urls } = event.data || {};
    const port = event.ports?.[0];

    switch (type) {
        case 'CACHE_URL':
            caches.open(CACHE_VERSION)
                .then((cache) => cache.add(url))
                .then(() => console.log(`[ServiceWorker]: Cached "${url}"`))
                .catch((err) => console.warn(`[ServiceWorker]: Failed to cache "${url}"`, err));
            break;

        case 'CACHE_URLS':
            if (Array.isArray(urls)) {
                caches.open(CACHE_VERSION)
                    .then((cache) => cache.addAll(urls))
                    .then(() => console.log(`[ServiceWorker]: Cached ${urls.length} URLs`))
                    .catch((err) => console.warn('[ServiceWorker]: Failed to cache URLs', err));
            }
            break;

        case 'REMOVE_URL':
            caches.open(CACHE_VERSION)
                .then((cache) => cache.delete(url))
                .then((deleted) => {
                    console.log(`[ServiceWorker]: ${deleted ? 'Removed' : 'Not found'} "${url}" from cache`);
                    if (port) port.postMessage({ deleted });
                })
                .catch((err) => {
                    console.warn(`[ServiceWorker]: Failed to remove "${url}"`, err);
                    if (port) port.postMessage({ deleted: false });
                });
            break;

        case 'CLEAR_CACHE':
            caches.delete(CACHE_VERSION)
                .then(() => caches.open(CACHE_VERSION))
                .then(() => {
                    console.log('[ServiceWorker]: Cache cleared');
                    if (port) port.postMessage({ cleared: true });
                })
                .catch((err) => {
                    console.warn('[ServiceWorker]: Failed to clear cache', err);
                    if (port) port.postMessage({ cleared: false });
                });
            break;

        case 'GET_CACHE_KEYS':
            caches.open(CACHE_VERSION)
                .then((cache) => cache.keys())
                .then((requests) => {
                    const keys = requests.map((r) => r.url);
                    if (port) port.postMessage({ keys });
                })
                .catch(() => {
                    if (port) port.postMessage({ keys: [] });
                });
            break;

        case 'HAS_URL':
            caches.match(url)
                .then((match) => {
                    if (port) port.postMessage({ cached: !!match });
                })
                .catch(() => {
                    if (port) port.postMessage({ cached: false });
                });
            break;

        case 'SKIP_WAITING':
            console.log('[ServiceWorker]: Skip waiting requested');
            self.skipWaiting();
            break;

        case 'GET_VERSION':
            if (port) port.postMessage({ version: SW_VERSION });
            break;

        case 'IS_ONLINE': {
            fetch(url || '/index.html', { cache: 'no-store', method: 'HEAD' })
                .then((res) => {
                    if (port) port.postMessage({ online: res.ok });
                })
                .catch(() => {
                    if (port) port.postMessage({ online: false });
                });
            break;
        }

        default:
            console.warn(`[ServiceWorker]: Unknown message type "${type}"`);
    }
});
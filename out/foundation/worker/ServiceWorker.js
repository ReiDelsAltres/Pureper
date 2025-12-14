const swSelf = self;
// Автоматически генерируем CACHE_NAME из base.json
//import base from '../../../data/base.json';
const CACHE_NAME = `pureper-v1`;
const STATIC_ASSETS = [
    '/index.html'
];
/*if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./serviceWorker.js', { type: 'module' })
            .then((registration) => {
                console.log('ServiceWorker registration successful:', registration.scope);
            })
            .catch((error) => {
                console.error('ServiceWorker registration failed:', error);
            });
    });
    window.addEventListener('fetch', (event: FetchEvent) => {
        event.respondWith(
            caches.match(event.request).then((cachedResponse) => {
                console.log(`[ServiceWorker]: Fetching ${event.request.url}`);
                return cachedResponse || fetch(event.request);
            })
        );
    });
}

/**
 * Install event - cache static assets
 */
/*window.addEventListener('install', (event: ExtendableEvent) => {
    console.log('ServiceWorker: Installing...');
    const assetsToCache = [
        ...STATIC_ASSETS
    ];
    // Remove duplicates
    const uniqueAssets = Array.from(new Set(assetsToCache));
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache: Cache) => {
                console.log('ServiceWorker: Caching static assets and SPA routes');
                return cache.addAll(uniqueAssets);
            })
            .then(() => {
                console.log('ServiceWorker: Installation complete');
                return swSelf.skipWaiting();
            })
    );
});*/
export default class ServiceWorker {
    /**
     * Sends a message to the service worker to cache a specific URL.
     * @param url The URL of the resource to cache.
     */
    static async addToCache(url) {
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
            navigator.serviceWorker.controller.postMessage({
                type: 'CACHE_URL',
                url: url
            });
        }
        else {
            // Fallback: try to cache directly using the Cache API
            try {
                const cache = await caches.open('pureper-v1');
                const response = await fetch(url);
                if (response.ok) {
                    await cache.put(url, response);
                    console.log('[ServiceWorker]: Resource cached directly:', url);
                }
            }
            catch (e) {
                console.warn('[ServiceWorker]: Failed to cache resource:', url, e);
            }
        }
    }
    /**
     * Asks the service worker to skip waiting and activate the new version.
     */
    static skipWaiting() {
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
            navigator.serviceWorker.controller.postMessage({ type: 'SKIP_WAITING' });
        }
    }
    /**
     * Gets the version of the currently active service worker.
     * @returns A promise that resolves with the version string.
     */
    static getVersion() {
        return new Promise((resolve, reject) => {
            if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
                const messageChannel = new MessageChannel();
                messageChannel.port1.onmessage = (event) => {
                    if (event.data.error) {
                        reject(event.data.error);
                    }
                    else {
                        resolve(event.data.version);
                    }
                };
                navigator.serviceWorker.controller.postMessage({ type: 'GET_VERSION' }, [messageChannel.port2]);
            }
            else {
                reject('Service worker not available.');
            }
        });
    }
    /**
     * Checks if the given URL is present in the Service Worker's cache.
     */
    static isCached(url) {
        return new Promise((resolve) => {
            if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
                const mc = new MessageChannel();
                mc.port1.onmessage = (ev) => {
                    if (ev.data && typeof ev.data.cached === 'boolean') {
                        resolve(ev.data.cached);
                    }
                    else {
                        resolve(false);
                    }
                };
                navigator.serviceWorker.controller.postMessage({ type: 'HAS_URL', url }, [mc.port2]);
            }
            else {
                // Fallback: try CacheStorage directly (same-origin only)
                caches.match(url).then(match => resolve(!!match)).catch(() => resolve(false));
            }
        });
    }
    /**
     * Checks if the browser is online.
     */
    static async isOnline() {
        try {
            const response = await fetch('./index.html', { cache: 'no-store' });
            return response && response.ok;
        }
        catch {
            return false;
        }
    }
}
//# sourceMappingURL=ServiceWorker.js.map
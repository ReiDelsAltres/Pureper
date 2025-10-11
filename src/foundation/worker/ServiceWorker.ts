/**
 * Service Worker for Pureper SPA
 * Handles client-side routing by intercepting navigation requests
 * and serving index.html for all SPA routes
 */
import type { ExtendableEvent } from './api/ExtendableEvent';
import type { FetchEvent } from './api/FetchEvent';
import type { ExtendableMessageEvent } from './api/ExtendableMessageEvent';
import type { Clients } from './api/Clients';
import type { ServiceWorkerGlobalScope } from './api/ServiceWorkerGlobalScope';

// Type assertion for Service Worker context
declare let self: ServiceWorkerGlobalScope
const swSelf = self;

// Автоматически генерируем CACHE_NAME из base.json
//import base from '../../../data/base.json';
const CACHE_NAME = `pureper-v1`;

const BASE_PATH = '/Pureper'; // GitHub Pages base path
const IS_GITHUB_PAGES = swSelf.location.hostname.includes('github.io');

const STATIC_ASSETS: string[] = [
    '/index.html'
    // '/offline.html' // Uncomment if you add offline.html
];
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('../out/src/foundation/worker/ServiceWorker.js', { type: 'module' })
            .then((registration) => {
                console.log('ServiceWorker registration successful:', registration.scope);
            })
            .catch((error) => {
                console.error('ServiceWorker registration failed:', error);
            });
    });
}

/**
 * Install event - cache static assets
 */
swSelf.addEventListener('install', (event: ExtendableEvent) => {
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
});

/**
 * Activate event - clean up old caches
 */
swSelf.addEventListener('activate', (event: ExtendableEvent) => {
    console.log('ServiceWorker: Activating...');

    event.waitUntil(
        caches.keys()
            .then((cacheNames: string[]) => {
                return Promise.all(
                    cacheNames.map((cacheName: string) => {
                        if (cacheName !== CACHE_NAME) {
                            console.log('ServiceWorker: Deleting old cache:', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            })
            .then(() => {
                console.log('ServiceWorker: Activation complete');
                return swSelf.clients.claim();
            })
    );
});

/**
 * Fetch event - handle all network requests
 */
swSelf.addEventListener('fetch', (event: FetchEvent) => {
    const url = new URL(event.request.url);

    // Only handle requests from the same origin
    if (url.origin !== swSelf.location.origin) {
        return;
    }

    // Handle navigation requests (HTML pages)
    if (event.request.mode === 'navigate') {
        event.respondWith(handleNavigationRequest(event.request));
        return;
    }

    // Handle static asset requests (cache falling back to network)
    event.respondWith(
        caches.match(event.request)
            .then((cached) => cached || fetchAndCache(event.request))
            .catch(() => offlineFallback())
    );
});

/**
 * Handle navigation requests for SPA routing
 */
async function handleNavigationRequest(request: Request): Promise<Response> {
    const url = new URL(request.url);
    let pathname = url.pathname;
    if (IS_GITHUB_PAGES && pathname.startsWith(BASE_PATH)) {
        pathname = pathname.substring(BASE_PATH.length) || '/';
    }
    // Если это SPA-маршрут — всегда отдаём index.html (из кэша или сети)
    const isSpaRoute = pathname.startsWith('/') && !pathname.includes('.');
    const indexUrl = IS_GITHUB_PAGES ? BASE_PATH + '/index.html' : '/index.html';
    if (isSpaRoute) {
        try {
            const cached = await caches.match(indexUrl);
            if (cached) return cached;
            const response = await fetch(indexUrl);
            if (response.ok) {
                const cache = await caches.open(CACHE_NAME);
                cache.put(indexUrl, response.clone());
            }
            return response;
        } catch {
            return offlineFallback();
        }
    }
    // Для не-SPA маршрутов — обычная стратегия
    return fetchAndCache(request);
}

// Кэшировать новые ресурсы по мере загрузки
async function fetchAndCache(request: Request): Promise<Response> {
    try {
        const response = await fetch(request);
        if (response && response.ok) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, response.clone());
        }
        return response;
    } catch {
        return offlineFallback();
    }
}

// Offline fallback: отдаём offline.html если есть, иначе index.html
async function offlineFallback(): Promise<Response> {
    // Если есть offline.html — раскомментируйте следующую строку
    // const offlineUrl = IS_GITHUB_PAGES ? BASE_PATH + '/offline.html' : '/offline.html';
    // const cached = await caches.match(offlineUrl);
    // if (cached) return cached;
    const indexUrl = IS_GITHUB_PAGES ? BASE_PATH + '/index.html' : '/index.html';
    const cached = await caches.match(indexUrl);
    if (cached) return cached;
    return new Response('Offline', { status: 503 });
}

/**
 * Handle static asset requests with caching strategy
 */
async function handleAssetRequest(request: Request): Promise<Response> {
    try {
        // Try cache first (cache-first strategy)
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }

        // Fallback to network
        const networkResponse = await fetch(request);

        // Cache successful responses
        if (networkResponse.ok) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, networkResponse.clone());
        }

        return networkResponse;
    } catch (error) {
        console.error('ServiceWorker: Asset request failed:', error);

        // Try to serve from cache as last resort
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }

        return new Response('Network error', { status: 503 });
    }
}

/**
 * Message event - handle messages from main thread
 */
swSelf.addEventListener('message', (event: ExtendableMessageEvent) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        swSelf.skipWaiting();
    }

    if (event.data && event.data.type === 'GET_VERSION') {
        event.ports[0].postMessage({ version: CACHE_NAME });
    }

    if (event.data && event.data.type === 'CACHE_URL') {
        // Cache a specific URL on demand
        event.waitUntil(
            fetch(event.data.url)
                .then(response => {
                    if (response.ok) {
                        return caches.open(CACHE_NAME).then(cache => cache.put(event.data.url, response));
                    }
                })
                .catch(err => console.error('ServiceWorker: CACHE_URL failed:', event.data.url, err))
        );
    }

    if (event.data && event.data.type === 'HAS_URL') {
        // Check if a specific URL is present in cache
        const port = event.ports && event.ports[0];
        if (port) {
            event.waitUntil(
                caches.match(event.data.url).then(match => {
                    port.postMessage({ cached: !!match });
                }).catch(err => {
                    console.error('ServiceWorker: HAS_URL failed:', event.data.url, err);
                    port.postMessage({ cached: false, error: String(err) });
                })
            );
        }
    }
});

/**
 * Client-side helper for interacting with the Service Worker
 */

export default class ServiceWorker {
    /**
     * Sends a message to the service worker to cache a specific URL.
     * @param url The URL of the resource to cache.
     */
    static async addToCache(url: string): Promise<void> {
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
            navigator.serviceWorker.controller.postMessage({
                type: 'CACHE_URL',
                url: url
            });
        } else {
            // Fallback: try to cache directly using the Cache API
            try {
                const cache = await caches.open('pureper-v1');
                const response = await fetch(url);
                if (response.ok) {
                    await cache.put(url, response);
                    console.log('SWHelper: Resource cached directly:', url);
                }
            } catch (e) {
                console.warn('SWHelper: Failed to cache resource:', url, e);
            }
        }
    }

    /**
     * Asks the service worker to skip waiting and activate the new version.
     */
    static skipWaiting(): void {
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
            navigator.serviceWorker.controller.postMessage({ type: 'SKIP_WAITING' });
        }
    }

    /**
     * Gets the version of the currently active service worker.
     * @returns A promise that resolves with the version string.
     */
    static getVersion(): Promise<string> {
        return new Promise((resolve, reject) => {
            if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
                const messageChannel = new MessageChannel();
                messageChannel.port1.onmessage = (event) => {
                    if (event.data.error) {
                        reject(event.data.error);
                    } else {
                        resolve(event.data.version);
                    }
                };
                navigator.serviceWorker.controller.postMessage({ type: 'GET_VERSION' }, [messageChannel.port2]);
            } else {
                reject('Service worker not available.');
            }
        });
    }

    /**
     * Checks if the given URL is present in the Service Worker's cache.
     */
    static isCached(url: string): Promise<boolean> {
        return new Promise((resolve) => {
            if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
                const mc = new MessageChannel();
                mc.port1.onmessage = (ev) => {
                    if (ev.data && typeof ev.data.cached === 'boolean') {
                        resolve(ev.data.cached);
                    } else {
                        resolve(false);
                    }
                };
                navigator.serviceWorker.controller.postMessage({ type: 'HAS_URL', url }, [mc.port2]);
            } else {
                // Fallback: try CacheStorage directly (same-origin only)
                caches.match(url).then(match => resolve(!!match)).catch(() => resolve(false));
            }
        });
    }

    /**
     * Checks if the browser is online.
     */
    static async isOnline(): Promise<boolean> {
        try {
            const response = await fetch('/index.html', { method: 'HEAD', cache: 'no-store' });
            return response && response.ok;
        } catch {
            return false;
        }
    }
}
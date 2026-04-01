import Observable from "../api/Observer.js";

export type ServiceWorkerConfig = {
    scriptURL?: string;
    scope?: string;
};

export interface FetchActivityItem {
    id: number;
    url: string;
    startTime: number;
    size?: number;
    duration?: number;
    fromCache?: boolean;
    status: 'loading' | 'complete' | 'error';
    error?: string;
}

export type PageSourceType = 'cache' | 'network' | 'unknown';

/**
 * Client-side Service Worker manager for Purper SPA.
 *
 * Provides:
 * - Registration with one call (`ServiceWorker.register()`)
 * - Cache management: add / remove / list / clear
 * - Connectivity detection with reactive `online` observable
 *
 * Usage:
 * ```ts
 * await ServiceWorker.register();              // defaults to './serviceworker.js'
 * await ServiceWorker.addToCache('/data.json');
 * await ServiceWorker.removeFromCache('/old.css');
 * ServiceWorker.online.subscribe(v => console.log('online:', v));
 * ```
 */
export default class ServiceWorker {
    private static _registration?: ServiceWorkerRegistration;

    /** Observable connectivity state — subscribe for real-time changes. */
    static readonly online: Observable<boolean> = new Observable(navigator.onLine);

    static readonly fetchActivities: Observable<FetchActivityItem[]> = new Observable([]);
    static readonly pageSource: Observable<PageSourceType> = new Observable<PageSourceType>('unknown');
    private static _fetchTrackingEnabled = false;
    private static _fetchListenerBound = false;

    // ── Connectivity listeners (bound once) ─────────────────────────
    private static _connectivityBound = false;
    private static _bindConnectivity(): void {
        if (this._connectivityBound) return;
        this._connectivityBound = true;

        window.addEventListener('online', () => {
            console.log('[ServiceWorker]: Browser went online');
            this.online.setObject(true);
        });
        window.addEventListener('offline', () => {
            console.log('[ServiceWorker]: Browser went offline');
            this.online.setObject(false);
        });
    }

    // ── Registration ────────────────────────────────────────────────
    static async register(config?: ServiceWorkerConfig): Promise<ServiceWorkerRegistration | undefined> {
        if (!('serviceWorker' in navigator)) {
            console.warn('[ServiceWorker]: Service Workers are not supported in this browser');
            return undefined;
        }

        this._bindConnectivity();

        const scriptURL = config?.scriptURL ?? './serviceworker.js';
        const scope = config?.scope ?? './';

        try {
            const reg = await navigator.serviceWorker.register(scriptURL, { scope });
            this._registration = reg;
            console.log(`[ServiceWorker]: Registered "${scriptURL}" with scope "${reg.scope}"`);

            reg.addEventListener('updatefound', () => {
                const newWorker = reg.installing;
                if (!newWorker) return;
                console.log('[ServiceWorker]: New version installing...');
                newWorker.addEventListener('statechange', () => {
                    if (newWorker.state === 'activated') {
                        console.log('[ServiceWorker]: New version activated');
                    }
                });
            });

            // Wait for the controller to be available
            if (!navigator.serviceWorker.controller) {
                await new Promise<void>((resolve) => {
                    navigator.serviceWorker.addEventListener('controllerchange', () => resolve(), { once: true });
                });
            }

            return reg;
        } catch (err) {
            console.error('[ServiceWorker]: Registration failed', err);
            return undefined;
        }
    }

    // ── Helpers ─────────────────────────────────────────────────────
    private static _postMessage(msg: object): void {
        navigator.serviceWorker?.controller?.postMessage(msg);
    }

    private static _request<T>(msg: object): Promise<T> {
        return new Promise((resolve, reject) => {
            if (!navigator.serviceWorker?.controller) {
                reject('[ServiceWorker]: No active controller');
                return;
            }
            const mc = new MessageChannel();
            mc.port1.onmessage = (ev) => resolve(ev.data as T);
            navigator.serviceWorker.controller.postMessage(msg, [mc.port2]);
        });
    }

    // ── Cache Management ────────────────────────────────────────────

    /** Add a single URL to the SW cache. */
    static async addToCache(url: string): Promise<void> {
        if (navigator.serviceWorker?.controller) {
            this._postMessage({ type: 'CACHE_URL', url });
            return;
        }
        // Fallback: use Cache API directly
        try {
            const cache = await caches.open('purper-v1');
            const response = await fetch(url);
            if (response.ok) {
                await cache.put(url, response);
                console.log('[ServiceWorker]: Resource cached directly:', url);
            }
        } catch (e) {
            console.warn('[ServiceWorker]: Failed to cache resource:', url, e);
        }
    }

    /** Add multiple URLs to the SW cache in one batch. */
    static addAllToCache(urls: string[]): void {
        this._postMessage({ type: 'CACHE_URLS', urls });
    }

    /** Remove a URL from the SW cache. Returns true if it was found and deleted. */
    static async removeFromCache(url: string): Promise<boolean> {
        try {
            const data = await this._request<{ deleted: boolean }>({ type: 'REMOVE_URL', url });
            return data.deleted;
        } catch {
            // Fallback
            try {
                const cache = await caches.open('purper-v1');
                return await cache.delete(url);
            } catch {
                return false;
            }
        }
    }

    /** Return all URLs currently in the SW cache. */
    static async getCacheKeys(): Promise<string[]> {
        try {
            const data = await this._request<{ keys: string[] }>({ type: 'GET_CACHE_KEYS' });
            return data.keys;
        } catch {
            return [];
        }
    }

    /** Wipe the entire SW cache. */
    static async clearCache(): Promise<boolean> {
        try {
            const data = await this._request<{ cleared: boolean }>({ type: 'CLEAR_CACHE' });
            return data.cleared;
        } catch {
            return false;
        }
    }

    /** Check whether a URL exists in the SW cache. */
    static async isCached(url: string): Promise<boolean> {
        try {
            const data = await this._request<{ cached: boolean }>({ type: 'HAS_URL', url });
            return data.cached;
        } catch {
            // Fallback: CacheStorage directly
            try {
                return !!(await caches.match(url));
            } catch {
                return false;
            }
        }
    }

    // ── Version & lifecycle ─────────────────────────────────────────

    /** Ask the waiting SW to activate immediately. */
    static skipWaiting(): void {
        this._postMessage({ type: 'SKIP_WAITING' });
    }

    /** Get the version string from the running SW. */
    static async getVersion(): Promise<string> {
        const data = await this._request<{ version: string }>({ type: 'GET_VERSION' });
        return data.version;
    }

    // ── Connectivity ────────────────────────────────────────────────

    /**
     * Active connectivity probe — makes a real network request.
     * Unlike `online` observable (which relies on browser events), this
     * detects captive portals and lie-fi.
     */
    static async isOnline(probeURL?: string): Promise<boolean> {
        try {
            // Try SW-side probe first
            const data = await this._request<{ online: boolean }>({
                type: 'IS_ONLINE',
                url: probeURL ?? '/index.html'
            });
            this.online.setObject(data.online);
            return data.online;
        } catch {
            // Fallback: client-side probe
            try {
                const response = await fetch(probeURL ?? './index.html', { cache: 'no-store', method: 'HEAD' });
                const result = response.ok;
                this.online.setObject(result);
                return result;
            } catch {
                this.online.setObject(false);
                return false;
            }
        }
    }

    /** Current registration, if any. */
    static get registration(): ServiceWorkerRegistration | undefined {
        return this._registration;
    }

    // ── Fetch Tracking ──────────────────────────────────────────────

    static enableFetchTracking(): void {
        if (!this._fetchTrackingEnabled) {
            this._fetchTrackingEnabled = true;
            this._postMessage({ type: 'ENABLE_FETCH_TRACKING' });
            this._bindFetchListener();
        }
    }

    static disableFetchTracking(): void {
        if (this._fetchTrackingEnabled) {
            this._fetchTrackingEnabled = false;
            this._postMessage({ type: 'DISABLE_FETCH_TRACKING' });
        }
    }

    private static _bindFetchListener(): void {
        if (this._fetchListenerBound) return;
        this._fetchListenerBound = true;

        navigator.serviceWorker?.addEventListener('message', (event) => {
            const data = event.data;
            if (!data || !data.type) return;

            switch (data.type) {
                case 'FETCH_START': {
                    const item: FetchActivityItem = {
                        id: data.id,
                        url: data.url,
                        startTime: data.timestamp,
                        status: 'loading'
                    };
                    const current = [...this.fetchActivities.getObject()];
                    current.push(item);
                    this.fetchActivities.setObject(current);
                    break;
                }
                case 'FETCH_COMPLETE': {
                    const current = [...this.fetchActivities.getObject()];
                    const idx = current.findIndex(i => i.id === data.id);
                    if (idx !== -1) {
                        current[idx] = {
                            ...current[idx],
                            size: data.size,
                            duration: data.duration,
                            fromCache: data.fromCache,
                            status: 'complete'
                        };
                    }
                    this.fetchActivities.setObject(current);
                    setTimeout(() => {
                        const list = this.fetchActivities.getObject().filter(i => i.id !== data.id);
                        this.fetchActivities.setObject(list);
                    }, 3000);
                    break;
                }
                case 'FETCH_ERROR': {
                    const current = [...this.fetchActivities.getObject()];
                    const idx = current.findIndex(i => i.id === data.id);
                    if (idx !== -1) {
                        current[idx] = {
                            ...current[idx],
                            status: 'error',
                            error: data.error
                        };
                    }
                    this.fetchActivities.setObject(current);
                    setTimeout(() => {
                        const list = this.fetchActivities.getObject().filter(i => i.id !== data.id);
                        this.fetchActivities.setObject(list);
                    }, 5000);
                    break;
                }
                case 'PAGE_SOURCE': {
                    this.pageSource.setObject(data.source);
                    break;
                }
            }
        });
    }
}
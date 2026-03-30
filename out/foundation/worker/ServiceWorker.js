import Observable from "../api/Observer.js";
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
    static _registration;
    /** Observable connectivity state — subscribe for real-time changes. */
    static online = new Observable(navigator.onLine);
    // ── Connectivity listeners (bound once) ─────────────────────────
    static _connectivityBound = false;
    static _bindConnectivity() {
        if (this._connectivityBound)
            return;
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
    static async register(config) {
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
                if (!newWorker)
                    return;
                console.log('[ServiceWorker]: New version installing...');
                newWorker.addEventListener('statechange', () => {
                    if (newWorker.state === 'activated') {
                        console.log('[ServiceWorker]: New version activated');
                    }
                });
            });
            // Wait for the controller to be available
            if (!navigator.serviceWorker.controller) {
                await new Promise((resolve) => {
                    navigator.serviceWorker.addEventListener('controllerchange', () => resolve(), { once: true });
                });
            }
            return reg;
        }
        catch (err) {
            console.error('[ServiceWorker]: Registration failed', err);
            return undefined;
        }
    }
    // ── Helpers ─────────────────────────────────────────────────────
    static _postMessage(msg) {
        navigator.serviceWorker?.controller?.postMessage(msg);
    }
    static _request(msg) {
        return new Promise((resolve, reject) => {
            if (!navigator.serviceWorker?.controller) {
                reject('[ServiceWorker]: No active controller');
                return;
            }
            const mc = new MessageChannel();
            mc.port1.onmessage = (ev) => resolve(ev.data);
            navigator.serviceWorker.controller.postMessage(msg, [mc.port2]);
        });
    }
    // ── Cache Management ────────────────────────────────────────────
    /** Add a single URL to the SW cache. */
    static async addToCache(url) {
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
        }
        catch (e) {
            console.warn('[ServiceWorker]: Failed to cache resource:', url, e);
        }
    }
    /** Add multiple URLs to the SW cache in one batch. */
    static addAllToCache(urls) {
        this._postMessage({ type: 'CACHE_URLS', urls });
    }
    /** Remove a URL from the SW cache. Returns true if it was found and deleted. */
    static async removeFromCache(url) {
        try {
            const data = await this._request({ type: 'REMOVE_URL', url });
            return data.deleted;
        }
        catch {
            // Fallback
            try {
                const cache = await caches.open('purper-v1');
                return await cache.delete(url);
            }
            catch {
                return false;
            }
        }
    }
    /** Return all URLs currently in the SW cache. */
    static async getCacheKeys() {
        try {
            const data = await this._request({ type: 'GET_CACHE_KEYS' });
            return data.keys;
        }
        catch {
            return [];
        }
    }
    /** Wipe the entire SW cache. */
    static async clearCache() {
        try {
            const data = await this._request({ type: 'CLEAR_CACHE' });
            return data.cleared;
        }
        catch {
            return false;
        }
    }
    /** Check whether a URL exists in the SW cache. */
    static async isCached(url) {
        try {
            const data = await this._request({ type: 'HAS_URL', url });
            return data.cached;
        }
        catch {
            // Fallback: CacheStorage directly
            try {
                return !!(await caches.match(url));
            }
            catch {
                return false;
            }
        }
    }
    // ── Version & lifecycle ─────────────────────────────────────────
    /** Ask the waiting SW to activate immediately. */
    static skipWaiting() {
        this._postMessage({ type: 'SKIP_WAITING' });
    }
    /** Get the version string from the running SW. */
    static async getVersion() {
        const data = await this._request({ type: 'GET_VERSION' });
        return data.version;
    }
    // ── Connectivity ────────────────────────────────────────────────
    /**
     * Active connectivity probe — makes a real network request.
     * Unlike `online` observable (which relies on browser events), this
     * detects captive portals and lie-fi.
     */
    static async isOnline(probeURL) {
        try {
            // Try SW-side probe first
            const data = await this._request({
                type: 'IS_ONLINE',
                url: probeURL ?? '/index.html'
            });
            this.online.setObject(data.online);
            return data.online;
        }
        catch {
            // Fallback: client-side probe
            try {
                const response = await fetch(probeURL ?? './index.html', { cache: 'no-store', method: 'HEAD' });
                const result = response.ok;
                this.online.setObject(result);
                return result;
            }
            catch {
                this.online.setObject(false);
                return false;
            }
        }
    }
    /** Current registration, if any. */
    static get registration() {
        return this._registration;
    }
}
//# sourceMappingURL=ServiceWorker.js.map
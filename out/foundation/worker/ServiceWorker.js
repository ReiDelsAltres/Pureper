import Observable from "../api/Observer.js";
/**
 * Client-side Service Worker manager for Purper SPA.
 *
 * Provides:
 * - Registration with one call (`ServiceWorker.register()`)
 * - Connectivity detection with reactive `online` observable
 * - Fetch tracking for debug NetworkStatus component
 * - Version / lifecycle management
 *
 * Usage:
 * ```ts
 * await ServiceWorker.register();              // defaults to './serviceworker.js'
 * ServiceWorker.online.subscribe(v => console.log('online:', v));
 * ```
 */
export default class ServiceWorker {
    static _registration;
    /** Observable connectivity state — subscribe for real-time changes. */
    static online = new Observable(navigator.onLine);
    static fetchActivities = new Observable([]);
    static pageSource = new Observable('unknown');
    static _fetchTrackingEnabled = false;
    static _fetchListenerBound = false;
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
    // ── Fetch Tracking ──────────────────────────────────────────────
    static enableFetchTracking() {
        if (!this._fetchTrackingEnabled) {
            this._fetchTrackingEnabled = true;
            this._postMessage({ type: 'ENABLE_FETCH_TRACKING' });
            this._bindFetchListener();
        }
    }
    static disableFetchTracking() {
        if (this._fetchTrackingEnabled) {
            this._fetchTrackingEnabled = false;
            this._postMessage({ type: 'DISABLE_FETCH_TRACKING' });
        }
    }
    static _bindFetchListener() {
        if (this._fetchListenerBound)
            return;
        this._fetchListenerBound = true;
        navigator.serviceWorker?.addEventListener('message', (event) => {
            const data = event.data;
            if (!data || !data.type)
                return;
            switch (data.type) {
                case 'FETCH_START': {
                    const item = {
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
//# sourceMappingURL=ServiceWorker.js.map
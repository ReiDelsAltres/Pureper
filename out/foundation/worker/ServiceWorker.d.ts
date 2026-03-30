import Observable from "../api/Observer.js";
export type ServiceWorkerConfig = {
    scriptURL?: string;
    scope?: string;
};
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
    private static _registration?;
    /** Observable connectivity state — subscribe for real-time changes. */
    static readonly online: Observable<boolean>;
    private static _connectivityBound;
    private static _bindConnectivity;
    static register(config?: ServiceWorkerConfig): Promise<ServiceWorkerRegistration | undefined>;
    private static _postMessage;
    private static _request;
    /** Add a single URL to the SW cache. */
    static addToCache(url: string): Promise<void>;
    /** Add multiple URLs to the SW cache in one batch. */
    static addAllToCache(urls: string[]): void;
    /** Remove a URL from the SW cache. Returns true if it was found and deleted. */
    static removeFromCache(url: string): Promise<boolean>;
    /** Return all URLs currently in the SW cache. */
    static getCacheKeys(): Promise<string[]>;
    /** Wipe the entire SW cache. */
    static clearCache(): Promise<boolean>;
    /** Check whether a URL exists in the SW cache. */
    static isCached(url: string): Promise<boolean>;
    /** Ask the waiting SW to activate immediately. */
    static skipWaiting(): void;
    /** Get the version string from the running SW. */
    static getVersion(): Promise<string>;
    /**
     * Active connectivity probe — makes a real network request.
     * Unlike `online` observable (which relies on browser events), this
     * detects captive portals and lie-fi.
     */
    static isOnline(probeURL?: string): Promise<boolean>;
    /** Current registration, if any. */
    static get registration(): ServiceWorkerRegistration | undefined;
}
//# sourceMappingURL=ServiceWorker.d.ts.map
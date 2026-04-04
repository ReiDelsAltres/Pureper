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
    private static _registration?;
    /** Observable connectivity state — subscribe for real-time changes. */
    static readonly online: Observable<boolean>;
    static readonly fetchActivities: Observable<FetchActivityItem[]>;
    static readonly pageSource: Observable<PageSourceType>;
    private static _fetchTrackingEnabled;
    private static _fetchListenerBound;
    private static _connectivityBound;
    private static _bindConnectivity;
    static register(config?: ServiceWorkerConfig): Promise<ServiceWorkerRegistration | undefined>;
    private static _postMessage;
    private static _request;
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
    static enableFetchTracking(): void;
    static disableFetchTracking(): void;
    private static _bindFetchListener;
}
//# sourceMappingURL=ServiceWorker.d.ts.map
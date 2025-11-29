export default class ServiceWorker {
    /**
     * Sends a message to the service worker to cache a specific URL.
     * @param url The URL of the resource to cache.
     */
    static addToCache(url: string): Promise<void>;
    /**
     * Asks the service worker to skip waiting and activate the new version.
     */
    static skipWaiting(): void;
    /**
     * Gets the version of the currently active service worker.
     * @returns A promise that resolves with the version string.
     */
    static getVersion(): Promise<string>;
    /**
     * Checks if the given URL is present in the Service Worker's cache.
     */
    static isCached(url: string): Promise<boolean>;
    /**
     * Checks if the browser is online.
     */
    static isOnline(): Promise<boolean>;
}
//# sourceMappingURL=ServiceWorker.d.ts.map
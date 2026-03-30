import { HOSTING_ORIGIN } from "./Hosting.js";

// keep in-flight promises to deduplicate concurrent identical requests
const inFlightText: Map<string, Promise<string>> = new Map();
const inFlightJSON: Map<string, Promise<any>> = new Map();
export default class Fetcher {
    static async fetchText(url: string): Promise<string> {
        const resolved = this.resolveUrl(url);

        // If a request for the same URL is already in-flight, reuse its promise
        if (inFlightText.has(resolved)) return inFlightText.get(resolved)!;

        const p = (async () => {
            const response = await this.internalFetch(resolved);
            return response.text();
        })();

        inFlightText.set(resolved, p);
        p.finally(() => inFlightText.delete(resolved));

        return p;
    }
    static async fetchJSON(url: string): Promise<any> {
        const resolved = this.resolveUrl(url);

        // If a request for the same URL is already in-flight, reuse its promise
        if (inFlightJSON.has(resolved)) return inFlightJSON.get(resolved)!;

        const p = (async () => {
            const response = await this.internalFetch(resolved);
            return response.json();
        })();

        inFlightJSON.set(resolved, p);
        p.finally(() => inFlightJSON.delete(resolved));
        return p;
    }

    public static resolveUrl(url: string): string {
        const trimmed = url.trim();

        // Absolute (scheme) URLs: http:, https:, data:, blob:, file:, etc.
        if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed)) return trimmed;

        // Protocol-relative URL
        if (trimmed.startsWith("//")) return `${window.location.protocol}${trimmed}`;

        // App-root absolute path ("/foo"). We treat it as *hosting-root relative*, not origin-root.
        if (trimmed.startsWith("/")) return `${HOSTING_ORIGIN}${trimmed}`;

        // Relative path: resolve against hosting root.
        // (If the project needs a subfolder root, set <base href="/subfolder/"> so HOSTING/HOSTING_ORIGIN reflect it.)
        return new URL(trimmed, `${HOSTING_ORIGIN}/`).href;
    }

    private static async internalFetch(resolvedUrl: string): Promise<Response> {
        // L2: check ServiceWorker CacheStorage before hitting the network
        if ('caches' in window) {
            const cached = await caches.match(resolvedUrl);
            if (cached) return cached;
        }

        const response = await fetch(resolvedUrl, { cache: 'default' });
        if (!response.ok) {
            throw new Error(`HTTP error! ${resolvedUrl} status: ${response.status}`);
        }
        return response;
    }
}
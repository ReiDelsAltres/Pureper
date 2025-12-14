import { HOSTING, HOSTING_ORIGIN } from "./Hosting.js";

// cache stores response bodies (text) by resolved URL so we can reuse them safely
const temporaryCache: Map<string, string> = new Map();
// keep in-flight promises to deduplicate concurrent identical requests
const inFlightText: Map<string, Promise<string>> = new Map();
const inFlightJSON: Map<string, Promise<any>> = new Map();
export default class Fetcher {
    static async fetchText(url: string): Promise<string> {
        const resolved = this.resolveUrl(url);
        if (temporaryCache.has(resolved)) 
            return temporaryCache.get(resolved)!;

        // If a request for the same URL is already in-flight, reuse its promise
        if (inFlightText.has(resolved)) return inFlightText.get(resolved)!;

        const p = (async () => {
            const response = await this.internalFetch(resolved);
            const text = await response.text();
            temporaryCache.set(resolved, text);
            return text;
        })();

        inFlightText.set(resolved, p);
        // cleanup entry when finished
        p.finally(() => inFlightText.delete(resolved));

        return p;
    }
    static async fetchJSON(url: string): Promise<any> {
        const resolved = this.resolveUrl(url);
        if (temporaryCache.has(resolved))
            return JSON.parse(temporaryCache.get(resolved)!);

        // If a request for the same URL is already in-flight, reuse its promise
        if (inFlightJSON.has(resolved)) return inFlightJSON.get(resolved)!;

        const p = (async () => {
            const response = await this.internalFetch(resolved);
            const json = await response.json();
            temporaryCache.set(resolved, JSON.stringify(json));
            return json;
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
        const response = await fetch(resolvedUrl, { cache: 'default' });
        if (!response.ok) {
            throw new Error(`HTTP error! ${resolvedUrl} status: ${response.status}`);
        }
        return response;
    }
}
import { HOSTING, HOSTING_ORIGIN } from "../index.js";

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
            try { temporaryCache.set(resolved, text); } catch {}
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
            try { temporaryCache.set(resolved, JSON.stringify(json)); } catch {}
            return json;
        })();

        inFlightJSON.set(resolved, p);
        p.finally(() => inFlightJSON.delete(resolved));
        return p;
    }

    private static resolveUrl(url: string): string {
        const urlObj = new URL(url, HOSTING_ORIGIN);
        if (!urlObj.href.includes(HOSTING)) {
            return urlObj.origin + HOSTING + urlObj.pathname;
        }
        return urlObj.href;
    }

    private static async internalFetch(resolvedUrl: string): Promise<Response> {
        const response = await fetch(resolvedUrl, { cache: 'default' });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response;
    }
}
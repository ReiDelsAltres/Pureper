import { HOSTING, HOSTING_ORIGIN } from "../index.js";
// cache stores response bodies (text) by resolved URL so we can reuse them safely
const temporaryCache = new Map();
// keep in-flight promises to deduplicate concurrent identical requests
const inFlightText = new Map();
const inFlightJSON = new Map();
export default class Fetcher {
    static async fetchText(url) {
        const resolved = this.resolveUrl(url);
        if (temporaryCache.has(resolved))
            return temporaryCache.get(resolved);
        // If a request for the same URL is already in-flight, reuse its promise
        if (inFlightText.has(resolved))
            return inFlightText.get(resolved);
        const p = (async () => {
            const response = await this.internalFetch(resolved);
            const text = await response.text();
            try {
                temporaryCache.set(resolved, text);
            }
            catch { }
            return text;
        })();
        inFlightText.set(resolved, p);
        // cleanup entry when finished
        p.finally(() => inFlightText.delete(resolved));
        return p;
    }
    static async fetchJSON(url) {
        const resolved = this.resolveUrl(url);
        if (temporaryCache.has(resolved))
            return JSON.parse(temporaryCache.get(resolved));
        // If a request for the same URL is already in-flight, reuse its promise
        if (inFlightJSON.has(resolved))
            return inFlightJSON.get(resolved);
        const p = (async () => {
            const response = await this.internalFetch(resolved);
            const json = await response.json();
            try {
                temporaryCache.set(resolved, JSON.stringify(json));
            }
            catch { }
            return json;
        })();
        inFlightJSON.set(resolved, p);
        p.finally(() => inFlightJSON.delete(resolved));
        return p;
    }
    static resolveUrl(url) {
        const urlObj = new URL(url, HOSTING_ORIGIN);
        if (!urlObj.href.includes(HOSTING)) {
            return urlObj.origin + HOSTING + urlObj.pathname;
        }
        return urlObj.href;
    }
    static async internalFetch(resolvedUrl) {
        const response = await fetch(resolvedUrl, { cache: 'default' });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response;
    }
}
//# sourceMappingURL=Fetcher.js.map
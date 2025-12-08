import { HOSTING, HOSTING_ORIGIN } from "../index.js";

// cache stores response bodies (text) by resolved URL so we can reuse them safely
const temporaryCache: Map<string, string> = new Map();
export default class Fetcher {
    static async fetchText(url: string): Promise<string> {
        const resolved = this.resolveUrl(url);
        if (temporaryCache.has(resolved)) 
            return temporaryCache.get(resolved)!;

        const response = await this.internalFetch(resolved);
        const text = await response.text();
        temporaryCache.set(resolved, text);
        return text;
    }
    static async fetchJSON(url: string): Promise<any> {
        const resolved = this.resolveUrl(url);
        if (temporaryCache.has(resolved))
            return JSON.parse(temporaryCache.get(resolved)!);

        const response = await this.internalFetch(resolved);
        const json = await response.json();
        temporaryCache.set(resolved, JSON.stringify(json));
        return json;
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
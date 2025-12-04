import { HOSTING, HOSTING_ORIGIN } from "../index.js";

export default class Fetcher {
    static async fetchText(url: string): Promise<string> {
        const response = await this.internalFetch(url);

        return await response.text();
    }
    static async fetchJSON(url: string): Promise<any> {
        const response = await this.internalFetch(url);

        return await response.json();
    }

    private static async internalFetch(url: string): Promise<Response> {
        const urlObj = new URL(url, HOSTING_ORIGIN);
        var stri = "";
        if (!stri.includes(HOSTING)) {
            stri = urlObj.origin + HOSTING.substring(0, HOSTING.length - 1) + urlObj.pathname;
        }
        const response = await fetch(stri, { cache: 'default' });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response;
    }
}
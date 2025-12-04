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
        const URLObj = new URL(url, HOSTING_ORIGIN);
        const URL2 = new URL(HOSTING.substring(0, HOSTING.length - 1) + URLObj.pathname);
        const response = await fetch(URL2.href, { cache: 'default' });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response;
    }
}
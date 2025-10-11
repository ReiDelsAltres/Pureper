import { Host } from "./worker/Host.js";

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
        if (url.includes(Host.getHostPrefix())) {
            url = url.replace(Host.getHostPrefix(), '');
        }
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response;
    }
}
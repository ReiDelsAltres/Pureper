export default class Fetcher {
    static async fetchText(url) {
        const response = await this.internalFetch(url);
        return await response.text();
    }
    static async fetchJSON(url) {
        const response = await this.internalFetch(url);
        return await response.json();
    }
    static async internalFetch(url) {
        const response = await fetch(url, { cache: 'default' });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response;
    }
}
//# sourceMappingURL=Fetcher.js.map
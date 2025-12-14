export default class Fetcher {
    static fetchText(url: string): Promise<string>;
    static fetchJSON(url: string): Promise<any>;
    static resolveUrl(url: string): string;
    private static internalFetch;
}
//# sourceMappingURL=Fetcher.d.ts.map
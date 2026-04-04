import Observable from "./api/Observer.js";
export type DownloadProgress = {
    totalFiles: number;
    completedFiles: number;
    currentFile: string;
    totalBytes: number;
    downloadedBytes: number;
    speed: number;
    active: boolean;
};
export default class CacheManager {
    private static readonly CACHE_NAME;
    static resolveUrl(url: string): string;
    static download(urls: string[], progress?: Observable<DownloadProgress>): Promise<number>;
    static delete(urls: string[]): Promise<void>;
    static isCached(url: string): Promise<boolean>;
    static getCachedSize(urls: string[]): Promise<number>;
    static formatBytes(bytes: number): string;
}
//# sourceMappingURL=CacheManager.d.ts.map
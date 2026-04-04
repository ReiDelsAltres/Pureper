import Fetcher from "./Fetcher.js";
export default class CacheManager {
    static CACHE_NAME = 'purper-modules';
    static resolveUrl(url) {
        return Fetcher.resolveUrl(url);
    }
    static async download(urls, progress) {
        if (urls.length === 0)
            return 0;
        const totalFiles = urls.length;
        let completedFiles = 0;
        let downloadedBytes = 0;
        let totalBytes = 0;
        let lastTime = performance.now();
        let lastBytes = 0;
        let speed = 0;
        const update = (currentFile, active) => {
            progress?.setObject({ totalFiles, completedFiles, currentFile, totalBytes, downloadedBytes, speed, active });
        };
        // Estimate total size via HEAD
        const sizes = await Promise.all(urls.map(async (url) => {
            try {
                const resp = await fetch(this.resolveUrl(url), { method: 'HEAD' });
                const cl = resp.headers.get('content-length');
                return cl ? parseInt(cl, 10) : 0;
            }
            catch {
                return 0;
            }
        }));
        totalBytes = sizes.reduce((a, b) => a + b, 0);
        update('', true);
        const failedFiles = [];
        for (const url of urls) {
            const resolved = this.resolveUrl(url);
            const fileName = url.split('/').pop() || url;
            update(fileName, true);
            try {
                const response = await fetch(resolved);
                if (!response.ok) {
                    console.warn(`[CacheManager]: Failed to download ${url}: ${response.status}`);
                    failedFiles.push(url);
                    completedFiles++;
                    continue;
                }
                const reader = response.body?.getReader();
                const chunks = [];
                if (reader) {
                    while (true) {
                        const { done, value } = await reader.read();
                        if (done)
                            break;
                        chunks.push(value);
                        downloadedBytes += value.byteLength;
                        const now = performance.now();
                        const elapsed = (now - lastTime) / 1000;
                        if (elapsed >= 0.5) {
                            speed = (downloadedBytes - lastBytes) / elapsed;
                            lastTime = now;
                            lastBytes = downloadedBytes;
                        }
                        update(fileName, true);
                    }
                }
                if ('caches' in window) {
                    try {
                        const cache = await caches.open(this.CACHE_NAME);
                        const blob = new Blob(chunks);
                        const cacheResponse = new Response(blob, { headers: response.headers });
                        await cache.put(resolved, cacheResponse);
                    }
                    catch (e) {
                        console.warn(`[CacheManager]: Failed to cache ${url}`, e);
                    }
                }
                completedFiles++;
            }
            catch (e) {
                console.warn(`[CacheManager]: Error downloading ${url}`, e);
                failedFiles.push(url);
                completedFiles++;
            }
        }
        speed = 0;
        update('', false);
        if (failedFiles.length > 0) {
            throw new Error(`[CacheManager]: ${failedFiles.length} file(s) failed to download: ${failedFiles.join(', ')}`);
        }
        return downloadedBytes;
    }
    static async delete(urls) {
        if (!('caches' in window) || urls.length === 0)
            return;
        const cache = await caches.open(this.CACHE_NAME);
        for (const url of urls) {
            await cache.delete(this.resolveUrl(url));
        }
    }
    static async isCached(url) {
        if (!('caches' in window))
            return false;
        const cache = await caches.open(this.CACHE_NAME);
        const match = await cache.match(this.resolveUrl(url));
        return match !== undefined;
    }
    static async getCachedSize(urls) {
        if (!('caches' in window) || urls.length === 0)
            return 0;
        const cache = await caches.open(this.CACHE_NAME);
        let total = 0;
        for (const url of urls) {
            const match = await cache.match(this.resolveUrl(url));
            if (match) {
                const blob = await match.blob();
                total += blob.size;
            }
        }
        return total;
    }
    static formatBytes(bytes) {
        if (bytes === 0)
            return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }
}
//# sourceMappingURL=CacheManager.js.map
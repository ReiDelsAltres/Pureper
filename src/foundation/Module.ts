import Observable from "./api/Observer.js";
import { REGISTRY } from "./Triplet.js";

export type ModuleStruct = {
    name: string;
    description?: string;
    icon?: string;
    core?: boolean;
    enabled?: boolean;
    resources?: string[];
};

export type ModuleDownloadProgress = {
    /** Total number of resources */
    totalFiles: number;
    /** Number of resources downloaded so far */
    downloadedFiles: number;
    /** Current file being downloaded */
    currentFile: string;
    /** Total bytes across all resources (estimated) */
    totalBytes: number;
    /** Bytes downloaded so far */
    downloadedBytes: number;
    /** Download speed in bytes/sec */
    speed: number;
    /** Whether download is in progress */
    active: boolean;
};

export default class Module {
    public readonly name: string;
    public readonly description?: string;
    public readonly icon?: string;
    public readonly core: boolean;
    public readonly enabled: Observable<boolean>;
    public readonly downloaded: Observable<boolean>;
    public readonly resources: string[];
    public readonly totalSize: Observable<number>;
    public readonly downloadProgress: Observable<ModuleDownloadProgress>;

    private _registrations: (() => Promise<void>)[] = [];

    public constructor(struct: ModuleStruct) {
        this.name = struct.name;
        this.description = struct.description;
        this.icon = struct.icon;
        this.core = struct.core ?? false;
        this.enabled = new Observable<boolean>(this.core ? true : (struct.enabled ?? false));
        this.downloaded = new Observable<boolean>(this.core ? true : false);
        this.resources = struct.resources ?? [];
        this.totalSize = new Observable<number>(0);
        this.downloadProgress = new Observable<ModuleDownloadProgress>({
            totalFiles: 0, downloadedFiles: 0, currentFile: '',
            totalBytes: 0, downloadedBytes: 0, speed: 0, active: false
        });
    }

    public addRegistration(fn: () => Promise<void>): void {
        this._registrations.push(fn);
    }

    public getRegistrations(): ReadonlyArray<() => Promise<void>> {
        return this._registrations;
    }

    /**
     * Takes current entries from the global REGISTRY, moves them into this
     * module's internal list, and removes them from REGISTRY.
     *
     * Call this in consumer code AFTER importing the module's components so
     * that all their REGISTRY entries have been pushed.
     */
    public captureRegistrations(registry: (() => Promise<void>)[]): void {
        const captured = registry.splice(0, registry.length);
        this._registrations.push(...captured);
        console.log(`[Module]: "${this.name}" captured ${captured.length} registration(s)`);
    }

    public enable(): void {
        if (this.enabled.getObject() === true) return;
        this.enabled.setObject(true);
        console.log(`[Module]: "${this.name}" enabled`);
    }

    public disable(): void {
        if (this.core) {
            throw new Error(`[Module]: Cannot disable core module "${this.name}"`);
        }
        if (this.enabled.getObject() === false) return;
        this.enabled.setObject(false);
        console.log(`[Module]: "${this.name}" disabled`);
    }

    public isActive(): boolean {
        return this.enabled.getObject() === true;
    }

    /** True if enabled but not downloaded — works only in the current session. */
    public get ephemeral(): boolean {
        return this.isActive() && !this.downloaded.getObject();
    }

    /**
     * Download all module resources with progress tracking.
     * Uses fetch to download each resource and tracks progress.
     */
    public async download(): Promise<void> {
        if (this.downloaded.getObject()) return;
        if (this.resources.length === 0) {
            // No resources to download — just mark as downloaded
            this.downloaded.setObject(true);
            console.log(`[Module]: "${this.name}" downloaded (no resources)`);
            return;
        }

        const resolveUrl = (url: string): string => {
            const trimmed = url.trim();
            if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed)) return trimmed;
            if (trimmed.startsWith("//")) return `${window.location.protocol}${trimmed}`;
            return new URL(trimmed, document.baseURI).href;
        };

        const totalFiles = this.resources.length;
        let downloadedFiles = 0;
        let downloadedBytes = 0;
        let totalBytes = 0;
        let lastTime = performance.now();
        let lastBytes = 0;
        let speed = 0;

        // First, try to estimate total size with HEAD requests
        const headPromises = this.resources.map(async (url) => {
            try {
                const resolved = resolveUrl(url);
                const resp = await fetch(resolved, { method: 'HEAD' });
                const cl = resp.headers.get('content-length');
                return cl ? parseInt(cl, 10) : 0;
            } catch {
                return 0;
            }
        });

        const sizes = await Promise.all(headPromises);
        totalBytes = sizes.reduce((a, b) => a + b, 0);
        this.totalSize.setObject(totalBytes);

        this.downloadProgress.setObject({
            totalFiles, downloadedFiles: 0, currentFile: '',
            totalBytes, downloadedBytes: 0, speed: 0, active: true
        });

        console.log(`[Module]: Starting download of "${this.name}" (${totalFiles} files, ~${this.formatBytes(totalBytes)})`);

        for (let i = 0; i < this.resources.length; i++) {
            const url = this.resources[i];
            const resolved = resolveUrl(url);
            const fileName = url.split('/').pop() || url;

            this.downloadProgress.setObject({
                totalFiles, downloadedFiles, currentFile: fileName,
                totalBytes, downloadedBytes, speed, active: true
            });

            try {
                const response = await fetch(resolved);
                if (!response.ok) {
                    console.warn(`[Module]: Failed to download ${url}: ${response.status}`);
                    downloadedFiles++;
                    continue;
                }

                // Read with progress tracking
                const reader = response.body?.getReader();
                const chunks: BlobPart[] = [];

                if (reader) {
                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) break;
                        chunks.push(value);
                        downloadedBytes += value.byteLength;

                        // Calculate speed
                        const now = performance.now();
                        const elapsed = (now - lastTime) / 1000;
                        if (elapsed >= 0.5) {
                            speed = (downloadedBytes - lastBytes) / elapsed;
                            lastTime = now;
                            lastBytes = downloadedBytes;
                        }

                        this.downloadProgress.setObject({
                            totalFiles, downloadedFiles, currentFile: fileName,
                            totalBytes, downloadedBytes, speed, active: true
                        });
                    }
                }

                // Cache the resource
                if ('caches' in window) {
                    try {
                        const cache = await caches.open('purper-modules');
                        const blob = new Blob(chunks);
                        const cacheResponse = new Response(blob, {
                            headers: response.headers
                        });
                        await cache.put(resolved, cacheResponse);
                    } catch (e) {
                        console.warn(`[Module]: Failed to cache ${url}`, e);
                    }
                }

                downloadedFiles++;
            } catch (e) {
                console.warn(`[Module]: Error downloading ${url}`, e);
                downloadedFiles++;
            }
        }

        this.downloadProgress.setObject({
            totalFiles, downloadedFiles, currentFile: '',
            totalBytes, downloadedBytes, speed: 0, active: false
        });

        this.downloaded.setObject(true);
        console.log(`[Module]: "${this.name}" downloaded (${downloadedFiles}/${totalFiles} files, ${this.formatBytes(downloadedBytes)})`);
    }

    public formatBytes(bytes: number): string {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }

    public async undownload(): Promise<void> {
        if (this.core) {
            throw new Error(`[Module]: Cannot remove core module "${this.name}" from downloads`);
        }

        // Remove cached resources
        if ('caches' in window && this.resources.length > 0) {
            try {
                const cache = await caches.open('purper-modules');
                const resolveUrl = (url: string): string => {
                    const trimmed = url.trim();
                    if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed)) return trimmed;
                    if (trimmed.startsWith("//")) return `${window.location.protocol}${trimmed}`;
                    return new URL(trimmed, document.baseURI).href;
                };
                for (const url of this.resources) {
                    await cache.delete(resolveUrl(url));
                }
                console.log(`[Module]: Cleared cache for "${this.name}"`);
            } catch (e) {
                console.warn(`[Module]: Failed to clear cache for "${this.name}"`, e);
            }
        }

        this.downloaded.setObject(false);
        this.totalSize.setObject(0);
        console.log(`[Module]: "${this.name}" removed from downloads`);
    }
}

export class ModuleManager {
    private static _modules: Map<string, Module> = new Map();
    private static readonly STORAGE_KEY = "purper:modules";
    private static readonly SESSION_KEY = "purper:modules:session";

    static register(struct: ModuleStruct): Module {
        if (this._modules.has(struct.name)) {
            throw new Error(`[Module]: Module "${struct.name}" is already registered`);
        }
        const mod = new Module(struct);
        this._modules.set(struct.name, mod);
        console.log(`[Module]: Registered module "${struct.name}"`);
        return mod;
    }

    static get(name: string): Module | undefined {
        return this._modules.get(name);
    }

    static getAll(): Module[] {
        return Array.from(this._modules.values());
    }

    static isActive(name: string): boolean {
        const mod = this._modules.get(name);
        return mod ? mod.isActive() : false;
    }

    /**
     * Initializes all modules:
     * 1. Restores saved enabled/disabled preferences
     * 2. Runs registrations from all enabled modules
     * 3. Runs any remaining global REGISTRY entries (backward compat)
     * 4. Returns all promises
     */
    static initialize(): Promise<void>[] {
        this.restoreState();

        const promises: Promise<void>[] = [];

        for (const mod of this._modules.values()) {
            if (mod.isActive()) {
                console.log(`[Module]: Initializing module "${mod.name}" (${mod.getRegistrations().length} registration(s))`);
                for (const reg of mod.getRegistrations()) {
                    promises.push(reg());
                }
            } else {
                console.log(`[Module]: Skipping disabled module "${mod.name}"`);
            }
        }

        // Backward compat: run any remaining global REGISTRY entries
        // that were not captured by any module
        if (REGISTRY.length > 0) {
            console.log(`[Module]: Running ${REGISTRY.length} uncaptured global registration(s)`);
            for (const reg of REGISTRY) {
                promises.push(reg());
            }
        }

        return promises;
    }

    static persistState(): void {
        const localState: Record<string, { enabled: boolean, downloaded: boolean }> = {};
        const sessionState: Record<string, { enabled: boolean }> = {};

        for (const mod of this._modules.values()) {
            if (mod.core) continue;

            if (mod.downloaded.getObject()) {
                localState[mod.name] = { enabled: mod.isActive(), downloaded: true };
            } else if (mod.isActive()) {
                sessionState[mod.name] = { enabled: true };
            }
        }

        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(localState));
            sessionStorage.setItem(this.SESSION_KEY, JSON.stringify(sessionState));
            console.log(`[Module]: Persisted module state`);
        } catch (e) {
            console.warn(`[Module]: Failed to persist module state`, e);
        }
    }

    static restoreState(): void {
        // Restore from localStorage (downloaded modules)
        try {
            const raw = localStorage.getItem(this.STORAGE_KEY);
            if (raw) {
                const state: Record<string, { enabled: boolean, downloaded: boolean } | boolean> = JSON.parse(raw);
                for (const [name, data] of Object.entries(state)) {
                    const mod = this._modules.get(name);
                    if (mod && !mod.core) {
                        if (typeof data === 'boolean') {
                            // Old format: value is just a boolean for enabled state
                            mod.enabled.setObject(data);
                            console.log(`[Module]: Migrated old format "${name}" → enabled=${data}`);
                            continue;
                        }
                        if (data.downloaded) {
                            mod.downloaded.setObject(true);
                        }
                        mod.enabled.setObject(data.enabled);
                        console.log(`[Module]: Restored "${name}" → downloaded=${data.downloaded}, enabled=${data.enabled}`);
                    }
                }
            }
        } catch (e) {
            console.warn(`[Module]: Failed to restore localStorage state`, e);
        }

        // Restore from sessionStorage (ephemeral modules)
        try {
            const raw = sessionStorage.getItem(this.SESSION_KEY);
            if (raw) {
                const state: Record<string, { enabled: boolean }> = JSON.parse(raw);
                for (const [name, data] of Object.entries(state)) {
                    const mod = this._modules.get(name);
                    if (mod && !mod.core && !mod.downloaded.getObject()) {
                        mod.enabled.setObject(data.enabled);
                        console.log(`[Module]: Restored ephemeral "${name}" → enabled=${data.enabled}`);
                    }
                }
            }
        } catch (e) {
            console.warn(`[Module]: Failed to restore sessionStorage state`, e);
        }
    }
}

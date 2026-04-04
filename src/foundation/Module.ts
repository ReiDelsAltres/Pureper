import Observable from "./api/Observer.js";
import { Placeholder } from "./Injection.js";
import { REGISTRY, RegistryCapture } from "./Triplet.js";
import CacheManager, { DownloadProgress } from "./CacheManager.js";

export type SubModuleStruct = {
    name: string;
    description?: string;
    inbuilt?: boolean;
    resources?: string[];
};

export type ModuleStruct = {
    name: string;
    description?: string;
    icon?: string;
    core?: boolean;
    enabled?: boolean;
    resources?: string[];
    subModules?: SubModuleStruct[];
};

export default class Module extends Observable<boolean> {
    public readonly name: string;
    public readonly description?: string;
    public readonly icon?: string;
    public readonly core: boolean;
    public readonly downloaded: Observable<boolean>;
    public readonly resources: string[];
    public readonly totalSize: Observable<number>;
    public readonly downloadProgress: Observable<DownloadProgress>;
    public readonly downloadError: Observable<string>;

    private _registrations: (() => Promise<void>)[] = [];
    private _placeholderNames: string[] = [];
    private _initialized: boolean = false;
    private _subModules: SubModule[] = [];
    private static _claimedPlaceholders = new Set<string>();

    public get enabled(): Observable<boolean> {
        return this;
    }

    public constructor(struct: ModuleStruct) {
        super(struct.core ? true : (struct.enabled ?? false));
        this.name = struct.name;
        this.description = struct.description;
        this.icon = struct.icon;
        this.core = struct.core ?? false;
        this.downloaded = new Observable<boolean>(false);
        this.resources = struct.resources ?? [];
        this.totalSize = new Observable<number>(0);
        this.downloadProgress = new Observable<DownloadProgress>({
            totalFiles: 0, completedFiles: 0, currentFile: '',
            totalBytes: 0, downloadedBytes: 0, speed: 0, active: false
        });
        this.downloadError = new Observable<string>('');

        if (struct.subModules) {
            for (const sub of struct.subModules) {
                this.addSubModule(sub);
            }
        }
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

        // Discover placeholder names created by this module's imports
        for (const name of Placeholder.getAllNames()) {
            if (!Module._claimedPlaceholders.has(name)) {
                Module._claimedPlaceholders.add(name);
                this._placeholderNames.push(name);
            }
        }

        console.log(`[Module]: "${this.name}" captured ${captured.length} registration(s), ${this._placeholderNames.length} placeholder(s)`);

        const capturedResources = RegistryCapture.drain();
        if (capturedResources.length > 0) {
            this.resources.push(...capturedResources);
            console.log(`[Module]: "${this.name}" auto-captured ${capturedResources.length} resource path(s)`);
        }
    }

    public addPlaceholder(name: string): void {
        this._placeholderNames.push(name);
    }

    public getPlaceholderNames(): ReadonlyArray<string> {
        return this._placeholderNames;
    }

    public markInitialized(): void {
        this._initialized = true;
    }

    public async enable(): Promise<void> {
        if (this.getObject() === true) return;
        this.setObject(true);

        if (!this._initialized) {
            this._initialized = true;
            // Snapshot existing placeholders before running registrations
            const before = new Set(Placeholder.getAllNames());
            for (const reg of this._registrations) {
                await reg();
            }
            // Discover which placeholders were added by this module
            for (const name of Placeholder.getAllNames()) {
                if (!before.has(name)) {
                    this._placeholderNames.push(name);
                }
            }
        } else {
            // Re-activate previously registered placeholders
            for (const name of this._placeholderNames) {
                Placeholder.activate(name);
            }
        }

        console.log(`[Module]: "${this.name}" enabled`);
    }

    public disable(): void {
        if (this.core) {
            throw new Error(`[Module]: Cannot disable core module "${this.name}"`);
        }
        if (this.getObject() === false) return;
        this.setObject(false);

        // Deactivate placeholders
        for (const name of this._placeholderNames) {
            Placeholder.deactivate(name);
        }

        console.log(`[Module]: "${this.name}" disabled`);
    }

    public isActive(): boolean {
        return this.getObject() === true;
    }

    /** True if enabled but not downloaded — works only in the current session. */
    public get ephemeral(): boolean {
        return this.isActive() && !this.downloaded.getObject();
    }

    public async download(): Promise<void> {
        if (this.downloaded.getObject()) return;
        this.downloadError.setObject('');

        const hasInbuiltSubs = this._subModules.some(s => s.inbuilt && !s.downloaded.getObject() && s.resources.length > 0);
        if (this.resources.length === 0 && !hasInbuiltSubs) {
            this.downloaded.setObject(true);
            console.log(`[Module]: "${this.name}" downloaded (no resources)`);
            return;
        }

        try {
            // Download module's own resources
            let totalBytes = await CacheManager.download(this.resources, this.downloadProgress);

            // Also download all inbuilt sub-modules
            for (const sub of this._subModules) {
                if (sub.inbuilt && !sub.downloaded.getObject()) {
                    const subBytes = await CacheManager.download(sub.resources, this.downloadProgress);
                    sub.totalSize.setObject(subBytes);
                    sub.downloaded.setObject(true);
                    totalBytes += subBytes;
                }
            }

            this.totalSize.setObject(totalBytes);
            this.downloaded.setObject(true);
            // Clear ephemeral flag if re-downloaded
            ModuleManager.clearEphemeralCore(this.name);
            console.log(`[Module]: "${this.name}" downloaded (${this.resources.length} files, ${CacheManager.formatBytes(totalBytes)})`);
        } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            this.downloadError.setObject(msg);
            console.error(`[Module]: "${this.name}" download failed:`, msg);
        }
    }

    public formatBytes(bytes: number): string {
        return CacheManager.formatBytes(bytes);
    }

    public async undownload(): Promise<void> {
        this.downloadError.setObject('');
        await CacheManager.delete(this.resources);

        // Also undownload all sub-modules
        for (const sub of this._subModules) {
            if (sub.downloaded.getObject()) {
                if (sub.inbuilt) {
                    // Inbuilt subs: clean up directly (bypass the guard)
                    await CacheManager.delete(sub.resources);
                    sub.downloaded.setObject(false);
                    sub.totalSize.setObject(0);
                    sub.downloadError.setObject('');
                } else {
                    await sub.undownload();
                }
            }
        }

        this.downloaded.setObject(false);
        this.totalSize.setObject(0);
        console.log(`[Module]: "${this.name}" removed from downloads`);
    }

    public addSubModule(struct: SubModuleStruct): SubModule {
        const sub = new SubModule(struct, this);
        this._subModules.push(sub);
        return sub;
    }

    public getSubModules(): ReadonlyArray<SubModule> {
        return this._subModules;
    }
}

export class SubModule {
    public readonly name: string;
    public readonly description?: string;
    public readonly inbuilt: boolean;
    public readonly resources: string[];
    public readonly downloaded: Observable<boolean>;
    public readonly parent: Module;
    public readonly totalSize: Observable<number>;
    public readonly downloadProgress: Observable<DownloadProgress>;
    public readonly downloadError: Observable<string>;

    constructor(struct: SubModuleStruct, parent: Module) {
        this.name = struct.name;
        this.description = struct.description;
        this.inbuilt = struct.inbuilt ?? true;
        this.resources = struct.resources ?? [];
        this.downloaded = new Observable<boolean>(false);
        this.parent = parent;
        this.totalSize = new Observable<number>(0);
        this.downloadProgress = new Observable<DownloadProgress>({
            totalFiles: 0, completedFiles: 0, currentFile: '',
            totalBytes: 0, downloadedBytes: 0, speed: 0, active: false
        });
        this.downloadError = new Observable<string>('');
    }

    private assertParentActive(): void {
        if (!this.parent.isActive()) {
            throw new Error(`[SubModule]: Cannot access "${this.name}" — parent module "${this.parent.name}" is disabled`);
        }
    }
    private assertParentDownloaded(): void {
        if (!this.parent.downloaded.getObject()) {
            throw new Error(`[SubModule]: Cannot access "${this.name}" — parent module "${this.parent.name}" is not downloaded`);
        }
    }

    public async download(): Promise<void> {
        if (this.inbuilt) {
            throw new Error(`[SubModule]: "${this.name}" is inbuilt and cannot be downloaded separately`);
        }
        this.assertParentDownloaded();
        if (this.downloaded.getObject()) return;
        this.downloadError.setObject('');

        if (this.resources.length === 0) {
            this.downloaded.setObject(true);
            return;
        }

        try {
            const bytes = await CacheManager.download(this.resources, this.downloadProgress);
            this.totalSize.setObject(bytes);
            this.downloaded.setObject(true);
            console.log(`[SubModule]: "${this.name}" of "${this.parent.name}" downloaded (${CacheManager.formatBytes(bytes)})`);
        } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            this.downloadError.setObject(msg);
            console.error(`[SubModule]: "${this.name}" download failed:`, msg);
        }
    }

    public async undownload(): Promise<void> {
        if (this.inbuilt) {
            throw new Error(`[SubModule]: "${this.name}" is inbuilt and cannot be removed separately`);
        }
        if (!this.downloaded.getObject()) return;
        this.downloadError.setObject('');

        await CacheManager.delete(this.resources);
        this.downloaded.setObject(false);
        this.totalSize.setObject(0);
        console.log(`[SubModule]: "${this.name}" of "${this.parent.name}" removed from downloads`);
    }
}

export class ModuleManager {
    private static _modules: Map<string, Module> = new Map();
    private static _userEphemeralCores = new Set<string>();
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
                mod.markInitialized();
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

        // Auto-download enabled modules that are not yet downloaded
        // (fire-and-forget — does not block initialization)
        this.autoDownload();

        return promises;
    }

    private static async autoDownload(): Promise<void> {
        for (const mod of this._modules.values()) {
            if (mod.core && !mod.downloaded.getObject() && !this._userEphemeralCores.has(mod.name)) {
                console.log(`[Module]: Auto-downloading "${mod.name}"...`);
                mod.download().then(() => {
                    this.persistState();
                }).catch(e => {
                    console.warn(`[Module]: Auto-download failed for "${mod.name}"`, e);
                });
            }
        }
    }

    static persistState(): void {
        const localState: Record<string, { enabled: boolean, downloaded: boolean, size: number, subModules?: Record<string, { downloaded: boolean, size: number }> }> = {};
        const sessionState: Record<string, { enabled: boolean }> = {};

        for (const mod of this._modules.values()) {
            const subs = mod.getSubModules();
            let subModules: Record<string, { downloaded: boolean, size: number }> | undefined;
            if (subs.length > 0) {
                subModules = {};
                for (const sub of subs) {
                    subModules[sub.name] = {
                        downloaded: sub.downloaded.getObject() === true,
                        size: sub.totalSize.getObject() ?? 0
                    };
                }
            }

            if (mod.downloaded.getObject() || mod.core) {
                localState[mod.name] = {
                    enabled: mod.isActive(),
                    downloaded: mod.downloaded.getObject() === true,
                    size: mod.totalSize.getObject() ?? 0,
                    ...(subModules ? { subModules } : {})
                };
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

    static clearEphemeralCore(name: string): void {
        this._userEphemeralCores.delete(name);
    }

    static restoreState(): void {
        // Restore from localStorage (downloaded modules)
        try {
            const raw = localStorage.getItem(this.STORAGE_KEY);
            if (raw) {
                const state: Record<string, { enabled: boolean, downloaded: boolean, size?: number, subModules?: Record<string, { enabled?: boolean, downloaded: boolean, size?: number }> } | boolean> = JSON.parse(raw);
                for (const [name, data] of Object.entries(state)) {
                    const mod = this._modules.get(name);
                    if (mod) {
                        if (typeof data === 'boolean') {
                            // Old format: value is just a boolean for enabled state
                            if (!mod.core) mod.setObject(data);
                            console.log(`[Module]: Migrated old format "${name}" → enabled=${data}`);
                            continue;
                        }
                        if (data.downloaded) {
                            mod.downloaded.setObject(true);
                        }
                        if (data.size) {
                            mod.totalSize.setObject(data.size);
                        }
                        if (!mod.core) {
                            mod.setObject(data.enabled);
                        }
                        // Track core modules explicitly made ephemeral by user
                        if (mod.core && !data.downloaded) {
                            this._userEphemeralCores.add(name);
                        }
                        if (data.subModules) {
                            for (const sub of mod.getSubModules()) {
                                const subData = data.subModules[sub.name];
                                if (subData) {
                                    sub.downloaded.setObject(subData.downloaded);
                                    if (subData.size) {
                                        sub.totalSize.setObject(subData.size);
                                    }
                                }
                            }
                        }
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
                        mod.setObject(data.enabled);
                        console.log(`[Module]: Restored ephemeral "${name}" → enabled=${data.enabled}`);
                    }
                }
            }
        } catch (e) {
            console.warn(`[Module]: Failed to restore sessionStorage state`, e);
        }
    }
}

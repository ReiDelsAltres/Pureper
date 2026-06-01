import Observable from "./api/Observer.js";
import { DownloadProgress } from "./CacheManager.js";
export type SubModuleStruct = {
    name: string;
    description?: string;
    inbuilt?: boolean;
    resources?: string[];
    estimatedSize?: number;
    onDownload?: (progress: Observable<DownloadProgress>) => Promise<void>;
    onUndownload?: () => Promise<void>;
};
export type ModuleStruct = {
    name: string;
    description?: string;
    icon?: string;
    core?: boolean;
    enabled?: boolean;
    resources?: string[];
    estimatedSize?: number;
    subModules?: SubModuleStruct[];
};
export default class Module extends Observable<boolean> {
    readonly name: string;
    readonly description?: string;
    readonly icon?: string;
    readonly core: boolean;
    readonly downloaded: Observable<boolean>;
    readonly resources: string[];
    readonly totalSize: Observable<number>;
    readonly downloadProgress: Observable<DownloadProgress>;
    readonly downloadError: Observable<string>;
    /** True when the installed copy is older than the version in the network manifest. */
    readonly updateAvailable: Observable<boolean>;
    private _installedVersion;
    /** Latest version from the network manifest — set by ModuleManager, never persisted. */
    private _latestVersion;
    private _registrations;
    private _placeholderNames;
    private _initialized;
    private _estimatedSize;
    private _subModules;
    private static _claimedPlaceholders;
    get enabled(): Observable<boolean>;
    constructor(struct: ModuleStruct);
    get installedVersion(): string | undefined;
    /** Called by ModuleManager when restoring persisted state. Not for external use. */
    _restoreInstalledVersion(version: string | undefined): void;
    /** Called by ModuleManager after fetching the network manifest. Not for external use. */
    _setLatestVersion(version: string): void;
    /** Called by ModuleManager after a successful refresh so installedVersion stays in sync. */
    _markInstalled(): void;
    addRegistration(fn: () => Promise<void>): void;
    getRegistrations(): ReadonlyArray<() => Promise<void>>;
    /**
     * Takes current entries from the global REGISTRY, moves them into this
     * module's internal list, and removes them from REGISTRY.
     *
     * Call this in consumer code AFTER importing the module's components so
     * that all their REGISTRY entries have been pushed.
     */
    captureRegistrations(registry: (() => Promise<void>)[]): void;
    addPlaceholder(name: string): void;
    getPlaceholderNames(): ReadonlyArray<string>;
    markInitialized(): void;
    enable(): Promise<void>;
    disable(): void;
    isActive(): boolean;
    /** True if enabled but not downloaded — works only in the current session. */
    get ephemeral(): boolean;
    download(): Promise<void>;
    refresh(): Promise<void>;
    formatBytes(bytes: number): string;
    undownload(): Promise<void>;
    addSubModule(struct: SubModuleStruct): SubModule;
    getSubModules(): ReadonlyArray<SubModule>;
}
export declare class SubModule {
    readonly name: string;
    readonly description?: string;
    readonly inbuilt: boolean;
    readonly resources: string[];
    readonly downloaded: Observable<boolean>;
    readonly parent: Module;
    readonly totalSize: Observable<number>;
    readonly downloadProgress: Observable<DownloadProgress>;
    readonly downloadError: Observable<string>;
    private readonly _onDownload?;
    private readonly _onUndownload?;
    private readonly _estimatedSize;
    constructor(struct: SubModuleStruct, parent: Module);
    private assertParentActive;
    private assertParentDownloaded;
    download(): Promise<void>;
    undownload(): Promise<void>;
    get hasCustomDownload(): boolean;
    get estimatedSize(): number;
    runOnDownload(): Promise<number>;
    runOnUndownload(): Promise<void>;
}
export declare class ModuleManager {
    private static _modules;
    private static _userEphemeralCores;
    private static readonly STORAGE_KEY;
    private static readonly SESSION_KEY;
    /**
     * URL of a JSON file mapping `moduleName -> version`. It is fetched fresh
     * from the network (bypassing all caches) so the app can detect new builds
     * even though the bootstrap code is served from cache. Must NOT be listed
     * among any module's cached resources.
     */
    private static _versionManifestUrl;
    /** Configure the manager. Call before {@link initialize}. */
    static configure(options: {
        versionManifestUrl?: string;
    }): void;
    static register(struct: ModuleStruct): Module;
    static get(name: string): Module | undefined;
    static getAll(): Module[];
    static isActive(name: string): boolean;
    /**
     * Initializes all modules:
     * 1. Restores saved enabled/disabled preferences
     * 2. Runs registrations from all enabled modules
     * 3. Runs any remaining global REGISTRY entries (backward compat)
     * 4. Returns all promises
     */
    static initialize(): Promise<void>[];
    /**
     * Fetches the version manifest fresh from the network, bypassing the HTTP
     * cache and the ServiceWorker cache. Returns null when offline, unconfigured
     * or on any error — callers must treat null as "no update info available".
     */
    private static fetchVersionManifest;
    private static autoUpdate;
    private static autoDownload;
    static persistState(): void;
    static clearEphemeralCore(name: string): void;
    static restoreState(): void;
    static refreshDownloadedModules(): Promise<void>;
}
//# sourceMappingURL=Module.d.ts.map
import Observable from "./api/Observer.js";
import { DownloadProgress } from "./CacheManager.js";
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
    readonly name: string;
    readonly description?: string;
    readonly icon?: string;
    readonly core: boolean;
    readonly downloaded: Observable<boolean>;
    readonly resources: string[];
    readonly totalSize: Observable<number>;
    readonly downloadProgress: Observable<DownloadProgress>;
    readonly downloadError: Observable<string>;
    private _registrations;
    private _placeholderNames;
    private _initialized;
    private _subModules;
    private static _claimedPlaceholders;
    get enabled(): Observable<boolean>;
    constructor(struct: ModuleStruct);
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
    constructor(struct: SubModuleStruct, parent: Module);
    private assertParentActive;
    private assertParentDownloaded;
    download(): Promise<void>;
    undownload(): Promise<void>;
}
export declare class ModuleManager {
    private static _modules;
    private static _userEphemeralCores;
    private static readonly STORAGE_KEY;
    private static readonly SESSION_KEY;
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
    private static autoDownload;
    static persistState(): void;
    static clearEphemeralCore(name: string): void;
    static restoreState(): void;
}
//# sourceMappingURL=Module.d.ts.map
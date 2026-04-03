import Observable from "./api/Observer.js";
export type ModuleStruct = {
    name: string;
    description?: string;
    icon?: string;
    core?: boolean;
    enabled?: boolean;
};
export default class Module {
    readonly name: string;
    readonly description?: string;
    readonly icon?: string;
    readonly core: boolean;
    readonly enabled: Observable<boolean>;
    private _registrations;
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
    enable(): void;
    disable(): void;
    isActive(): boolean;
}
export declare class ModuleManager {
    private static _modules;
    private static readonly STORAGE_KEY;
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
    static persistState(): void;
    static restoreState(): void;
}
//# sourceMappingURL=Module.d.ts.map
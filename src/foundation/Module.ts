import Observable from "./api/Observer.js";
import { REGISTRY } from "./Triplet.js";

export type ModuleStruct = {
    name: string;
    description?: string;
    icon?: string;
    core?: boolean;
    enabled?: boolean;
};

export default class Module {
    public readonly name: string;
    public readonly description?: string;
    public readonly icon?: string;
    public readonly core: boolean;
    public readonly enabled: Observable<boolean>;
    public readonly downloaded: Observable<boolean>;

    private _registrations: (() => Promise<void>)[] = [];

    public constructor(struct: ModuleStruct) {
        this.name = struct.name;
        this.description = struct.description;
        this.icon = struct.icon;
        this.core = struct.core ?? false;
        this.enabled = new Observable<boolean>(this.core ? true : (struct.enabled ?? false));
        this.downloaded = new Observable<boolean>(this.core ? true : false);
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

    public download(): void {
        this.downloaded.setObject(true);
        console.log(`[Module]: "${this.name}" downloaded`);
    }

    public undownload(): void {
        if (this.core) {
            throw new Error(`[Module]: Cannot remove core module "${this.name}" from downloads`);
        }
        this.downloaded.setObject(false);
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
                const state: Record<string, { enabled: boolean, downloaded: boolean }> = JSON.parse(raw);
                for (const [name, data] of Object.entries(state)) {
                    const mod = this._modules.get(name);
                    if (mod && !mod.core) {
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

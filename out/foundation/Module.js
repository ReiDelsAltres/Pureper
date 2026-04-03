import Observable from "./api/Observer.js";
import { REGISTRY } from "./Triplet.js";
export default class Module {
    name;
    description;
    icon;
    core;
    enabled;
    _registrations = [];
    constructor(struct) {
        this.name = struct.name;
        this.description = struct.description;
        this.icon = struct.icon;
        this.core = struct.core ?? false;
        this.enabled = new Observable(this.core ? true : (struct.enabled ?? true));
    }
    addRegistration(fn) {
        this._registrations.push(fn);
    }
    getRegistrations() {
        return this._registrations;
    }
    /**
     * Takes current entries from the global REGISTRY, moves them into this
     * module's internal list, and removes them from REGISTRY.
     *
     * Call this in consumer code AFTER importing the module's components so
     * that all their REGISTRY entries have been pushed.
     */
    captureRegistrations(registry) {
        const captured = registry.splice(0, registry.length);
        this._registrations.push(...captured);
        console.log(`[Module]: "${this.name}" captured ${captured.length} registration(s)`);
    }
    enable() {
        if (this.enabled.getObject() === true)
            return;
        this.enabled.setObject(true);
        console.log(`[Module]: "${this.name}" enabled`);
    }
    disable() {
        if (this.core) {
            throw new Error(`[Module]: Cannot disable core module "${this.name}"`);
        }
        if (this.enabled.getObject() === false)
            return;
        this.enabled.setObject(false);
        console.log(`[Module]: "${this.name}" disabled`);
    }
    isActive() {
        return this.enabled.getObject() === true;
    }
}
export class ModuleManager {
    static _modules = new Map();
    static STORAGE_KEY = "purper:modules";
    static register(struct) {
        if (this._modules.has(struct.name)) {
            throw new Error(`[Module]: Module "${struct.name}" is already registered`);
        }
        const mod = new Module(struct);
        this._modules.set(struct.name, mod);
        console.log(`[Module]: Registered module "${struct.name}"`);
        return mod;
    }
    static get(name) {
        return this._modules.get(name);
    }
    static getAll() {
        return Array.from(this._modules.values());
    }
    static isActive(name) {
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
    static initialize() {
        this.restoreState();
        const promises = [];
        for (const mod of this._modules.values()) {
            if (mod.isActive()) {
                console.log(`[Module]: Initializing module "${mod.name}" (${mod.getRegistrations().length} registration(s))`);
                for (const reg of mod.getRegistrations()) {
                    promises.push(reg());
                }
            }
            else {
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
    static persistState() {
        const state = {};
        for (const mod of this._modules.values()) {
            if (!mod.core) {
                state[mod.name] = mod.isActive();
            }
        }
        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(state));
            console.log(`[Module]: Persisted module state`);
        }
        catch (e) {
            console.warn(`[Module]: Failed to persist module state`, e);
        }
    }
    static restoreState() {
        try {
            const raw = localStorage.getItem(this.STORAGE_KEY);
            if (!raw)
                return;
            const state = JSON.parse(raw);
            for (const [name, enabled] of Object.entries(state)) {
                const mod = this._modules.get(name);
                if (mod && !mod.core) {
                    mod.enabled.setObject(enabled);
                    console.log(`[Module]: Restored "${name}" → ${enabled ? "enabled" : "disabled"}`);
                }
            }
        }
        catch (e) {
            console.warn(`[Module]: Failed to restore module state`, e);
        }
    }
}
//# sourceMappingURL=Module.js.map
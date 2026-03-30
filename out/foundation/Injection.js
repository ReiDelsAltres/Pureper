import Observable from "./api/Observer.js";
import Fetcher from "./Fetcher.js";
/**
 * Implementation — a swappable variant for a Triplet placeholder.
 *
 * Each placeholder (component tag or page route) can have multiple registered
 * implementations. One is active at a time; switching triggers a reload on
 * all live instances.
 *
 * ```ts
 * // Register the default implementation
 * @ReComponent({ markupURL: './Button.hmle', cssURL: './Button.css' }, "re-button")
 * class ReButton extends Component { ... }
 *
 * // Register an alternative implementation
 * @ReImplementation({ markupURL: './FancyButton.hmle', cssURL: './FancyButton.css' }, "re-button")
 * class FancyButton extends Component { ... }
 *
 * // Switch all re-button instances to FancyButton
 * Placeholder.switchTo("re-button", "FancyButton");
 *
 * // Switch a single instance manually
 * const btn = document.querySelector("re-button");
 * Placeholder.switchInstance(btn, "FancyButton");
 * ```
 */
export class Implementation {
    name;
    markup;
    style;
    globalStyle;
    uniClass;
    constructor(name, struct) {
        this.name = name;
        if (struct.markup && struct.markupURL)
            throw new Error(`[Implementation:${name}]: Both markup and markupURL provided.`);
        this.markup = struct.markupURL ? Fetcher.fetchText(struct.markupURL) : Promise.resolve(struct.markup);
        if (struct.css && struct.cssURL)
            throw new Error(`[Implementation:${name}]: Both css and cssURL provided.`);
        this.style = struct.cssURL ? Fetcher.fetchText(struct.cssURL) : Promise.resolve(struct.css);
        if (struct.ltCss && struct.ltCssURL)
            throw new Error(`[Implementation:${name}]: Both ltCss and ltCssURL provided.`);
        this.globalStyle = struct.ltCssURL ? Fetcher.fetchText(struct.ltCssURL) : Promise.resolve(struct.ltCss);
        this.uniClass = struct.class;
    }
}
/**
 * Placeholder — manages a named slot (tag or route) with swappable implementations.
 *
 * - `Placeholder.get(name)` — get or create a placeholder
 * - `placeholder.addImplementation(impl)` — register an implementation
 * - `Placeholder.switchTo(name, implName)` — globally switch + reload all instances
 * - `Placeholder.switchInstance(instance, implName)` — switch one instance
 */
export class Placeholder {
    /** Все зарегистрированные placeholders по имени (tag / route). */
    static _all = new Map();
    name;
    implementations = new Map();
    activeImpl = new Observable(null);
    /** Все живые экземпляры этого placeholder для reload при смене implementation. */
    _instances = new Set();
    constructor(name) {
        this.name = name;
    }
    /** Get or create a placeholder by name. */
    static get(name) {
        let p = this._all.get(name);
        if (!p) {
            p = new Placeholder(name);
            this._all.set(name, p);
        }
        return p;
    }
    /** Check if a placeholder exists. */
    static has(name) {
        return this._all.has(name);
    }
    /** Add an implementation. The first one added becomes active by default. */
    addImplementation(impl) {
        if (this.implementations.has(impl.name)) {
            console.warn(`[Placeholder:${this.name}]: Implementation "${impl.name}" already registered, overwriting.`);
        }
        this.implementations.set(impl.name, impl);
        if (!this.activeImpl.getObject()) {
            this.activeImpl.setObject(impl);
            console.info(`[Placeholder:${this.name}]: Default implementation set to "${impl.name}"`);
        }
        else {
            console.info(`[Placeholder:${this.name}]: Implementation "${impl.name}" registered`);
        }
    }
    /** Get the currently active implementation. */
    getActive() {
        return this.activeImpl.getObject();
    }
    /** Track a live instance for reload. */
    trackInstance(instance) {
        this._instances.add(instance);
    }
    /** Untrack a disposed instance. */
    untrackInstance(instance) {
        this._instances.delete(instance);
    }
    /** Get all tracked live instances. */
    getInstances() {
        return this._instances;
    }
    /**
     * Switch the active implementation globally.
     * All live instances of this placeholder will reload.
     */
    static async switchTo(placeholderName, implName) {
        const p = this._all.get(placeholderName);
        if (!p)
            throw new Error(`[Placeholder]: "${placeholderName}" not found.`);
        const impl = p.implementations.get(implName);
        if (!impl)
            throw new Error(`[Placeholder:${placeholderName}]: Implementation "${implName}" not found.`);
        const prev = p.activeImpl.getObject();
        if (prev === impl)
            return;
        p.activeImpl.setObject(impl);
        console.info(`[Placeholder:${placeholderName}]: Switched to "${implName}"`);
        // Reload all live instances
        const reloads = [];
        for (const instance of p._instances) {
            reloads.push(instance.reload());
        }
        await Promise.all(reloads);
        console.info(`[Placeholder:${placeholderName}]: Reloaded ${reloads.length} instance(s)`);
    }
    /**
     * Switch a single instance to a different implementation and reload it.
     * Does NOT change the global active implementation.
     */
    static async switchInstance(placeholderName, instance, implName) {
        const p = this._all.get(placeholderName);
        if (!p)
            throw new Error(`[Placeholder]: "${placeholderName}" not found.`);
        const impl = p.implementations.get(implName);
        if (!impl)
            throw new Error(`[Placeholder:${placeholderName}]: Implementation "${implName}" not found.`);
        instance._activeImplementation = impl;
        await instance.reload();
        console.info(`[Placeholder:${placeholderName}]: Instance switched to "${implName}"`);
    }
}
//# sourceMappingURL=Injection.js.map
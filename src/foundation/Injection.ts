import Observable from "./api/Observer.js";
import Fetcher from "./Fetcher.js";
import { AnyConstructor } from "./component_api/mixin/Proto.js";
import UniHtml from "./component_api/UniHtml.js";

export type ImplementationStruct = {
    markupURL?: string;
    markup?: string;

    cssURL?: string;
    css?: string;

    ltCssURL?: string;
    ltCss?: string;

    class?: AnyConstructor<UniHtml>;
}

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
    public readonly name: string;
    public readonly markup?: Promise<string>;
    public readonly style?: Promise<string>;
    public readonly globalStyle?: Promise<string>;
    public readonly uniClass?: AnyConstructor<UniHtml>;

    public constructor(name: string, struct: ImplementationStruct) {
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
    private static readonly _all: Map<string, Placeholder> = new Map();

    public readonly name: string;
    public readonly implementations: Map<string, Implementation> = new Map();
    public readonly activeImpl: Observable<Implementation | null> = new Observable(null);

    /** Все живые экземпляры этого placeholder для reload при смене implementation. */
    private readonly _instances: Set<UniHtml> = new Set();

    private constructor(name: string) {
        this.name = name;
    }

    /** Get or create a placeholder by name. */
    public static get(name: string): Placeholder {
        let p = this._all.get(name);
        if (!p) {
            p = new Placeholder(name);
            this._all.set(name, p);
        }
        return p;
    }

    /** Check if a placeholder exists. */
    public static has(name: string): boolean {
        return this._all.has(name);
    }

    /** Add an implementation. The first one added becomes active by default. */
    public addImplementation(impl: Implementation): void {
        if (this.implementations.has(impl.name)) {
            console.warn(`[Placeholder:${this.name}]: Implementation "${impl.name}" already registered, overwriting.`);
        }
        this.implementations.set(impl.name, impl);

        if (!this.activeImpl.getObject()) {
            this.activeImpl.setObject(impl);
            console.info(`[Placeholder:${this.name}]: Default implementation set to "${impl.name}"`);
        } else {
            console.info(`[Placeholder:${this.name}]: Implementation "${impl.name}" registered`);
        }
    }

    /** Get the currently active implementation. */
    public getActive(): Implementation | null {
        return this.activeImpl.getObject();
    }

    /** Track a live instance for reload. */
    public trackInstance(instance: UniHtml): void {
        this._instances.add(instance);
    }

    /** Untrack a disposed instance. */
    public untrackInstance(instance: UniHtml): void {
        this._instances.delete(instance);
    }

    /** Get all tracked live instances. */
    public getInstances(): Set<UniHtml> {
        return this._instances;
    }

    /**
     * Switch the active implementation globally.
     * All live instances of this placeholder will reload.
     */
    public static async switchTo(placeholderName: string, implName: string): Promise<void> {
        const p = this._all.get(placeholderName);
        if (!p) throw new Error(`[Placeholder]: "${placeholderName}" not found.`);

        const impl = p.implementations.get(implName);
        if (!impl) throw new Error(`[Placeholder:${placeholderName}]: Implementation "${implName}" not found.`);

        const prev = p.activeImpl.getObject();
        if (prev === impl) return;

        p.activeImpl.setObject(impl);
        console.info(`[Placeholder:${placeholderName}]: Switched to "${implName}"`);

        // Reload all live instances
        const reloads: Promise<void>[] = [];
        for (const instance of p._instances) {
            reloads.push(instance.reload());
        }
        await Promise.all(reloads);
        console.info(`[Placeholder:${placeholderName}]: Reloaded ${reloads.length} instance(s)`);
    }

    /** Return all registered placeholder names. */
    public static getAllNames(): string[] {
        return Array.from(this._all.keys());
    }

    /** Deactivate a placeholder — hides all instances. */
    public static deactivate(name: string): void {
        const p = this._all.get(name);
        if (!p) return;
        p.activeImpl.setObject(null);
        console.info(`[Placeholder:${name}]: Deactivated`);
    }

    /** Activate a placeholder — restores the default implementation. */
    public static activate(name: string): void {
        const p = this._all.get(name);
        if (!p) return;
        const first = p.implementations.values().next().value;
        if (first && !p.activeImpl.getObject()) {
            p.activeImpl.setObject(first);
            console.info(`[Placeholder:${name}]: Activated with "${first.name}"`);
        }
    }

    /**
     * Switch a single instance to a different implementation and reload it.
     * Does NOT change the global active implementation.
     */
    public static async switchInstance(placeholderName: string, instance: UniHtml, implName: string): Promise<void> {
        const p = this._all.get(placeholderName);
        if (!p) throw new Error(`[Placeholder]: "${placeholderName}" not found.`);

        const impl = p.implementations.get(implName);
        if (!impl) throw new Error(`[Placeholder:${placeholderName}]: Implementation "${implName}" not found.`);

        (instance as any)._activeImplementation = impl;
        await instance.reload();
        console.info(`[Placeholder:${placeholderName}]: Instance switched to "${implName}"`);
    }
}

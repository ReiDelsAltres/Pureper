import Observable from "./api/Observer.js";
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
};
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
export declare class Implementation {
    readonly name: string;
    readonly markup?: Promise<string>;
    readonly style?: Promise<string>;
    readonly globalStyle?: Promise<string>;
    readonly uniClass?: AnyConstructor<UniHtml>;
    constructor(name: string, struct: ImplementationStruct);
}
/**
 * Placeholder — manages a named slot (tag or route) with swappable implementations.
 *
 * - `Placeholder.get(name)` — get or create a placeholder
 * - `placeholder.addImplementation(impl)` — register an implementation
 * - `Placeholder.switchTo(name, implName)` — globally switch + reload all instances
 * - `Placeholder.switchInstance(instance, implName)` — switch one instance
 */
export declare class Placeholder {
    /** Все зарегистрированные placeholders по имени (tag / route). */
    private static readonly _all;
    readonly name: string;
    readonly implementations: Map<string, Implementation>;
    readonly activeImpl: Observable<Implementation | null>;
    /** Все живые экземпляры этого placeholder для reload при смене implementation. */
    private readonly _instances;
    private constructor();
    /** Get or create a placeholder by name. */
    static get(name: string): Placeholder;
    /** Check if a placeholder exists. */
    static has(name: string): boolean;
    /** Add an implementation. The first one added becomes active by default. */
    addImplementation(impl: Implementation): void;
    /** Get the currently active implementation. */
    getActive(): Implementation | null;
    /** Track a live instance for reload. */
    trackInstance(instance: UniHtml): void;
    /** Untrack a disposed instance. */
    untrackInstance(instance: UniHtml): void;
    /** Get all tracked live instances. */
    getInstances(): Set<UniHtml>;
    /**
     * Switch the active implementation globally.
     * All live instances of this placeholder will reload.
     */
    static switchTo(placeholderName: string, implName: string): Promise<void>;
    /** Return all registered placeholder names. */
    static getAllNames(): string[];
    /** Deactivate a placeholder — hides all instances. */
    static deactivate(name: string): void;
    /** Activate a placeholder — restores the default implementation. */
    static activate(name: string): void;
    /**
     * Switch a single instance to a different implementation and reload it.
     * Does NOT change the global active implementation.
     */
    static switchInstance(placeholderName: string, instance: UniHtml, implName: string): Promise<void>;
}
//# sourceMappingURL=Injection.d.ts.map
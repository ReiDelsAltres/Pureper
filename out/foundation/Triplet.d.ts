import { ImplementationStruct } from "./Injection.js";
export declare const REGISTRY: (() => Promise<void>)[];
export declare class RegistryCapture {
    private static _unclaimed;
    private static _classResources;
    /** Called by decorators to record which file paths a class uses. */
    static capture(cls: Function, paths: string[]): void;
    /** Drain all unclaimed resource paths. Called by Module.captureRegistrations(). */
    static drain(): string[];
    /** Get resource paths for a specific class. */
    static getResources(cls: Function): string[];
}
export declare enum AccessType {
    NONE = 0,
    OFFLINE = 1,
    ONLINE = 2,
    BOTH = 3
}
export type TripletStruct = ImplementationStruct & {
    access?: AccessType;
};
/**
 * Triplet — registers a placeholder with a default implementation.
 *
 * The placeholder is what gets registered in `customElements.define()` or `Router`.
 * At runtime, the placeholder resolves the currently active {@link Implementation}
 * and uses its markup, style, and class for the lifecycle.
 *
 * ```ts
 * // Default implementation registered via @ReComponent
 * @ReComponent({ markupURL: './Button.hmle', cssURL: './Button.css' }, "re-button")
 * class ReButton extends Component { ... }
 *
 * // Alternative implementation registered via @ReImplementation
 * @ReImplementation({ markupURL: './FancyButton.hmle', cssURL: './Fancy.css' }, "re-button")
 * class FancyButton extends Component { ... }
 *
 * // Switch globally — all re-button instances reload
 * Placeholder.switchTo("re-button", "FancyButton");
 *
 * // Switch one instance only
 * Placeholder.switchInstance("re-button", myBtnInstance, "FancyButton");
 * ```
 */
export default class Triplet {
    private readonly access;
    private readonly path;
    private readonly placeholderName?;
    private readonly implementation;
    constructor(struct: TripletStruct, implName?: string);
    register(type: "router" | "markup", name: string): void;
}
//# sourceMappingURL=Triplet.d.ts.map
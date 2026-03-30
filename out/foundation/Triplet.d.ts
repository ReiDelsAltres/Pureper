import { ImplementationStruct } from "./Injection.js";
export declare const REGISTRY: (() => void)[];
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
    private readonly placeholderName?;
    private readonly implementation;
    constructor(struct: TripletStruct, implName?: string);
    register(type: "router" | "markup", name: string): Promise<void>;
}
//# sourceMappingURL=Triplet.d.ts.map
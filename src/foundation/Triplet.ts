import Fetcher from "./Fetcher.js";
import UniHtml from "./component_api/UniHtml.js";
import { Router } from "./worker/Router.js";
import Page from "./component_api/Page.js";
import Component from "./component_api/Component.js";
import { AnyConstructor, Constructor } from "./component_api/mixin/Proto.js";
import TemplateEngine, { TemplateHolder } from "./engine/TemplateEngine.js";
import Scope from "./engine/Scope.js";
import { Implementation, ImplementationStruct, Placeholder } from "./Injection.js";

export const REGISTRY: (() => Promise<void>)[] = [];

export class RegistryCapture {
    private static _unclaimed: string[] = [];
    private static _classResources = new Map<Function, string[]>();

    /** Called by decorators to record which file paths a class uses. */
    static capture(cls: Function, paths: string[]): void {
        this._classResources.set(cls, paths);
        this._unclaimed.push(...paths);
    }

    /** Drain all unclaimed resource paths. Called by Module.captureRegistrations(). */
    static drain(): string[] {
        return this._unclaimed.splice(0);
    }

    /** Get resource paths for a specific class. */
    static getResources(cls: Function): string[] {
        return this._classResources.get(cls) ?? [];
    }
}

export enum AccessType {
    NONE = 0,
    OFFLINE = 1 << 0,
    ONLINE = 1 << 1,
    BOTH = OFFLINE | ONLINE
}

export type TripletStruct = ImplementationStruct & {
    access?: AccessType;
}

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
    private readonly access: AccessType;
    private readonly path: string;
    private readonly placeholderName?: string;
    private readonly implementation: Implementation;

    public constructor(struct: TripletStruct, implName?: string) {
        this.access = struct.access ?? AccessType.BOTH;
        this.path = struct.markupURL ?? "";

        const name = implName ?? struct.class?.name ?? "default";
        this.implementation = new Implementation(name, struct);
    }

    public register(type: "router" | "markup", name: string): void {
        const placeholder = Placeholder.get(name);
        placeholder.addImplementation(this.implementation);

        if (placeholder.implementations.size > 1) {
            console.info(`[Triplet]: Implementation "${this.implementation.name}" added to existing placeholder "${name}"`);
            return;
        }

        const impl = this.implementation;

        if (type === "router") {
            REGISTRY.push(async () => {
                const globalCss = await impl.globalStyle;
                if (globalCss) {
                    document.adoptedStyleSheets.push(
                        await new CSSStyleSheet().replace(globalCss));
                }

                const routePath = name;
                Router.registerRoute(this.path, routePath, (search) => {
                    const impl = placeholder.getActive()!;
                    const cls = impl.uniClass ?? Page;

                    const paramNames = (() => {
                        const ctor = cls.prototype.constructor;
                        const fnStr = ctor.toString();
                        const argsMatch = fnStr.match(/constructor\s*\(([^)]*)\)/);
                        if (!argsMatch) return [];
                        return argsMatch[1].split(',').map(s => s.trim()).filter(Boolean);
                    })();

                    const args = paramNames.map(n => search?.get(n));
                    const instance = new cls(...args);

                    // Attach placeholder context to instance for _init resolution
                    (instance as any)._placeholderName = name;
                    (instance as any)._activeImplementation = impl;
                    placeholder.trackInstance(instance);

                    (instance as any)._init = async function (): Promise<TemplateHolder> {
                        const activeImpl: Implementation = (this as any)._activeImplementation
                            ?? placeholder.getActive();
                        if (!activeImpl) throw new Error(`[Placeholder:${routePath}]: No active implementation.`);

                        const markupText = await activeImpl.markup;
                        const holder = TemplateEngine.createHolder(markupText, Scope.from(this));

                        const cssText = await activeImpl.style;
                        if (cssText) {
                            document.adoptedStyleSheets.push(
                                await new CSSStyleSheet().replace(cssText));
                        }

                        return holder;
                    };

                    return instance;
                });

                console.info(`[Triplet]: Router route "${name}" registered as placeholder`);
            });
        } else if (type === "markup") {
            REGISTRY.push(async () => {
                const globalCss = await impl.globalStyle;
                if (globalCss) {
                    document.adoptedStyleSheets.push(
                        await new CSSStyleSheet().replace(globalCss));
                }

                if (customElements.get(name))
                    throw new Error(`Custom element '${name}' is already defined.`);

                const cls = this.implementation.uniClass ?? Component;
                const placeholderRef = placeholder;
                const placeholderName = name;

                // Create the placeholder class that delegates to the active implementation
                let proto = cls.prototype as any;

                proto._init = async function (): Promise<TemplateHolder> {
                    // Resolve which implementation to use (per-instance override or global)
                    const impl: Implementation = (this as any)._activeImplementation
                        ?? placeholderRef.getActive();

                    if (!impl) throw new Error(`[Placeholder:${placeholderName}]: No active implementation.`);

                    // Store for reload
                    (this as any)._placeholderName = placeholderName;
                    if (!(this as any)._activeImplementation)
                        (this as any)._activeImplementation = impl;

                    placeholderRef.trackInstance(this);

                    // Load markup
                    const markupText = await impl.markup;
                    const holder = TemplateEngine.createHolder(markupText, Scope.from(this));

                    // Apply scoped CSS
                    const dmc: Document | ShadowRoot = this.shadowRoot ?? document;
                    const cssText = await impl.style;
                    if (cssText) {
                        dmc.adoptedStyleSheets.push(
                            await new CSSStyleSheet().replace(cssText));
                    }

                    return holder;
                };

                customElements.define(name, cls.prototype.constructor as CustomElementConstructor);
                console.info(`[Triplet]: Custom element "${name}" registered as placeholder`);
            });
        }
    }
}

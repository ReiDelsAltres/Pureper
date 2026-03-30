import { Router } from "./worker/Router.js";
import Page from "./component_api/Page.js";
import Component from "./component_api/Component.js";
import TemplateEngine from "./engine/TemplateEngine.js";
import Scope from "./engine/Scope.js";
import { Implementation, Placeholder } from "./Injection.js";
export const REGISTRY = [];
export var AccessType;
(function (AccessType) {
    AccessType[AccessType["NONE"] = 0] = "NONE";
    AccessType[AccessType["OFFLINE"] = 1] = "OFFLINE";
    AccessType[AccessType["ONLINE"] = 2] = "ONLINE";
    AccessType[AccessType["BOTH"] = 3] = "BOTH";
})(AccessType || (AccessType = {}));
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
    access;
    path;
    placeholderName;
    implementation;
    constructor(struct, implName) {
        this.access = struct.access ?? AccessType.BOTH;
        this.path = struct.markupURL ?? "";
        const name = implName ?? struct.class?.name ?? "default";
        this.implementation = new Implementation(name, struct);
    }
    register(type, name) {
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
                    document.adoptedStyleSheets.push(await new CSSStyleSheet().replace(globalCss));
                }
                const routePath = name;
                Router.registerRoute(this.path, routePath, (search) => {
                    const impl = placeholder.getActive();
                    const cls = impl.uniClass ?? Page;
                    const paramNames = (() => {
                        const ctor = cls.prototype.constructor;
                        const fnStr = ctor.toString();
                        const argsMatch = fnStr.match(/constructor\s*\(([^)]*)\)/);
                        if (!argsMatch)
                            return [];
                        return argsMatch[1].split(',').map(s => s.trim()).filter(Boolean);
                    })();
                    const args = paramNames.map(n => search?.get(n));
                    const instance = new cls(...args);
                    // Attach placeholder context to instance for _init resolution
                    instance._placeholderName = name;
                    instance._activeImplementation = impl;
                    placeholder.trackInstance(instance);
                    instance._init = async function () {
                        const activeImpl = this._activeImplementation
                            ?? placeholder.getActive();
                        if (!activeImpl)
                            throw new Error(`[Placeholder:${routePath}]: No active implementation.`);
                        const markupText = await activeImpl.markup;
                        const holder = TemplateEngine.createHolder(markupText, Scope.from(this));
                        const cssText = await activeImpl.style;
                        if (cssText) {
                            document.adoptedStyleSheets.push(await new CSSStyleSheet().replace(cssText));
                        }
                        return holder;
                    };
                    return instance;
                });
                console.info(`[Triplet]: Router route "${name}" registered as placeholder`);
            });
        }
        else if (type === "markup") {
            REGISTRY.push(async () => {
                const globalCss = await impl.globalStyle;
                if (globalCss) {
                    document.adoptedStyleSheets.push(await new CSSStyleSheet().replace(globalCss));
                }
                if (customElements.get(name))
                    throw new Error(`Custom element '${name}' is already defined.`);
                const cls = this.implementation.uniClass ?? Component;
                const placeholderRef = placeholder;
                const placeholderName = name;
                // Create the placeholder class that delegates to the active implementation
                let proto = cls.prototype;
                proto._init = async function () {
                    // Resolve which implementation to use (per-instance override or global)
                    const impl = this._activeImplementation
                        ?? placeholderRef.getActive();
                    if (!impl)
                        throw new Error(`[Placeholder:${placeholderName}]: No active implementation.`);
                    // Store for reload
                    this._placeholderName = placeholderName;
                    if (!this._activeImplementation)
                        this._activeImplementation = impl;
                    placeholderRef.trackInstance(this);
                    // Load markup
                    const markupText = await impl.markup;
                    const holder = TemplateEngine.createHolder(markupText, Scope.from(this));
                    // Apply scoped CSS
                    const dmc = this.shadowRoot ?? document;
                    const cssText = await impl.style;
                    if (cssText) {
                        dmc.adoptedStyleSheets.push(await new CSSStyleSheet().replace(cssText));
                    }
                    return holder;
                };
                customElements.define(name, cls.prototype.constructor);
                console.info(`[Triplet]: Custom element "${name}" registered as placeholder`);
            });
        }
    }
}
//# sourceMappingURL=Triplet.js.map
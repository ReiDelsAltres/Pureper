import Fetcher from "./Fetcher.js";
import UniHtml from "./component_api/UniHtml.js";
import { Router } from "./worker/Router.js";
import ServiceWorker from "./worker/ServiceWorker.js";
import Page from "./component_api/Page.js";
import Component from "./component_api/Component.js";
import { AnyConstructor, Constructor } from "./component_api/mixin/Proto.js";
import PHTMLParser from "./PHTMLParser.js";
import HMLEParser from "./HMLEParser.js";
import HMLEParserReborn from "./HMLEParserReborn.js";


export enum AccessType {
    NONE = 0,
    OFFLINE = 1 << 0,
    ONLINE = 1 << 1,
    BOTH = OFFLINE | ONLINE
}
export type TripletStruct = {
    markupURL?: string;
    markup?: string;

    cssURL?: string;
    css?: string;

    ltCssURL?: string;
    ltCss?: string;

    jsURL?: string;

    access?: AccessType;
    class? : AnyConstructor<UniHtml>;
}
export default class Triplet {
    public readonly markup?: string;
    public readonly css?: string;
    public readonly lightCss?: string;
    public readonly js?: string;

    private readonly markupURL?: string;
    private readonly cssURL?: string;
    private readonly ltCssURL?: string;
    private readonly jsURL?: string;

    private readonly access: AccessType;

    private uni?: AnyConstructor<UniHtml>;

    private lightCssApplied: boolean = false;
    private componentCssTextPromise?: Promise<string | undefined>;
    private componentCssSheetPromise?: Promise<CSSStyleSheet | null>;

    public constructor(struct: TripletStruct) {
        this.markup = struct.markup;
        this.css = struct.css;
        this.lightCss = struct.ltCss;
        this.js = undefined;

        this.markupURL = struct.markupURL;
        this.cssURL = struct.cssURL;
        this.ltCssURL = struct.ltCssURL;
        this.jsURL = struct.jsURL;

        this.access = struct.access ?? AccessType.BOTH;

        this.uni = struct.class;
    }

    private async getMarkupText(): Promise<string | undefined> {
        if (this.markup) return this.markup;
        if (this.markupURL) return Fetcher.fetchText(this.markupURL);
        return undefined;
    }

    private async getLightCssText(): Promise<string | undefined> {
        if (this.lightCss) return this.lightCss;
        if (this.ltCssURL) return Fetcher.fetchText(this.ltCssURL);
        return undefined;
    }

    private async getComponentCssText(): Promise<string | undefined> {
        if (this.css) return this.css;
        if (!this.cssURL) return undefined;

        this.componentCssTextPromise = this.componentCssTextPromise ?? Fetcher.fetchText(this.cssURL);
        return this.componentCssTextPromise;
    }

    private async getComponentCssSheet(): Promise<CSSStyleSheet | null> {
        if (this.componentCssSheetPromise) return this.componentCssSheetPromise;

        this.componentCssSheetPromise = (async () => {
            const cssText = await this.getComponentCssText();
            if (!cssText) return null;

            const sheet = new CSSStyleSheet();
            await sheet.replace(cssText);
            return sheet;
        })();

        return this.componentCssSheetPromise;
    }

    private static canUseConstructableStylesheets(target: Document | ShadowRoot): boolean {
        try {
            return (
                typeof CSSStyleSheet !== "undefined" &&
                typeof (CSSStyleSheet as any).prototype?.replace === "function" &&
                typeof (target as any).adoptedStyleSheets !== "undefined" &&
                Array.isArray((target as any).adoptedStyleSheets)
            );
        } catch {
            return false;
        }
    }

    private static ensureInlineStyle(target: Document | ShadowRoot, key: string, cssText: string): void {
        const container: ParentNode = (target instanceof Document)
            ? (target.head ?? target.documentElement)
            : target;

        const selector = `style[data-triplet-css="${CSS.escape(key)}"]`;
        const existing = (container as ParentNode).querySelector?.(selector);
        if (existing) return;

        const styleEl = document.createElement("style");
        styleEl.setAttribute("data-triplet-css", key);
        styleEl.textContent = cssText;
        (container as any).appendChild(styleEl);
    }

    public async init(): Promise<boolean> {
        const isOnline: boolean = await ServiceWorker.isOnline();

        if (this.access === AccessType.NONE) return false;
        if (this.access === AccessType.BOTH) {
            await this.cache();
            return true
        };
        if (this.access === AccessType.OFFLINE && isOnline) return false;
        if (this.access === AccessType.ONLINE && !isOnline) return false;

        return true;
    }

    public async cache(): Promise<void> {
        //
    }

    public async register(type: "router" | "markup", name: string): Promise<boolean> {
        if (!this.uni) {
            switch (type) {
                case "router":
                    this.uni = Page;
                    break;
                case "markup":
                    this.uni = Component;
                    break;
            }
        }
        if (!this.lightCssApplied) {
            const lightCssText = await this.getLightCssText();
            if (lightCssText) {
                const key = this.ltCssURL ?? "light-inline";
                if (Triplet.canUseConstructableStylesheets(document)) {
                    const style = new CSSStyleSheet();
                    await style.replace(lightCssText);
                    document.adoptedStyleSheets = [
                        ...document.adoptedStyleSheets,
                        style
                    ];
                } else {
                    Triplet.ensureInlineStyle(document, key, lightCssText);
                }
            }
            this.lightCssApplied = true;
        }

        let ori = this.createInjectedClass(this.uni, type);

        if (type === "router") {
            const routePath = this.markupURL ?? this.markup ?? "";
            var reg = Router.registerRoute(routePath, name, (search) => {
                const paramNames = (() => {
                    const ctor = this.uni.prototype.constructor;
                    const fnStr = ctor.toString();
                    const argsMatch = fnStr.match(/constructor\s*\(([^)]*)\)/);
                    if (!argsMatch) return [];
                    return argsMatch[1].split(',').map(s => s.trim()).filter(Boolean);
                })();


                const args = paramNames.map(name => {
                    const string = search?.get(name);

                    return search?.get(name)
                });
                const unn: UniHtml = new ori(...args);

                return unn;
            });

            console.info(`[Triplet]` + `: Router route '${name}' registered for path '${routePath}' by class ${ori}.`);
            return reg.then(() => true).catch(() => false);
        } else if (type === "markup") {
            if (customElements.get(name)) throw new Error(`Custom element '${name}' is already defined.`);
            customElements.define(name, ori.prototype.constructor as CustomElementConstructor);

            console.info(`[Triplet]: Custom element '${name}' defined.`);
            return Promise.resolve(true);
        }
        return Promise.resolve(false);
    }

    private createInjectedClass(c: AnyConstructor<UniHtml>, type: "router" | "markup"): any {
        let that = this;
        let ori = class extends c {
            constructor(...args: any[]) {
                super(...args);
            }
        };
        let proto = ori.prototype as any;
        const parser = new HMLEParserReborn();

        proto._init = async function (): Promise<DocumentFragment> {
            const markupText = await that.getMarkupText();
            if (!markupText) return new DocumentFragment();
            return parser.parseToDOM(markupText, this);
        }

        proto._postInit = async function (preHtml: DocumentFragment): Promise<DocumentFragment> {
            const dmc: Document | ShadowRoot = this.shadowRoot ?? document;

            const cssText = await that.getComponentCssText();
            if (cssText) {
                const key = that.cssURL ?? "component-inline";

                if (Triplet.canUseConstructableStylesheets(dmc)) {
                    const cssSheet = await that.getComponentCssSheet();
                    if (cssSheet) {
                        const sheets = (dmc as any).adoptedStyleSheets as CSSStyleSheet[];
                        if (!sheets.includes(cssSheet)) {
                            (dmc as any).adoptedStyleSheets = [...sheets, cssSheet];
                        }
                    }
                } else {
                    Triplet.ensureInlineStyle(dmc, key, cssText);
                }
            }

            parser.hydrate(preHtml, this);
            return preHtml;
        }

        return ori;
    }

}

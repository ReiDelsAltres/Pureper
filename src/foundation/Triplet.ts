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

    private async getComponentCssSheet(): Promise<CSSStyleSheet | null> {
        if (this.componentCssSheetPromise) return this.componentCssSheetPromise;

        this.componentCssSheetPromise = (async () => {
            const cssText = this.css ?? (this.cssURL ? await Fetcher.fetchText(this.cssURL) : undefined);
            if (!cssText) return null;

            const sheet = new CSSStyleSheet();
            await sheet.replace(cssText);
            return sheet;
        })();

        return this.componentCssSheetPromise;
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

    private createLink(cssPath: string): HTMLLinkElement {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        ///
        link.href = cssPath;
        ///
        return link;
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
                const style = new CSSStyleSheet();
                await style.replace(lightCssText);
                document.adoptedStyleSheets = [
                    ...document.adoptedStyleSheets,
                    style
                ];
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
            var dmc = this.shadowRoot ?? document;
            const cssSheet = await that.getComponentCssSheet();
            if (cssSheet) {
                dmc.adoptedStyleSheets = [...dmc.adoptedStyleSheets, cssSheet];
            }
            parser.hydrate(preHtml, this);
            return preHtml;
        }
        return ori;
    }

}

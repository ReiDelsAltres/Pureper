import Fetcher from "./Fetcher.js";
import UniHtml from "./component_api/UniHtml.js";
import { Router } from "./worker/Router.js";
import ServiceWorker from "./worker/ServiceWorker.js";
import Page from "./component_api/Page.js";
import Component from "./component_api/Component.js";
import { AnyConstructor, Constructor } from "./component_api/mixin/Proto.js";
import HMLEParser from "./HMLEParser.js";


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
    class?: AnyConstructor<UniHtml>;
}
export default class Triplet {
    public readonly markup?: Promise<string>;
    public readonly css?: Promise<string>;
    public readonly lightCss?: Promise<string>;
    public readonly js?: Promise<string>;

    private readonly markupURL?: string;
    private readonly cssURL?: string;
    private readonly ltCssURL?: string;
    private readonly jsURL?: string;

    private readonly access: AccessType;

    private uni?: AnyConstructor<UniHtml>;

    public constructor(struct: TripletStruct) {
        this.markupURL = struct.markupURL;
        this.cssURL = struct.cssURL;
        this.ltCssURL = struct.ltCssURL;
        this.jsURL = struct.jsURL;

        let markup = Promise.resolve(struct.markup);
        if (struct.markupURL)
            markup = Fetcher.fetchText(struct.markupURL);
        let css = Promise.resolve(struct.css);
        if (struct.cssURL)
            css = Fetcher.fetchText(struct.cssURL);
        let ltCss = Promise.resolve(struct.ltCss);
        if (struct.ltCssURL)
            ltCss = Fetcher.fetchText(struct.ltCssURL);
        /*let js = Promise.resolve(undefined);
        if (struct.jsURL)
            js = Fetcher.fetchText(struct.jsURL);*/

        this.markup = markup;
        this.css = css;
        this.lightCss = ltCss;
        //this.js = js;

        this.access = struct.access ?? AccessType.BOTH;

        this.uni = struct.class;
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
        if (this.lightCss) {
            var style = await new CSSStyleSheet().replace(await this.lightCss);
            document.adoptedStyleSheets = [
                ...document.adoptedStyleSheets,
                style
            ];
        }

        let ori = this.createInjectedClass(this.uni, type);

        if (type === "router") {
            const routePath = this.markupURL ?? "";
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
        const parser = new HMLEParser();

        proto._init = async function (): Promise<DocumentFragment> {
            const markupText = await that.markup;
            if (!markupText) return new DocumentFragment();
            return parser.parseToDOM(markupText, this);
        }

        proto._postInit = async function (preHtml: DocumentFragment): Promise<DocumentFragment> {
            const dmc: Document | ShadowRoot = this.shadowRoot ?? document;
            const css = await that.css;

            var style = await new CSSStyleSheet().replace(css);
            dmc.adoptedStyleSheets = [
                ...dmc.adoptedStyleSheets,
                style
            ];

            //parser.hydrate(preHtml, this);
            return preHtml;
        }

        return ori;
    }

}

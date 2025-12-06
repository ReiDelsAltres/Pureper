import Fetcher from "./Fetcher.js";
import UniHtml from "./component_api/UniHtml.js";
import { Router } from "./worker/Router.js";
import ServiceWorker from "./worker/ServiceWorker.js";
import Page from "./component_api/Page.js";
import Component from "./component_api/Component.js";
import { AnyConstructor, Constructor } from "./component_api/mixin/Proto.js";
import PHTMLParser from "./PHTMLParser.js";
import { HOSTING_ORIGIN } from "../index.js";

export default class Triplet<T extends UniHtml> implements ITriplet {
    private uni?: AnyConstructor<UniHtml>;
    private readonly access: AccessType;

    public readonly markup?: string;
    public readonly css?: string;
    public readonly js?: string;

    public readonly additionalFiles: Map<string, string> = new Map();

    public constructor(builder: TripletBuilder<T>) {
        this.markup = builder.markup;
        this.css = builder.css;
        this.js = builder.js;

        this.additionalFiles = builder.additionalFiles;

        this.uni = builder.uni;;
        this.access = builder.access;
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
        if (this.markup)
            await ServiceWorker.addToCache(this.markup);
        if (this.css)
            await ServiceWorker.addToCache(this.css);
        if (this.js)
            await ServiceWorker.addToCache(this.js);
        if (this.additionalFiles.size > 0) {
            for (const [type, filePath] of this.additionalFiles) {
                await ServiceWorker.addToCache(filePath);
            }
        }
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

        for (const [type, filePath] of this.additionalFiles) {
            if (type !== 'light-dom') continue;
            if (!filePath.endsWith(".css")) continue;

            const link = this.createLink(filePath);
            document.head.appendChild(link);

            console.info(`[Triplet]: Additional light-dom CSS file '${filePath}' added to document head.`);
        }

        let ori = this.createInjectedClass(this.uni);

        if (type === "router") {
            var reg = Router.registerRoute(this.markup!, name, (search) => {
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
                const unn : UniHtml = new ori(...args);

                return unn;
            });

            console.info(`[Triplet]` + `: Router route '${name}' registered for path '${this.markup}' by class ${ori}.`);
            return reg.then(() => true).catch(() => false);
        } else if (type === "markup") {
            if (customElements.get(name)) throw new Error(`Custom element '${name}' is already defined.`);
            customElements.define(name, ori.prototype.constructor as CustomElementConstructor);

            console.info(`[Triplet]: Custom element '${name}' defined.`);
            return Promise.resolve(true);
        }
        return Promise.resolve(false);
    }
    private createInjectedClass(c: AnyConstructor<UniHtml>): any {
        let that = this;
        let ori = class extends c {
            constructor(...args: any[]) {
                super(...args);
            }
        };
        let proto = ori.prototype as any;
        proto._init = async function () {
            ///
            const fullPath = that.markup!;
            var markup = "";
            if (fullPath.endsWith(".phtml")) {
                const parser = new PHTMLParser();
                markup = parser.parse(await Fetcher.fetchText(fullPath), this);
            } else {
                markup = await Fetcher.fetchText(fullPath);
            }
            ///
            return markup;
        }
        proto._postInit = async function (preHtml: string): Promise<string> {
            if (that.css) {
                const link = that.createLink(that.css);
                preHtml = link.outerHTML + "\n" + preHtml;
            }
            for (const [type, filePath] of that.additionalFiles) {
                if (!filePath.endsWith(".css")) continue;
                if (type !== 'light-dom') {
                    const link = that.createLink(filePath);
                    preHtml = link.outerHTML + "\n" + preHtml;
                }
            }
            return preHtml;
        }
        return ori;
    }

}

interface ITriplet {
    readonly markup?: string;
    readonly css?: string;
    readonly js?: string;
}

export enum AccessType {
    NONE = 0,
    OFFLINE = 1 << 0,
    ONLINE = 1 << 1,
    BOTH = OFFLINE | ONLINE
}

export class TripletBuilder<T extends UniHtml> implements ITriplet {
    public uni?: AnyConstructor<UniHtml>;
    public access: AccessType = AccessType.BOTH;

    public readonly additionalFiles: Map<string, string> = new Map();

    private constructor(
        public readonly markup?: string,
        public readonly css?: string,
        public readonly js?: string
    ) { }

    public static create<T extends UniHtml>(markup?: string, css?: string, js?: string): TripletBuilder<T> {
        let urlHtml: URL = markup ? new URL(`${HOSTING_ORIGIN}/${markup}`,HOSTING_ORIGIN) : null;
        let urlCss: URL = css ? new URL(`${HOSTING_ORIGIN}/${css}`, HOSTING_ORIGIN) : null;
        let urlJs: URL = js ? new URL(`${HOSTING_ORIGIN}/${js}`, HOSTING_ORIGIN) : null;

        return new TripletBuilder(urlHtml?.href, urlCss?.href, urlJs?.href);
    }
    
    public withUni(cls: AnyConstructor<UniHtml>): TripletBuilder<T> {
        this.uni = cls;
        return this;
    }
    public withAccess(access: AccessType): TripletBuilder<T> {
        this.access = access;
        return this;
    }
    public withLightDOMCss(css: string): TripletBuilder<T> {
        let urlCss: URL = css ? new URL(`${HOSTING_ORIGIN}/${css}`, HOSTING_ORIGIN) : null;
        this.additionalFiles.set('light-dom', urlCss?.href);
        return this;
    }

    public build(): Triplet<T> {
        return new Triplet<T>(this);
    }
}

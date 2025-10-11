import { EmptyConstructor } from "./api/EmptyConstructor.js";
import Fetcher from "./Fetcher.js";
import UniHtml, { UniHtmlCompleted } from "./component_api/UniHtml.js";
import { Router } from "./worker/Router.js";
import ServiceWorker from "./worker/ServiceWorker.js";

export default class Triplet<T extends UniHtml> implements ITriplet {
    private readonly uni: EmptyConstructor<T>;
    private readonly access: AccessType;

    public readonly html?: string;
    public readonly css?: string;
    public readonly js?: string;

    public readonly additionalFiles: Map<string, string> = new Map();

    public constructor(builder: TripletBuilder<T>) {
        this.html = builder.html;
        this.css = builder.css;
        this.js = builder.js;

        this.additionalFiles = builder.additionalFiles;

        this.uni = builder.uni;;
        this.access = builder.access;
    }

    public async init(): Promise<boolean> {
        const isOnline: boolean = await ServiceWorker.isOnline();

        if (this.access === AccessType.NONE) return false;
        if (this.access === AccessType.OFFLINE && isOnline) return false;
        if (this.access === AccessType.ONLINE && !isOnline) return false;

        return true;
    }

    public async cache(): Promise<void> {
        if (this.html)
            await ServiceWorker.addToCache(this.html);
        if (this.css)
            await ServiceWorker.addToCache(this.css);
        if (this.js)
            await ServiceWorker.addToCache(this.js);
        if (this.additionalFiles.size > 0) {
            for (const [type,filePath] of this.additionalFiles) {
                await ServiceWorker.addToCache(filePath);
            }
        }
    }
    

    public register(type: "router" | "markup", name: string): void {
        if (!this.uni) throw new Error("[Triplet]: UniHtml component not provided.");

        function createLink(cssPath: string): HTMLLinkElement {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = cssPath.startsWith('./') ? cssPath :
                (window as any).RouterConfig.ASSET_PATH + cssPath;
            return link;
        }

        for (const [type,filePath] of this.additionalFiles) {
            if (type !== 'light-dom') continue;
            if (!filePath.endsWith(".css")) continue;

            const link = createLink(filePath);
            document.head.appendChild(link);

            console.info(`[Triplet]: Additional light-dom CSS file '${filePath}' added to document head.`);
        }

        const spClass = this.uni.prototype;
        const that = this;
        spClass.init = function () {
            const fullPath = that.html!.startsWith('./') ? that.html :
                (window as any).RouterConfig.ASSET_PATH + that.html;
            return Fetcher.fetchText(fullPath);
        };
        spClass._postInit = async function (preHtml: string): Promise<string> {
            if (that.css) {
                const link = createLink(that.css);
                preHtml = link.outerHTML + "\n" + preHtml;
            }
            for (const [type,filePath] of that.additionalFiles) {
                if (!filePath.endsWith(".css")) continue;
                if (type !== 'light-dom') {
                    const link = createLink(filePath);
                    preHtml = link.outerHTML + "\n" + preHtml;
                }
            }
            return preHtml;
        }

        if (type === "router") {
            Router.registerRoute(this.html!, name, () => new spClass.constructor);

            console.info(`[Triplet]: Router route '${name}' registered for path '${this.html}'.`);
            //throw new Error("Triplet: Router type registration not implemented.");

        } else if (type === "markup") {
            if (customElements.get(name)) throw new Error(`Custom element '${name}' is already defined.`);
            customElements.define(name, spClass.constructor as CustomElementConstructor);

            console.info(`[Triplet]: Custom element '${name}' defined.`);

        }
    }

}

interface ITriplet {
    readonly html?: string;
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
    public uni: EmptyConstructor<T> = UniHtml as EmptyConstructor<T>;
    public access: AccessType = AccessType.BOTH;

    public readonly additionalFiles: Map<string, string> = new Map();

    private constructor(
        public readonly html?: string,
        public readonly css?: string,
        public readonly js?: string
    ) { }

    public static create<T extends UniHtml>(html?: string, css?: string, js?: string): TripletBuilder<T> {
        return new TripletBuilder(html, css, js);
    }

    public withUni(cls: EmptyConstructor<T>): TripletBuilder<T> {
        this.uni = cls;
        return this;
    }
    public withAccess(access: AccessType): TripletBuilder<T> {
        this.access = access;
        return this;
    }
    public withLightDOMCss(css: string): TripletBuilder<T> {
        this.additionalFiles.set('light-dom', css);
        return this;
    }

    public build(): Triplet<T> {
        return new Triplet<T>(this);
    }
}

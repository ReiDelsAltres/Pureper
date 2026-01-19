import Fetcher from "./Fetcher.js";
import { Router } from "./worker/Router.js";
import ServiceWorker from "./worker/ServiceWorker.js";
import Page from "./component_api/Page.js";
import Component from "./component_api/Component.js";
import TemplateEngine from "./engine/TemplateEngine.js";
import Scope from "./engine/Scope.js";
export var AccessType;
(function (AccessType) {
    AccessType[AccessType["NONE"] = 0] = "NONE";
    AccessType[AccessType["OFFLINE"] = 1] = "OFFLINE";
    AccessType[AccessType["ONLINE"] = 2] = "ONLINE";
    AccessType[AccessType["BOTH"] = 3] = "BOTH";
})(AccessType || (AccessType = {}));
export default class Triplet {
    markup;
    css;
    lightCss;
    js;
    markupURL;
    cssURL;
    ltCssURL;
    jsURL;
    access;
    uni;
    constructor(struct) {
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
    async init() {
        const isOnline = await ServiceWorker.isOnline();
        if (this.access === AccessType.NONE)
            return false;
        if (this.access === AccessType.BOTH) {
            await this.cache();
            return true;
        }
        ;
        if (this.access === AccessType.OFFLINE && isOnline)
            return false;
        if (this.access === AccessType.ONLINE && !isOnline)
            return false;
        return true;
    }
    async cache() {
        //
    }
    async register(type, name) {
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
                    if (!argsMatch)
                        return [];
                    return argsMatch[1].split(',').map(s => s.trim()).filter(Boolean);
                })();
                const args = paramNames.map(name => {
                    return search?.get(name);
                });
                return new ori(...args);
            });
            console.info(`[Triplet]` + `: Router route '${name}' registered for path '${routePath}' by class ${ori}.`);
            return reg.then(() => true).catch(() => false);
        }
        else if (type === "markup") {
            if (customElements.get(name))
                throw new Error(`Custom element '${name}' is already defined.`);
            customElements.define(name, ori.prototype.constructor);
            console.info(`[Triplet]: Custom element '${name}' defined.`);
            return Promise.resolve(true);
        }
        return Promise.resolve(false);
    }
    createInjectedClass(c, type) {
        let that = this;
        let ori = class extends c {
            constructor(...args) {
                super(...args);
            }
        };
        let proto = ori.prototype;
        const parser = new TemplateEngine();
        proto._init = async function () {
            const markupText = await that.markup;
            return TemplateEngine.createHolder(markupText, Scope.from(this));
        };
        proto._postInit = async function (preHtml) {
            const dmc = this.shadowRoot ?? document;
            const css = await that.css;
            var style = await new CSSStyleSheet().replace(css);
            dmc.adoptedStyleSheets = [
                ...dmc.adoptedStyleSheets,
                style
            ];
            //parser.hydrate(preHtml, this);
            return preHtml;
        };
        return ori;
    }
}
//# sourceMappingURL=Triplet.js.map
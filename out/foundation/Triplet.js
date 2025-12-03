import Fetcher from "./Fetcher.js";
import { Router } from "./worker/Router.js";
import ServiceWorker from "./worker/ServiceWorker.js";
import Page from "./component_api/Page.js";
import Component from "./component_api/Component.js";
import PHTMLParser from "./PHTMLParser.js";
import { HOSTING_ORIGIN } from "../index.js";
export default class Triplet {
    uni;
    access;
    markup;
    css;
    js;
    additionalFiles = new Map();
    constructor(builder) {
        this.markup = builder.markup;
        this.css = builder.css;
        this.js = builder.js;
        this.additionalFiles = builder.additionalFiles;
        this.uni = builder.uni;
        ;
        this.access = builder.access;
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
    createLink(cssPath) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        ///
        link.href = cssPath;
        ///
        return link;
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
        for (const [type, filePath] of this.additionalFiles) {
            if (type !== 'light-dom')
                continue;
            if (!filePath.endsWith(".css"))
                continue;
            const link = this.createLink(filePath);
            document.head.appendChild(link);
            console.info(`[Triplet]: Additional light-dom CSS file '${filePath}' added to document head.`);
        }
        let ori = this.createInjectedClass(this.uni);
        if (type === "router") {
            var reg = Router.registerRoute(this.markup, name, (search) => {
                const paramNames = (() => {
                    const ctor = this.uni.prototype.constructor;
                    const fnStr = ctor.toString();
                    const argsMatch = fnStr.match(/constructor\s*\(([^)]*)\)/);
                    if (!argsMatch)
                        return [];
                    return argsMatch[1].split(',').map(s => s.trim()).filter(Boolean);
                })();
                const args = paramNames.map(name => {
                    const string = search?.get(name);
                    return search?.get(name);
                });
                const unn = new ori(...args);
                return unn;
            });
            console.info(`[Triplet]` + `: Router route '${name}' registered for path '${this.markup}' by class ${ori}.`);
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
    createInjectedClass(c) {
        let that = this;
        let ori = class extends c {
            constructor(...args) {
                super(...args);
            }
        };
        let proto = ori.prototype;
        proto._init = async function () {
            ///
            const fullPath = that.markup;
            var markup = "";
            if (fullPath.endsWith(".phtml")) {
                const parser = new PHTMLParser();
                markup = parser.parse(await Fetcher.fetchText(fullPath), this);
            }
            else {
                markup = await Fetcher.fetchText(fullPath);
            }
            ///
            return markup;
        };
        proto._postInit = async function (preHtml) {
            if (that.css) {
                const link = that.createLink(that.css);
                preHtml = link.outerHTML + "\n" + preHtml;
            }
            for (const [type, filePath] of that.additionalFiles) {
                if (!filePath.endsWith(".css"))
                    continue;
                if (type !== 'light-dom') {
                    const link = that.createLink(filePath);
                    preHtml = link.outerHTML + "\n" + preHtml;
                }
            }
            return preHtml;
        };
        return ori;
    }
}
export var AccessType;
(function (AccessType) {
    AccessType[AccessType["NONE"] = 0] = "NONE";
    AccessType[AccessType["OFFLINE"] = 1] = "OFFLINE";
    AccessType[AccessType["ONLINE"] = 2] = "ONLINE";
    AccessType[AccessType["BOTH"] = 3] = "BOTH";
})(AccessType || (AccessType = {}));
export class TripletBuilder {
    markup;
    css;
    js;
    uni;
    access = AccessType.BOTH;
    additionalFiles = new Map();
    constructor(markup, css, js) {
        this.markup = markup;
        this.css = css;
        this.js = js;
    }
    static create(markup, css, js) {
        let urlHtml = markup ? new URL(markup, HOSTING_ORIGIN) : null;
        let urlCss = css ? new URL(css, HOSTING_ORIGIN) : null;
        let urlJs = js ? new URL(js, HOSTING_ORIGIN) : null;
        return new TripletBuilder(urlHtml?.href, urlCss?.href, urlJs?.href);
    }
    withUni(cls) {
        this.uni = cls;
        return this;
    }
    withAccess(access) {
        this.access = access;
        return this;
    }
    withLightDOMCss(css) {
        let urlCss = css ? new URL(css, HOSTING_ORIGIN) : null;
        this.additionalFiles.set('light-dom', urlCss?.href);
        return this;
    }
    build() {
        return new Triplet(this);
    }
}
//# sourceMappingURL=Triplet.js.map
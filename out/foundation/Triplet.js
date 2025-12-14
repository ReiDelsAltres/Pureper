import Fetcher from "./Fetcher.js";
import { Router } from "./worker/Router.js";
import ServiceWorker from "./worker/ServiceWorker.js";
import Page from "./component_api/Page.js";
import Component from "./component_api/Component.js";
import HMLEParserReborn from "./HMLEParserReborn.js";
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
    lightCssApplied = false;
    componentCssTextPromise;
    componentCssSheetPromise;
    constructor(struct) {
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
    async getMarkupText() {
        if (this.markup)
            return this.markup;
        if (this.markupURL)
            return Fetcher.fetchText(this.markupURL);
        return undefined;
    }
    async getLightCssText() {
        if (this.lightCss)
            return this.lightCss;
        if (this.ltCssURL)
            return Fetcher.fetchText(this.ltCssURL);
        return undefined;
    }
    async getComponentCssText() {
        if (this.css)
            return this.css;
        if (!this.cssURL)
            return undefined;
        this.componentCssTextPromise = this.componentCssTextPromise ?? Fetcher.fetchText(this.cssURL);
        return this.componentCssTextPromise;
    }
    async getComponentCssSheet() {
        if (this.componentCssSheetPromise)
            return this.componentCssSheetPromise;
        this.componentCssSheetPromise = (async () => {
            const cssText = await this.getComponentCssText();
            if (!cssText)
                return null;
            const sheet = new CSSStyleSheet();
            await sheet.replace(cssText);
            return sheet;
        })();
        return this.componentCssSheetPromise;
    }
    static canUseConstructableStylesheets(target) {
        try {
            return (typeof CSSStyleSheet !== "undefined" &&
                typeof CSSStyleSheet.prototype?.replace === "function" &&
                typeof target.adoptedStyleSheets !== "undefined" &&
                Array.isArray(target.adoptedStyleSheets));
        }
        catch {
            return false;
        }
    }
    static ensureInlineStyle(target, key, cssText) {
        const container = (target instanceof Document)
            ? (target.head ?? target.documentElement)
            : target;
        const selector = `style[data-triplet-css="${CSS.escape(key)}"]`;
        const existing = container.querySelector?.(selector);
        if (existing)
            return;
        const styleEl = document.createElement("style");
        styleEl.setAttribute("data-triplet-css", key);
        styleEl.textContent = cssText;
        container.appendChild(styleEl);
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
                }
                else {
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
        const parser = new HMLEParserReborn();
        proto._init = async function () {
            const markupText = await that.getMarkupText();
            if (!markupText)
                return new DocumentFragment();
            return parser.parseToDOM(markupText, this);
        };
        proto._postInit = async function (preHtml) {
            const dmc = this.shadowRoot ?? document;
            const cssText = await that.getComponentCssText();
            if (cssText) {
                const key = that.cssURL ?? "component-inline";
                if (Triplet.canUseConstructableStylesheets(dmc)) {
                    const cssSheet = await that.getComponentCssSheet();
                    if (cssSheet) {
                        const sheets = dmc.adoptedStyleSheets;
                        if (!sheets.includes(cssSheet)) {
                            dmc.adoptedStyleSheets = [...sheets, cssSheet];
                        }
                    }
                }
                else {
                    Triplet.ensureInlineStyle(dmc, key, cssText);
                }
            }
            parser.hydrate(preHtml, this);
            return preHtml;
        };
        return ori;
    }
}
//# sourceMappingURL=Triplet.js.map
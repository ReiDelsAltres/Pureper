import Fetcher from "./Fetcher.js";
import { Router } from "./worker/Router.js";
import ServiceWorker from "./worker/ServiceWorker.js";
import Page from "./component_api/Page.js";
import Component from "./component_api/Component.js";
export default class Triplet {
    constructor(builder) {
        this.additionalFiles = new Map();
        this.html = builder.html;
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
        if (this.access === AccessType.OFFLINE && isOnline)
            return false;
        if (this.access === AccessType.ONLINE && !isOnline)
            return false;
        return true;
    }
    async cache() {
        if (this.html)
            await ServiceWorker.addToCache(this.html);
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
        function createLink(cssPath) {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = cssPath.startsWith('./') ? cssPath :
                window.RouterConfig.ASSET_PATH + cssPath;
            return link;
        }
        for (const [type, filePath] of this.additionalFiles) {
            if (type !== 'light-dom')
                continue;
            if (!filePath.endsWith(".css"))
                continue;
            const link = createLink(filePath);
            document.head.appendChild(link);
            console.info(`[Triplet]: Additional light-dom CSS file '${filePath}' added to document head.`);
        }
        let that = this;
        let ori = class extends this.uni {
        };
        let proto = ori.prototype;
        proto.init = function () {
            const fullPath = that.html.startsWith('./') ? that.html :
                window.RouterConfig.ASSET_PATH + that.html;
            return Fetcher.fetchText(fullPath);
        };
        proto._postInit = async function (preHtml) {
            if (that.css) {
                const link = createLink(that.css);
                preHtml = link.outerHTML + "\n" + preHtml;
            }
            for (const [type, filePath] of that.additionalFiles) {
                if (!filePath.endsWith(".css"))
                    continue;
                if (type !== 'light-dom') {
                    const link = createLink(filePath);
                    preHtml = link.outerHTML + "\n" + preHtml;
                }
            }
            return preHtml;
        };
        if (type === "router") {
            var reg = Router.registerRoute(this.html, name, (hash) => {
                return new ori();
            });
            console.info(`[Triplet]` + `: Router route '${name}' registered for path '${this.html}' by class ${ori}.`);
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
}
export var AccessType;
(function (AccessType) {
    AccessType[AccessType["NONE"] = 0] = "NONE";
    AccessType[AccessType["OFFLINE"] = 1] = "OFFLINE";
    AccessType[AccessType["ONLINE"] = 2] = "ONLINE";
    AccessType[AccessType["BOTH"] = 3] = "BOTH";
})(AccessType || (AccessType = {}));
export class TripletBuilder {
    constructor(html, css, js) {
        this.html = html;
        this.css = css;
        this.js = js;
        this.access = AccessType.BOTH;
        this.additionalFiles = new Map();
    }
    static create(html, css, js) {
        return new TripletBuilder(html, css, js);
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
        this.additionalFiles.set('light-dom', css);
        return this;
    }
    build() {
        return new Triplet(this);
    }
}
//# sourceMappingURL=Triplet.js.map
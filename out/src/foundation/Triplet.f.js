import ServiceWorker from "./worker/ServiceWorker.js";
export class Triplet extends HTMLElement {
    static get observedAttributes() {
        return ["html", "css", "js", "profile"];
    }
    constructor() {
        super();
    }
    async importCSS(path) {
        try {
            const link = document.createElement("link");
            link.rel = "stylesheet";
            link.href = path;
            this.appendChild(link);
        }
        catch (e) {
            console.error("Module: Ошибка загрузки CSS:", path, e);
        }
    }
    async importJS(path) {
        try {
            const script = document.createElement("script");
            script.src = path;
            script.type = "module";
            script.defer = true;
            this.appendChild(script);
        }
        catch (e) {
            console.error("Module: Ошибка загрузки JS:", path, e);
        }
    }
    async connectedCallback() {
        const htmlPath = this.getAttribute("html");
        if (htmlPath) {
            await ServiceWorker.addToCache(htmlPath);
        }
        const cssPath = this.getAttribute("css");
        if (cssPath) {
            await ServiceWorker.addToCache(cssPath);
            this.importCSS(cssPath);
        }
        const jsPath = this.getAttribute("js");
        if (jsPath) {
            await ServiceWorker.addToCache(jsPath);
            this.importJS(jsPath);
        }
    }
}
customElements.define('triplet-set', Triplet);
//# sourceMappingURL=Triplet.f.js.map
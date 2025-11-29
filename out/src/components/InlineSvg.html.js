import Component from "../foundation/component_api/Component.js";
import Fetcher from "../foundation/Fetcher.js";
export default class InlineSvg extends Component {
    constructor() {
        super(...arguments);
        this.slotElement = null;
        this.currentFetchId = 0;
    }
    static get observedAttributes() {
        return ["src", "alt", "decorative", "focusable", "preserve-dimensions"];
    }
    async preLoad(holder) {
        this.slotElement = holder.element.querySelector(".svg-slot");
        if (!this.slotElement) {
            console.error("InlineSvg: .svg-slot element is missing in template");
            return;
        }
        this.setupAttributeWatchers();
        await this.loadSvgFromAttribute();
    }
    setupAttributeWatchers() {
        this.onAttributeChangedCallback((name, oldValue, newValue) => {
            if (oldValue === newValue) {
                return;
            }
            if (name === "src") {
                void this.loadSvgFromAttribute();
            }
            if (name === "alt" || name === "decorative" || name === "focusable") {
                this.updateAccessibility();
            }
        });
    }
    async loadSvgFromAttribute() {
        if (!this.slotElement) {
            return;
        }
        const src = this.getAttribute("src");
        if (!src) {
            this.slotElement.innerHTML = "";
            this.slotElement.setAttribute("aria-hidden", "true");
            return;
        }
        const fetchId = ++this.currentFetchId;
        try {
            this.slotElement.dataset.state = "loading";
            const svgMarkup = await Fetcher.fetchText(src);
            if (fetchId !== this.currentFetchId) {
                return;
            }
            const parser = new DOMParser();
            const documentFragment = parser.parseFromString(svgMarkup, "image/svg+xml");
            const svgElement = documentFragment.querySelector("svg");
            if (!svgElement) {
                throw new Error("InlineSvg: fetched content does not contain <svg>");
            }
            if (!this.hasAttribute("preserve-dimensions")) {
                svgElement.removeAttribute("width");
                svgElement.removeAttribute("height");
            }
            svgElement.setAttribute("part", "svg");
            svgElement.classList.add("inline-svg");
            this.slotElement.replaceChildren(svgElement);
            this.updateAccessibility();
            delete this.slotElement.dataset.state;
        }
        catch (error) {
            if (fetchId !== this.currentFetchId) {
                return;
            }
            console.error("InlineSvg: failed to load SVG", error);
            this.slotElement.innerHTML = "";
            this.slotElement.dataset.state = "error";
            this.slotElement.setAttribute("aria-hidden", "true");
        }
    }
    updateAccessibility() {
        if (!this.slotElement) {
            return;
        }
        const svgElement = this.slotElement.querySelector("svg");
        if (!svgElement) {
            return;
        }
        if (this.hasAttribute("decorative")) {
            svgElement.setAttribute("aria-hidden", "true");
            svgElement.removeAttribute("role");
            svgElement.removeAttribute("aria-label");
            return;
        }
        const altText = this.getAttribute("alt");
        const focusableAttr = this.getAttribute("focusable");
        if (altText && altText.trim().length > 0) {
            svgElement.setAttribute("role", "img");
            svgElement.setAttribute("aria-label", altText.trim());
            this.slotElement.setAttribute("aria-hidden", "false");
        }
        else {
            svgElement.removeAttribute("role");
            svgElement.removeAttribute("aria-label");
            svgElement.setAttribute("aria-hidden", "true");
            this.slotElement.setAttribute("aria-hidden", "true");
        }
        if (focusableAttr !== null) {
            const focusableValue = focusableAttr === "true" || focusableAttr === "" ? "true" : "false";
            svgElement.setAttribute("focusable", focusableValue);
        }
        else {
            svgElement.removeAttribute("focusable");
        }
    }
}
//# sourceMappingURL=InlineSvg.html.js.map
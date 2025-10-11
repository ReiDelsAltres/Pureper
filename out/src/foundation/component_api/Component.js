import UniHtml from "../component_api/UniHtml.js";
import { Class } from "./mixin/Proto.js";
export default class Component extends Class(HTMLElement).extend(UniHtml).build() {
    constructor() {
        super();
    }
    onConnected() {
    }
    onDisconnected() {
    }
    onMoved() {
    }
    onAdopted() {
    }
    onAttributeChanged(name, oldValue, newValue) {
    }
    onAttributeChangedCallback(callback) {
        this._attributeChangedCallbacks = this._attributeChangedCallbacks ?? [];
        this._attributeChangedCallbacks.push(callback);
    }
    /**
     * @deprecated Use onConnected instead.
     */
    connectedCallback() {
        this.attachShadow({ mode: 'open' });
        const wrapper = document.createElement('div');
        this.onConnected();
        this.load(wrapper);
    }
    render(element, renderTarget) {
        (this.getMixin(UniHtml)?.instance.get()).render(element, renderTarget);
        //super.render(element, renderTarget);
        this.shadowRoot.appendChild(renderTarget);
        return Promise.resolve();
    }
    /**
     * @deprecated Use onDisconnected instead.
     */
    disconnectedCallback() {
        this.onDisconnected();
    }
    /**
     * @deprecated Use onMoved instead.
     */
    connectedMoveCallback() {
        this.onMoved();
    }
    /**
     * @deprecated Use onAdopted instead.
     */
    adoptedCallback() {
        this.onAdopted();
    }
    /**
     * @deprecated Use onAttributeChanged instead.
     */
    attributeChangedCallback(name, oldValue, newValue) {
        this.onAttributeChanged(name, oldValue, newValue);
        this._attributeChangedCallbacks?.forEach(cb => cb(name, oldValue, newValue));
    }
}
//# sourceMappingURL=Component.js.map
import { Class } from "./mixin/Proto.js";
import UniHtml from "./UniHtml.js";
export default class Page extends Class(EventTarget).extend(UniHtml).build() {
    constructor() {
        super();
        this._status.subscribe((data) => this.dispatchEvent(new CustomEvent('status-change', { detail: { status: data } })));
        this._status.setObject("constructed");
    }
}
//# sourceMappingURL=Page.js.map
import { UniHtmlComponent } from '../foundation/component_api/UniHtml.js';
export default class NavigationDrawer extends UniHtmlComponent {
    static get observedAttributes() {
        return [
            "state", "default-state"
        ];
    }
    preLoad(holder) {
        this.updateState();
        return Promise.resolve();
    }
    updateState() {
        const defaultState = this.getAttribute('default-state') ?? 'mini';
        if (!this.hasAttribute('state')) {
            this.setAttribute('state', defaultState);
        }
        this.onmouseover = () => {
            this.setAttribute('state', 'open');
        };
        this.onmouseout = () => {
            this.setAttribute('state', defaultState);
        };
    }
}
//# sourceMappingURL=NavigationDrawer.html.js.map
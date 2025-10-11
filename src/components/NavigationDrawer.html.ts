import IElementHolder from '../foundation/api/ElementHolder.js';
import { UniHtmlComponent } from '../foundation/component_api/UniHtml.js';

type DrawerState = 'mini' | 'open';

export default class NavigationDrawer extends UniHtmlComponent {
    static get observedAttributes() {
        return [
            "state", "default-state"
        ];
    }
    protected preLoad(holder: IElementHolder): Promise<void> {
        this.updateState();

        return Promise.resolve();
    }

    private updateState() {
        const defaultState = this.getAttribute('default-state') as DrawerState ?? 'mini';
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
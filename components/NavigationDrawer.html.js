import Component from '../src/foundation/Component.js';

class NavigationDrawer extends Component {
    static get observedAttributes() {
        return ['state'];
    }

    constructor() {
        super('components/NavigationDrawer.html');
    }

    /**
     * Drawer state: 'mini', 'open'
     */
    get state() {
        return this.getAttribute('state') || 'mini';
    }
    set state(val) {
        if (["mini", "open"].includes(val)) {
            this.setAttribute('state', val);
            sessionStorage.setItem('navigationDrawerState', val);
        } else {
            this.setAttribute('state', 'mini');
            sessionStorage.setItem('navigationDrawerState', 'mini');
        }
    }


    /**
     * Called after template and styles are loaded (instead of connectedCallback)
     */
    init() {
        // Always force state from sessionStorage (even if attribute is set in HTML)
        const saved = sessionStorage.getItem('navigationDrawerState');
        if (saved && ["mini", "open"].includes(saved)) {
            this.setAttribute('state', saved);
        } else {
            // Save initial state if not present
            sessionStorage.setItem('navigationDrawerState', this.state);
        }
        this._updateDrawer();
        this.onAttributeChanged((name, oldValue, newValue) => {
            if (name === 'state' && oldValue !== newValue) {
                this._updateDrawer();
                sessionStorage.setItem('navigationDrawerState', this.state);
            }
        });
        this.addEventListener('mouseenter', () => {
            this.state = 'open';
        });
        this.addEventListener('mouseleave', () => {
            this.state = 'mini';
        });
        // Listen for sessionStorage changes (cross-tab)
        window.addEventListener('storage', (e) => {
            if (e.key === 'navigationDrawerState' && e.newValue && ["mini", "open"].includes(e.newValue)) {
                if (this.state !== e.newValue) {
                    this.setAttribute('state', e.newValue);
                }
            }
        });
    }

    _updateDrawer() {
        const nav = this.shadowRoot && this.shadowRoot.querySelector('.m3-navigation-drawer');
        if (!nav) return;
        nav.classList.remove('open', 'mini');
        nav.classList.add(this.state);
    }
}
customElements.define('navigation-drawer', NavigationDrawer);
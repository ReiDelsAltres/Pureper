import Component from '../src/foundation/Component.js';


class PageLayout extends Component {
    constructor() {
        super('components/PageLayout.html');
    }

    init() {
        this._setupNavigationListener();
    }


    _setupNavigationListener() {
        // Находим NavigationDrawer в слоте navigation
        const navigationSlot = this.shadowRoot?.querySelector('slot[name="navigation"]');
        if (navigationSlot) {
            const processNavigationElements = () => {
                const navigationElements = navigationSlot.assignedElements();
                navigationElements.forEach(element => {
                    if (element.tagName.toLowerCase() !== 'navigation-drawer') return;

                    this._updateMainContentShift(element.state);

                    element.onAttributeChanged((name, oldValue, newValue) => {
                        if (name === 'state') {
                            this._updateMainContentShift(element.state);
                        }
                    });
                });
            };
            processNavigationElements();
            navigationSlot.addEventListener('slotchange', processNavigationElements);
        }
    }

    _updateMainContentShift(drawerState) {
        const mainContent = this.shadowRoot?.querySelector('.page-layout__main-content');
        if (mainContent) {
            mainContent.classList.toggle('shifted', drawerState === 'open');
            mainContent.classList.toggle('mini', drawerState === 'mini');
        }
    }
}

customElements.define('page-layout', PageLayout);

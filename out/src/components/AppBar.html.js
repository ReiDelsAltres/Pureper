import Component from "../foundation/component_api/Component.js";
export default class AppBar extends Component {
    constructor() {
        super(...arguments);
        // Toggle button drives the NavigationDrawer state so both components stay in sync.
        this.handleToggleClick = () => {
            const drawer = this.ensureDrawer();
            if (!drawer) {
                return;
            }
            const nextState = this.getDrawerState(drawer) === "open" ? "mini" : "open";
            drawer.setAttribute("state", nextState);
            this.updateTogglePresentation(nextState);
            this.dispatchEvent(new CustomEvent("drawer-toggle", {
                detail: { state: nextState, target: drawer },
                bubbles: true,
                composed: true
            }));
        };
    }
    static get observedAttributes() {
        return ["title", "drawer-target", "hide-toggle"];
    }
    preLoad(holder) {
        this.toggleButton = holder.element.querySelector('[data-action="toggle"]') ?? undefined;
        this.titleText = holder.element.querySelector('[data-role="title-text"]') ?? undefined;
        this.syncTitle();
        this.syncToggleVisibility();
        this.bindDrawer();
        queueMicrotask(() => this.bindDrawer());
        if (this.toggleButton) {
            this.toggleButton.addEventListener("click", this.handleToggleClick);
        }
        this.onAttributeChangedCallback((name) => {
            if (name === "title") {
                this.syncTitle();
            }
            if (name === "hide-toggle") {
                this.syncToggleVisibility();
            }
            if (name === "drawer-target") {
                this.bindDrawer();
            }
        });
        return Promise.resolve();
    }
    onDisconnected() {
        if (this.toggleButton) {
            this.toggleButton.removeEventListener("click", this.handleToggleClick);
        }
        this.drawerObserver?.disconnect();
        this.drawerObserver = undefined;
    }
    bindDrawer() {
        const selector = this.getAttribute("drawer-target") ?? "navigation-drawer";
        const drawer = document.querySelector(selector);
        if (!drawer) {
            this.drawer = undefined;
            this.updateToggleAvailability(false);
            return null;
        }
        if (drawer !== this.drawer) {
            this.drawerObserver?.disconnect();
            this.drawer = drawer;
            this.drawerObserver = new MutationObserver(() => this.updateTogglePresentation());
            this.drawerObserver.observe(drawer, { attributes: true, attributeFilter: ["state"] });
        }
        this.updateToggleAvailability(true);
        this.updateTogglePresentation();
        return drawer;
    }
    ensureDrawer() {
        return this.drawer ?? this.bindDrawer();
    }
    updateToggleAvailability(isAvailable) {
        if (!this.toggleButton) {
            return;
        }
        if (isAvailable) {
            this.toggleButton.removeAttribute("disabled");
            this.toggleButton.removeAttribute("aria-disabled");
        }
        else {
            this.toggleButton.setAttribute("disabled", "");
            this.toggleButton.setAttribute("aria-disabled", "true");
        }
        this.syncToggleVisibility();
    }
    updateTogglePresentation(state) {
        if (!this.toggleButton) {
            return;
        }
        const drawer = this.drawer;
        const effectiveState = state ?? (drawer ? this.getDrawerState(drawer) : "mini");
        const isOpen = effectiveState === "open";
        this.toggleButton.setAttribute("aria-expanded", isOpen ? "true" : "false");
        this.toggleButton.classList.toggle("app-bar__toggle--active", isOpen);
    }
    getDrawerState(drawer) {
        return drawer.getAttribute("state") ?? drawer.getAttribute("default-state") ?? "mini";
    }
    syncTitle() {
        if (!this.titleText) {
            return;
        }
        const title = this.getAttribute("title");
        if (title !== null) {
            this.titleText.textContent = title;
        }
    }
    syncToggleVisibility() {
        if (!this.toggleButton) {
            return;
        }
        if (this.hasAttribute("hide-toggle")) {
            this.toggleButton.setAttribute("hidden", "");
        }
        else {
            this.toggleButton.removeAttribute("hidden");
        }
    }
}
//# sourceMappingURL=AppBar.html.js.map
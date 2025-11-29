const globals = self;
export var AccessType;
(function (AccessType) {
    AccessType[AccessType["OFFLINE"] = 0] = "OFFLINE";
    AccessType[AccessType["ONLINE"] = 1] = "ONLINE";
    AccessType[AccessType["BOTH"] = 2] = "BOTH";
})(AccessType || (AccessType = {}));
export const ROUTES = [];
export const TO_CACHE = [];
export class Router {
    static savePersistedRoute(url) {
        try {
            sessionStorage.setItem("spa:persisted-route", url.toJSON());
        }
        catch (error) {
            console.warn("[Router Init]: Unable to access sessionStorage.", error);
        }
    }
    static getPersistedRoute() {
        try {
            const item = sessionStorage.getItem("spa:persisted-route");
            return item ? URL.parse(item) : null;
        }
        catch (error) {
            console.warn("[Router Init]: Unable to access sessionStorage.", error);
            return null;
        }
    }
    static clearPersistedRoute() {
        try {
            sessionStorage.removeItem("spa:persisted-route");
        }
        catch (error) {
            console.warn("[Router Init]: Unable to clear persisted route.", error);
        }
    }
    static legacyRouteTo(route) {
        let url = new URL(route, window.location.origin);
        if (window.location.pathname !== route) {
            window.location.replace(url.href);
        }
    }
    static tryRouteTo(url) {
        try {
            const found = this.tryFindRoute(url);
            const page = this.createPage(found, url.searchParams);
            page.load(document.getElementById('page'));
            if (typeof window !== "undefined" && window.location) {
                window.history.pushState(page, '', url.href);
            }
        }
        catch (error) {
            console.error("[Router]: Unable to route to ", url.href, error);
        }
    }
    static tryFindRoute(url) {
        const found = ROUTES.find(r => r.route === url.pathname);
        if (!found) {
            throw new Error(`[Router]: Route not found: ${url.pathname}`);
        }
        return found;
    }
    static async registerRoute(path, route, pageFactory, inheritedRoute) {
        let prepRoute = route;
        let fullRoute = inheritedRoute ? inheritedRoute.route + prepRoute : prepRoute;
        let routeObj = { route: fullRoute, path, pageFactory };
        ROUTES.push(routeObj);
        console.log(`[Router]: Registered route: ${fullRoute} -> ${path}`);
        return Promise.resolve(routeObj);
    }
    static createPage(route, search) {
        return route.pageFactory(search);
    }
}
document.addEventListener('click', e => {
    const target = e.target;
    if (target) {
        const link = target.closest('a[data-link]') ?? target.closest('re-button[data-link]');
        if (link) {
            e.preventDefault();
            const url = new URL(link.getAttribute('href'), window.location.origin);
            Router.tryRouteTo(url);
        }
    }
});
window.addEventListener('DOMContentLoaded', () => {
    const checkRoutes = () => {
        const routes = ROUTES;
        if (routes) {
            console.log('[Init] [Router]: available routes =', routes.map(r => r.route).join(', '));
        }
    };
    checkRoutes();
});
//# sourceMappingURL=Router.js.map
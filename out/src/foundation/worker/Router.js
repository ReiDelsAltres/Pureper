import { Host } from "./Host.js";
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
    static savePersistedRoute(route) {
        try {
            sessionStorage.setItem("spa:persisted-route", route);
        }
        catch (error) {
            console.warn("[Router Init]: Unable to access sessionStorage.", error);
        }
    }
    static getPersistedRoute() {
        try {
            return sessionStorage.getItem("spa:persisted-route");
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
        if (window.location.pathname !== route) {
            window.location.replace(Host.getHostPrefix() + route);
        }
    }
    static routeTo(route, hash) {
        let found = this.findRoute(route);
        let page = this.createPage(found, hash);
        page.load(document.getElementById('app'));
        // Only update location if running in a window context
        var hashPath = hash ? `?${hash}` : '';
        if (typeof window !== "undefined" && window.location) {
            window.history.pushState(page, '', Host.getHostPrefix() + found.route + hashPath);
        }
    }
    static tryRouteTo(route, hash) {
        try {
            this.routeTo(route, hash);
            return true;
        }
        catch (error) {
            console.warn(`[Router]: Failed to route to ${route}.`, error);
            return false;
        }
    }
    static findRoute(route) {
        const normalizedRoute = Router.normalizeRoute(route);
        let found = ROUTES.find(r => r.route === normalizedRoute);
        if (!found)
            throw new Error(`[Router]: Route not found: ${normalizedRoute}`);
        return found;
    }
    static normalizeRoute(route) {
        return route;
    }
    static async registerRoute(path, route, pageFactory, inheritedRoute) {
        let prepRoute = route;
        let fullRoute = inheritedRoute ? inheritedRoute.route + prepRoute : prepRoute;
        let routeObj = { route: fullRoute, path, pageFactory };
        ROUTES.push(routeObj);
        console.log(`[Router]: Registered route: ${fullRoute} -> ${path}`);
        return Promise.resolve(routeObj);
    }
    static createPage(route, hash) {
        return route.pageFactory(hash);
    }
}
document.addEventListener('click', e => {
    const target = e.target;
    if (target) {
        const link = target.closest('a[data-link]') ?? target.closest('re-button[data-link]');
        if (link) {
            e.preventDefault();
            const parts = link.getAttribute('href').split('?');
            Router.routeTo(parts[0], parts[1] ? parts[1] : null);
        }
    }
});
// Initial load
window.addEventListener('DOMContentLoaded', () => {
    // Добавляем отладочную информацию
    console.log('[Router]: DOMContentLoaded');
    console.log('[Router]: hostname =', window.location.hostname);
    //console.log('[Router]: IS_GITHUB_PAGES =', IS_GITHUB_PAGES);
    //console.log('[Router]: USE_HASH_ROUTING =', USE_HASH_ROUTING);
    //console.log('[Router]: BASE_PATH =', BASE_PATH);
    console.log('[Router]: location.pathname =', window.location.pathname);
    console.log('[Router]: location.search =', window.location.search);
    // Ждем, пока ROUTES будет определен
    const checkRoutes = () => {
        const routes = ROUTES;
        if (routes) {
            console.log('[Router]: available routes =', routes.map(r => r.route).join(', '));
        }
    };
    checkRoutes();
});
//# sourceMappingURL=Router.js.map
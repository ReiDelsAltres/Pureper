import UniHtml from "../component_api/UniHtml.js";
export interface Route<T extends UniHtml = UniHtml> {
    route: string;
    path: string;
    pageFactory: (search?: URLSearchParams) => T;
}
export declare enum AccessType {
    OFFLINE = 0,
    ONLINE = 1,
    BOTH = 2
}
export declare const ROUTES: Route[];
export declare const TO_CACHE: string[];
export declare abstract class Router {
    static savePersistedRoute(url: URL): void;
    static getPersistedRoute(): URL | null;
    static clearPersistedRoute(): void;
    static legacyRouteTo(route: string): void;
    static tryRouteTo(url: URL, pushState?: boolean): void;
    static tryFindRoute(url: URL): Route;
    static registerRoute<T extends UniHtml>(path: string, route: string, pageFactory: (search?: URLSearchParams) => T, inheritedRoute?: Route): Promise<Route>;
    private static createPage;
}
//# sourceMappingURL=Router.d.ts.map
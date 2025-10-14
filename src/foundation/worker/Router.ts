// Add RouterConfig type to window for TypeScript
declare global {
  interface Window {
    RouterConfig?: { ASSET_PATH: string };
  }
}
import { AnyConstructor } from "../component_api/mixin/Proto";
import Page from "../component_api/Page";
import UniHtml from "../component_api/UniHtml.js";
import { ServiceWorkerGlobalScope } from "./api/ServiceWorkerGlobalScope";
import { Host } from "./Host.js";

const globals = self as any as ServiceWorkerGlobalScope;

export interface Route<T extends UniHtml = UniHtml> {
  route: string;
  path: string;

  pageFactory: (hash?: string) => T;
}
export enum AccessType {
  OFFLINE,
  ONLINE,
  BOTH
}

export const ROUTES: Route[] = [];
export const TO_CACHE: string[] = [];

export abstract class Router {
  public static savePersistedRoute(route: string) {
    try {
      sessionStorage.setItem("spa:persisted-route", route);
    } catch (error) {
      console.warn("[Router Init]: Unable to access sessionStorage.", error);
    }
  }
  public static getPersistedRoute(): string | null {
    try {
      return sessionStorage.getItem("spa:persisted-route");
    } catch (error) {
      console.warn("[Router Init]: Unable to access sessionStorage.", error);
      return null;
    }
  }
  public static clearPersistedRoute() {
    try {
      sessionStorage.removeItem("spa:persisted-route");
    } catch (error) {
      console.warn("[Router Init]: Unable to clear persisted route.", error);
    }
  }


  public static legacyRouteTo(route: string) {
    if (window.location.pathname !== route) {
      window.location.replace(Host.getHostPrefix() + route);
    }
  }
  public static routeTo(route: string,hash?: string) {
    let found: Route = this.findRoute(route);
    let page: UniHtml = this.createPage(found, hash);

    page.load(document.getElementById('app')!);

    // Only update location if running in a window context
    var hashPath : string = hash ? `?${hash}` : '';
    if (typeof window !== "undefined" && window.location) {
      window.history.pushState(page, '', Host.getHostPrefix() + found.route + hashPath);
    }
  }
  public static tryRouteTo(route: string,hash?: string): boolean {
    try {
      this.routeTo(route, hash);
      return true;
    } catch (error) {
      console.warn(`[Router]: Failed to route to ${route}.`, error);
      return false;
    }
  }


  public static findRoute(route: string): Route {
    const normalizedRoute = Router.normalizeRoute(route);
    let found = ROUTES.find(r => r.route === normalizedRoute);
    if (!found) throw new Error(`[Router]: Route not found: ${normalizedRoute}`);
    return found;
  }
  public static normalizeRoute(route: string): string {
    return route;
  }
  public static async registerRoute<T extends UniHtml>(path: string, route: string, pageFactory: (hash?: string) => T,
    inheritedRoute?: Route): Promise<Route> {

    let prepRoute = route
    let fullRoute = inheritedRoute ? inheritedRoute.route + prepRoute : prepRoute;

    let routeObj: Route = { route: fullRoute, path, pageFactory };

    ROUTES.push(routeObj);
    console.log(`[Router]: Registered route: ${fullRoute} -> ${path}`);

    return Promise.resolve(routeObj);
  }


  private static createPage(route: Route,hash?: string): UniHtml {
    return route.pageFactory(hash);
  }
}

document.addEventListener('click', e => {
  const target = e.target as Element | null;
  if (target) {
    const link = target.closest('a[data-link]') ?? target.closest('re-button[data-link]');
    if (link) {
      e.preventDefault();
      const parts : string[] = link.getAttribute('href').split('?');
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
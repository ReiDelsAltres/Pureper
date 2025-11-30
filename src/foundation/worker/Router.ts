// Add RouterConfig type to window for TypeScript
declare global {
  interface Window {
    RouterConfig?: { ASSET_PATH: string };
  }
}
import UniHtml from "../component_api/UniHtml.js";
import { ServiceWorkerGlobalScope } from "./api/ServiceWorkerGlobalScope.js";

const globals = self as any as ServiceWorkerGlobalScope;

export interface Route<T extends UniHtml = UniHtml> {
  route: string;
  path: string;

  pageFactory: (search?: URLSearchParams) => T;
}
export enum AccessType {
  OFFLINE,
  ONLINE,
  BOTH
}

export const ROUTES: Route[] = [];
export const TO_CACHE: string[] = [];

export abstract class Router {
  public static savePersistedRoute(url: URL) {
    try {
      sessionStorage.setItem("spa:persisted-route", url.toJSON());
    } catch (error) {
      console.warn("[Router Init]: Unable to access sessionStorage.", error);
    }
  }
  public static getPersistedRoute(): URL | null {
    try {
      const item = sessionStorage.getItem("spa:persisted-route");
      return item ? URL.parse(item) : null;
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
    let url = new URL(route, window.location.origin);
    if (window.location.pathname !== route) {
      window.location.replace(url.href);
    }
  }
  public static tryRouteTo(url: URL) {
    try {
      const found: Route = this.tryFindRoute(url);
      const page: UniHtml = this.createPage(found, url.searchParams);

      page.load(document.getElementById('page')!);

      if (typeof window !== "undefined" && window.location) {
        window.history.pushState(page, '', url.href);
      }
    } catch (error) {
      console.error("[Router]: Unable to route to ", url.href, error);
    }
  }
  public static tryFindRoute(url: URL): Route {
    const found = ROUTES.find(r => r.route === url.pathname);
    if (!found) {
      throw new Error(`[Router]: Route not found: ${url.pathname}`);
    }
    return found;
  }

  public static async registerRoute<T extends UniHtml>(path: string, route: string, pageFactory: (search?: URLSearchParams) => T,
    inheritedRoute?: Route): Promise<Route> {

    let prepRoute = route
    let fullRoute = inheritedRoute ? inheritedRoute.route + prepRoute : prepRoute;

    let routeObj: Route = { route: fullRoute, path, pageFactory };

    ROUTES.push(routeObj);
    console.log(`[Router]: Registered route: ${fullRoute} -> ${path}`);

    return Promise.resolve(routeObj);
  }


  private static createPage(route: Route, search?: URLSearchParams): UniHtml {
    return route.pageFactory(search);
  }
}

document.addEventListener('click', e => {
  const target = e.target as Element | null;
  if (target) {
    const link = target.closest('a[data-link]') ?? target.closest('re-button[data-link]');
    if (link) {
      e.preventDefault();
      const url : URL = new URL(link.getAttribute('href')!, window.location.origin);
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
import { HOSTING } from "../Hosting.js";
import Fetcher from "../Fetcher.js";
import UniHtml from "../component_api/UniHtml.js";

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
  private static currentPage: UniHtml | null = null;

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
    const url = new URL(Fetcher.resolveUrl(route));
    if (window.location.pathname !== url.pathname) {
      window.location.replace(url.href);
    }
  }
  
  public static tryRouteTo(url: URL, pushState: boolean = true) {
    const urlH = new URL(Fetcher.resolveUrl(url.href));
    try {
      const found: Route = this.tryFindRoute(urlH);
      
      let pageContainer = document.getElementById('page');
      
      const page: UniHtml = this.createPage(found, urlH.searchParams);
      this.currentPage = page;

      page.load(pageContainer);

      if (pushState && typeof window !== "undefined" && window.location) {
        window.history.pushState({}, '', urlH.href);
      }
    } catch (error) {
      console.error("[Router]: Unable to route to ", urlH.href, error);
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

    const tt = HOSTING + fullRoute;

    let routeObj: Route = { route: tt, path, pageFactory };

    ROUTES.push(routeObj);
    console.log(`[Router]: Registered route: ${tt} -> ${path}`);

    return Promise.resolve(routeObj);
  }

  private static createPage(route: Route, search?: URLSearchParams): UniHtml {
    return route.pageFactory(search);
  }
}

//For SPA navigation
document.addEventListener('click', e => {
  const target = e.target as Element | null;
  if (target) {
    const link = target.closest('a[data-link]') ?? target.closest('re-button[data-link]');
    if (link) {
      e.preventDefault();
      const href = link.getAttribute('href');
      if (!href) return;
      const url: URL = new URL(Fetcher.resolveUrl(href));
      Router.tryRouteTo(url);
    }
  }
});

//For back/forward navigation
window.addEventListener('popstate', e => {
  try {
    const url = new URL(Fetcher.resolveUrl(window.location.href));
    Router.tryRouteTo(url, false);
  } catch (error) {
    console.error('[Router] (popstate): failed to route to current location', error);
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
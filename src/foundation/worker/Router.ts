import { HOSTING, HOSTING_ORIGIN } from "../../index.js";
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
    let url = new URL(route, HOSTING_ORIGIN);
    if (window.location.pathname !== route) {
      window.location.replace(url.href);
    }
  }
  public static tryRouteTo(url: URL, pushState: boolean = true) {
    const urlH = new URL(url.href, HOSTING_ORIGIN);
    try {
      const found: Route = this.tryFindRoute(urlH);
      const page: UniHtml = this.createPage(found, url.searchParams);

      page.load(document.getElementById('page')!);
      if (pushState && typeof window !== "undefined" && window.location) {
        window.history.pushState(page, '', urlH.href);
      }
    } catch (error) {
      console.error("[Router]: Unable to route to ", urlH.href, error);
    }
  }
  public static tryFindRoute(url: URL): Route {
    const tt = HOSTING.substring(0, HOSTING.length - 1) + url.pathname;
    const found = ROUTES.find(r => r.route === tt);
    if (!found) {
      throw new Error(`[Router]: Route not found: ${url.pathname}`);
    }
    return found;
  }

  public static async registerRoute<T extends UniHtml>(path: string, route: string, pageFactory: (search?: URLSearchParams) => T,
    inheritedRoute?: Route): Promise<Route> {

    let prepRoute = route
    let fullRoute = inheritedRoute ? inheritedRoute.route + prepRoute : prepRoute;

    const tt = HOSTING.substring(0, HOSTING.length - 1) + fullRoute;

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
      const hr = HOSTING_ORIGIN.substring(0, HOSTING_ORIGIN.length - 1) + link.getAttribute('href');
      const url : URL = new URL(hr, HOSTING_ORIGIN);
      Router.tryRouteTo(url);
    }
  }
});

//For back/forward navigation
window.addEventListener('popstate', e => {
  try {
    const url = new URL(window.location.href, HOSTING_ORIGIN);
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
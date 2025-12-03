import { HOSTING, HOSTING_ORIGIN } from "../../index.js";
import UniHtml from "../component_api/UniHtml.js";

const HOSTING_BASE = HOSTING.endsWith("/") ? HOSTING.slice(0, -1) : HOSTING;
const ABSOLUTE_URL_PATTERN = /^[a-zA-Z][a-zA-Z\d+\-.]*:/;

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
    const target = Router.resolveRouteHref(route);
    if (window.location.href !== target.href) {
      window.location.replace(target.href);
    }
  }

  public static tryRouteTo(url: URL, pushState: boolean = true) {
    try {
      const normalizedUrl = Router.normalizeIncomingUrl(url);
      const found: Route = Router.tryFindRoute(normalizedUrl);
      const page: UniHtml = Router.createPage(found, normalizedUrl.searchParams);

      page.load(document.getElementById("page")!);

      const hostedUrl = Router.buildHostedUrl(normalizedUrl);
      if (pushState && typeof window !== "undefined" && window.location) {
        window.history.pushState(page, "", hostedUrl.href);
      }

      window.dispatchEvent(new CustomEvent("spa:navigated", { detail: { url: hostedUrl } }));
    } catch (error) {
      console.error("[Router]: Unable to route to ", url.href, error);
    }
  }

  public static tryFindRoute(url: URL): Route {
    const relativePath = Router.normalizeRoutePath(Router.extractRelativePath(url.pathname));
    const found = ROUTES.find((r) => r.route === relativePath);
    if (!found) {
      throw new Error(`[Router]: Route not found: ${url.pathname}`);
    }
    return found;
  }

  public static async registerRoute<T extends UniHtml>(
    path: string,
    route: string,
    pageFactory: (search?: URLSearchParams) => T,
    inheritedRoute?: Route
  ): Promise<Route> {
    const normalizedRouteSegment = Router.normalizeRoutePath(route);
    const compositeRoute = inheritedRoute
      ? Router.normalizeRoutePath(`${inheritedRoute.route}${normalizedRouteSegment}`)
      : normalizedRouteSegment;

    const routeObj: Route = { route: compositeRoute, path, pageFactory };

    ROUTES.push(routeObj);
    const hostedPreview = Router.buildHostedUrl(new URL(compositeRoute, window.location.origin));
    console.log(`[Router]: Registered route: ${hostedPreview.pathname} -> ${path}`);

    return Promise.resolve(routeObj);
  }

  private static createPage(route: Route, search?: URLSearchParams): UniHtml {
    return route.pageFactory(search);
  }

  private static normalizeIncomingUrl(url: URL): URL {
    if (url.origin && url.origin !== window.location.origin) {
      return url;
    }

    return new URL(url.href, window.location.origin);
  }

  private static normalizeRoutePath(route: string): string {
    if (!route || route === "/") {
      return "/";
    }

    const withSlash = route.startsWith("/") ? route : `/${route}`;
      const collapsed = withSlash.replace(/\/{2,}/g, "/");
    const withoutTrailing = collapsed.length > 1 && collapsed.endsWith("/") ? collapsed.slice(0, -1) : collapsed;
    return withoutTrailing === "" ? "/" : withoutTrailing;
  }

  private static extractRelativePath(pathname: string): string {
    if (!pathname) {
      return "/";
    }

    const ensuredPath = pathname.startsWith("/") ? pathname : `/${pathname}`;

    if (HOSTING_BASE && ensuredPath.startsWith(HOSTING_BASE)) {
      const trimmed = ensuredPath.slice(HOSTING_BASE.length);
      if (!trimmed || trimmed === "") {
        return "/";
      }
      return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
    }

    return ensuredPath;
  }

  private static resolveRouteHref(route: string): URL {
    if (!route || route === "/") {
      return new URL("./", HOSTING_ORIGIN);
    }

    if (ABSOLUTE_URL_PATTERN.test(route)) {
      return new URL(route);
    }

    const normalized = route.startsWith("/") ? `.${route}` : route;
    return new URL(normalized, HOSTING_ORIGIN);
  }

  private static buildHostedUrl(url: URL): URL {
    if (url.origin && url.origin !== window.location.origin) {
      return url;
    }

    const relativePath = Router.normalizeRoutePath(Router.extractRelativePath(url.pathname));
    const routeSegment = relativePath === "/" ? "./" : `.${relativePath}`;
    const hosted = new URL(routeSegment, HOSTING_ORIGIN);
    hosted.search = url.search;
    hosted.hash = url.hash;
    return hosted;
  }
}

const resolveLocalNavigationUrl = (rawHref: string | null): URL | null => {
  if (!rawHref) {
    return null;
  }

  const trimmed = rawHref.trim();
  if (trimmed === "" || trimmed.toLowerCase().startsWith("javascript:")) {
    return null;
  }

  try {
    const candidate = ABSOLUTE_URL_PATTERN.test(trimmed)
      ? new URL(trimmed)
      : new URL(trimmed, window.location.href);

    if (candidate.origin !== window.location.origin) {
      return null;
    }

    return candidate;
  } catch {
    return null;
  }
};

// For SPA navigation
document.addEventListener("click", (e) => {
  const target = e.target as Element | null;
  if (!target) {
    return;
  }

  const link = target.closest("a[data-link]") ?? target.closest("re-button[data-link]");
  if (!link) {
    return;
  }

  const resolved = resolveLocalNavigationUrl(link.getAttribute("href"));
  if (!resolved) {
    return;
  }

  e.preventDefault();
  Router.tryRouteTo(resolved);
});

// For back/forward navigation
window.addEventListener("popstate", () => {
  try {
    const url = new URL(window.location.href);
    Router.tryRouteTo(url, false);
  } catch (error) {
    console.error("[Router] (popstate): failed to route to current location", error);
  }
});

window.addEventListener("DOMContentLoaded", () => {
  const routes = ROUTES;
  if (routes.length > 0) {
    const hostedRoutes = routes.map((r) => describeHostedPath(r.route));
    console.log("[Init] [Router]: available routes =", hostedRoutes.join(", "));
  }
});

const describeHostedPath = (route: string): string => {
  if (!route || route === "/") {
    return new URL("./", HOSTING_ORIGIN).pathname;
  }

  const segment = route.startsWith("/") ? `.${route}` : route;
  return new URL(segment, HOSTING_ORIGIN).pathname;
};
import Page from "../component_api/Page";
import UniHtml from "../component_api/UniHtml";
import { ServiceWorkerGlobalScope } from "./api/ServiceWorkerGlobalScope";

const globals = self as any as ServiceWorkerGlobalScope;

export interface Route<T extends UniHtml = UniHtml> {
    route: string;
    path: string;

    pageFactory: () => T;
}
export enum AccessType {
    OFFLINE,
    ONLINE,
    BOTH
}

export let ROUTES: Route[] = [];
export let TO_CACHE: string[] = [];

export abstract class Router {
    public static registerRoute<T extends UniHtml>(path: string, route: string, pageFactory: () => T,
        inheritedRoute?: Route): Route {

        let prepRoute = route
        let fullRoute = inheritedRoute ? inheritedRoute.route + prepRoute : prepRoute;

        let routeObj: Route = { route: fullRoute, path, pageFactory };

        ROUTES.push(routeObj);
        console.log(`[Router]: Registered route: ${fullRoute} -> ${path}`);

        return routeObj;
    }

    public static routeTo(route: string) {
        let found: Route = this.findRoute(route);
        let page: UniHtml = this.createPage(found);

        page.load(document.getElementById('app')!);

        globals.location.href = found.route;
    }

    public static findRoute(route: string): Route {
        let found = ROUTES.find(r => r.route === route);
        if (!found) throw new Error(`[Router]: Route not found: ${route}`);
        return found;
    }

    private static createPage(route: Route): UniHtml {
        return route.pageFactory();
    }
}

document.addEventListener('click', e => {
  const target = e.target as Element | null;
  if (target) {
    const link = target.closest('a[data-link]') ?? target.closest('re-button[data-link]');
    if (link) {
      e.preventDefault();
      Router.routeTo(link.getAttribute('href')!);
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
const computeHostingPath = (): string => {
	if (typeof window === "undefined" || typeof window.location === "undefined") {
		return "/";
	}

	const pathname = window.location.pathname || "/";
	if (pathname === "") {
		return "/";
	}

	if (pathname.endsWith("/")) {
		return pathname;
	}

	const lastSlash = pathname.lastIndexOf("/");
	if (lastSlash <= 0) {
		// either no slash at all or only the leading slash
		return pathname.includes(".") ? "/" : `${pathname}/`;
	}

	const lastSegment = pathname.slice(lastSlash + 1);
	if (lastSegment && !lastSegment.includes(".")) {
		// we are on a nested route without trailing slash — treat it as a directory
		return `${pathname}/`;
	}

	return pathname.slice(0, lastSlash + 1);
};
// Public package entry — re-export foundation APIs
export { default as IElementHolder } from './foundation/api/ElementHolder.js';
export { default as EmptyConstructor } from './foundation/api/EmptyConstructor.js';
export { default as Lazy } from './foundation/api/Lazy.js';

export * from './foundation/component_api/mixin/Proto.js';

export { default as UniHtml } from './foundation/component_api/UniHtml.js';
export { default as Page } from './foundation/component_api/Page.js';
export { default as Component } from './foundation/component_api/Component.js';

export { default as Triplet, TripletBuilder, AccessType } from './foundation/Triplet.js';
export { ReComponent , RePage} from './foundation/TripletDecorator.js';

export { default as Fetcher } from './foundation/Fetcher.js';

export { Router } from './foundation/worker/Router.js';
export { default as ServiceWorker } from './foundation/worker/ServiceWorker.js';

export * from './foundation/Theme.js';

export const HOSTING: string = computeHostingPath();

export const HOSTING_ORIGIN: string = `${window.location.origin}${HOSTING}`;

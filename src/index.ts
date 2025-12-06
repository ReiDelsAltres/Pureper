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

// derive the part of href after the origin (e.g. "/path?query#hash")
export const HOSTING: string = (() => {
	try {
		// prefer <base href="..."> when present — it declares the app's base path
		const baseEl = document.querySelector('base[href]') as HTMLBaseElement | null;
		if (baseEl && baseEl.href) {
			const baseUrl = new URL(baseEl.href, window.location.href);
			if (baseUrl.origin === window.location.origin) {
				let p = baseUrl.pathname || "/";
				if (!p.endsWith('/')) p = p.replace(/[^/]*$/, '') || '/';
				return p === '/' ? '' : p;
			}
		}

		// Fallback: derive from pathname. If path includes a single filename at root (like /index.html) return ''.
		const path = window.location.pathname || '';
		const segments = path.split('/').filter(Boolean);
		if (segments.length === 0) return '';

		// If path is a single file at root (index.html, default file), treat as no hosting subpath.
		if (segments.length === 1 && /\.[a-z0-9]+$/i.test(segments[0])) return '';

		// Otherwise the first segment is likely the repo or hosting prefix -> keep as '/segment/'
		return `/${segments[0]}/`;
	} catch (e) {
		return '';
	}
})();

export const HOSTING_ORIGIN: string = window.location.origin + HOSTING;

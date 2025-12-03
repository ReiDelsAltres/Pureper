export { default as Lazy } from './foundation/api/Lazy.js';
export * from './foundation/component_api/mixin/Proto.js';
export { default as UniHtml } from './foundation/component_api/UniHtml.js';
export { default as Page } from './foundation/component_api/Page.js';
export { default as Component } from './foundation/component_api/Component.js';
export { default as Triplet, TripletBuilder, AccessType } from './foundation/Triplet.js';
export { ReComponent, RePage } from './foundation/TripletDecorator.js';
export { default as Fetcher } from './foundation/Fetcher.js';
export { Router } from './foundation/worker/Router.js';
export { default as ServiceWorker } from './foundation/worker/ServiceWorker.js';
export * from './foundation/Theme.js';
// derive the part of href after the origin (e.g. "/path?query#hash")
export const HOSTING = window.location.href.startsWith(window.location.origin)
    ? window.location.href.substring(window.location.origin.length)
    : window.location.href;
export const HOSTING_ORIGIN = window.location.origin + HOSTING;
//# sourceMappingURL=index.js.map
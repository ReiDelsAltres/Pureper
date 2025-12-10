export { default as Lazy } from './foundation/api/Lazy.js';
export * from './foundation/component_api/mixin/Proto.js';
export { default as UniHtml } from './foundation/component_api/UniHtml.js';
export { default as Page } from './foundation/component_api/Page.js';
export { default as Component } from './foundation/component_api/Component.js';
export { default as Triplet, TripletBuilder, AccessType } from './foundation/Triplet.js';
export { ReComponent, RePage } from './foundation/TripletDecorator.js';
export { default as Fetcher } from './foundation/Fetcher.js';
export { default as PHTMLParser } from './foundation/PHTMLParser.js';
export { default as HMLEParser } from './foundation/HMLEParser.js';
export { Router } from './foundation/worker/Router.js';
export { default as ServiceWorker } from './foundation/worker/ServiceWorker.js';
export * from './foundation/Theme.js';
export const pathSegmentsToKeep = window.location.origin.includes(".github.io") ? 1 : 0;
const l = window.location;
export const HOSTING = l.pathname.split('/').slice(0, 1 + pathSegmentsToKeep).join('/') + "";
export const HOSTING_ORIGIN = l.protocol + '//' + l.hostname + (l.port ? ':' + l.port : '') +
    l.pathname.split('/').slice(0, 1 + pathSegmentsToKeep).join('/') + "";
console.log("HOSTING:", HOSTING);
console.log("HOSTING ORIGIN:", HOSTING_ORIGIN);
// derive the part of href after the origin (e.g. "/path?query#hash")
/*export const HOSTING: string = window.location.href.startsWith(window.location.origin)
    ? window.location.href.substring(window.location.origin.length)
    : "";*/
//export const HOSTING_ORIGIN: string = window.location.origin + HOSTING;
//# sourceMappingURL=index.js.map
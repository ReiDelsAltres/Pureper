import { Mixined } from "./mixin/Proto.js";
import UniHtml from "./UniHtml.js";
/**
 * Base class for SPA pages in Pureper application
 * Provides lifecycle hooks and template rendering functionality
 */
export default interface Page extends Mixined, UniHtml, EventTarget {
}
declare const Page_base: {
    new (...args: any[]): {};
} & {
    new (): EventTarget;
    prototype: EventTarget;
};
export default class Page extends Page_base {
    constructor();
}
export {};
//# sourceMappingURL=Page.d.ts.map
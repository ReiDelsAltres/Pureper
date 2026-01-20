import { Class, Mixined } from "./mixin/Proto.js";
import UniHtml from "./UniHtml.js";

/**
 * Base class for SPA pages in Pureper application
 * Provides lifecycle hooks and template rendering functionality
 */
export default interface Page extends Mixined, UniHtml, EventTarget { }
export default class Page extends Class(EventTarget).extend(UniHtml).build() {
    constructor() {
        super();
    }
}
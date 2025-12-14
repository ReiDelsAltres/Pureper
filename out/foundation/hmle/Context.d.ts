/**
 * Context — utility for building a safe evaluation context used by parsers
 *
 * Features:
 * - Merges parser variables and local scope objects
 * - Safely copies instance prototype functions bound to the instance
 * - Supports merging multiple contexts or objects
 *
 * This class is intended to replace ad-hoc `buildContext` implementations in
 * parsers such as HMLEParser/HMLEParserReborn and PHTMLParser.
 */
export default class Context {
    private values;
    constructor(initial?: Record<string, any>);
    /** Create a Context and merge given scope into it */
    static from(scopeVars?: Record<string, any>, scope?: Record<string, any>): Context;
    /** Merge plain object or another Context into this one */
    merge(other?: Record<string, any> | Context): this;
    /**
     * Copy prototype methods from an instance into the context
     * Methods are bound to the given instance to preserve `this` semantics.
     */
    bindPrototypeMethods(instance?: Record<string, any>): this;
    /** Return a plain object suitable for `with(this)` evaluation contexts */
    toObject(): Record<string, any>;
    /** Convenience static builder returning a plain object for use in parsers */
    static build(variables?: Record<string, any>, scope?: Record<string, any>): Record<string, any>;
}
//# sourceMappingURL=Context.d.ts.map
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
    private values: Record<string, any>;

    constructor(initial?: Record<string, any>) {
        this.values = Object.assign({}, initial || {});
    }

    /** Create a Context and merge given scope into it */
    public static from(scopeVars?: Record<string, any>, scope?: Record<string, any>): Context {
        const ctx = new Context(scopeVars);
        if (scope) ctx.merge(scope);
        return ctx;
    }

    /** Merge plain object or another Context into this one */
    public merge(other?: Record<string, any> | Context): this {
        if (!other) return this;
        if (other instanceof Context) Object.assign(this.values, other.values);
        else Object.assign(this.values, other);
        return this;
    }

    /**
     * Copy prototype methods from an instance into the context
     * Methods are bound to the given instance to preserve `this` semantics.
     */
    public bindPrototypeMethods(instance?: Record<string, any>): this {
        if (!instance) return this;

        const bindTarget: any = (instance as any).__hmle_this ?? instance;

        let proto: any = Object.getPrototypeOf(bindTarget);
        while (proto && proto !== Object.prototype) {
            // avoid copying host DOM/window prototype methods
            const ctorName = proto && proto.constructor ? String((proto as any).constructor?.name ?? '') : '';
            if (/HTMLElement|Element|Node|EventTarget|Window|GlobalThis/i.test(ctorName)) {
                proto = Object.getPrototypeOf(proto);
                continue;
            }

            for (const key of Object.getOwnPropertyNames(proto)) {
                if (key === 'constructor') continue;
                if (key in this.values) continue; // do not override existing keys

                let desc: PropertyDescriptor | undefined;
                try {
                    desc = Object.getOwnPropertyDescriptor(proto, key) as PropertyDescriptor | undefined;
                } catch (e) {
                    // Some host objects may throw when attempting to read descriptors — skip
                    continue;
                }
                if (!desc) continue;
                if (typeof desc.value === 'function') {
                    try {
                        this.values[key] = (desc.value as Function).bind(bindTarget);
                    } catch (_e) {
                        // binding may fail for native host methods — skip
                        continue;
                    }
                }
            }

            proto = Object.getPrototypeOf(proto);
        }
        return this;
    }

    /** Return a plain object suitable for `with(this)` evaluation contexts */
    public toObject(): Record<string, any> {
        return Object.assign({}, this.values);
    }

    /** Convenience static builder returning a plain object for use in parsers */
    public static build(variables?: Record<string, any>, scope?: Record<string, any>): Record<string, any> {
        const ctx = new Context(variables);
        if (scope) ctx.merge(scope).bindPrototypeMethods(scope);
        return ctx.toObject();
    }
}

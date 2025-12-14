/**
 * Rule — represents a single parsing rule with its own check and execution logic.
 * Rules can apply to any of the 3 parsing stages or to specific ones.
 */
export interface Rule {
    name: string;
    /** Stage 1: text parsing — returns transformed string or null if rule doesn't apply */
    parseText?: (parser: HMLEParserReborn, content: string, scope?: Record<string, any>, dynamicVars?: Set<string>) => string | null;
    /** Stage 3: hydration — processes template elements in DOM */
    hydrate?: (parser: HMLEParserReborn, template: HTMLTemplateElement, scope?: Record<string, any>) => void;
    /** Optional: element-level hydration (stage 2/DOM parse) */
    elementHydrate?: (parser: HMLEParserReborn, el: Element, scope?: Record<string, any>) => void;
}
export default class HMLEParserReborn {
    private rules;
    variables: Record<string, any>;
    constructor();
    /**
     * Add a custom rule to the parser
     */
    addRule(rule: Rule): this;
    /**
     * Get registered rules
     */
    getRules(): Rule[];
    static isIdentifier(s: string): boolean;
    private buildContext;
    evaluate(expr: string, scope?: Record<string, any>): any;
    stringify(v: any): string;
    /**
     * Stage 1: Parsing — parse HMLE as text, execute STATIC RULES.
     * Observable values are left as <template ...> placeholders for Stage 3.
     */
    parse(content: string, scope?: Record<string, any>): string;
    /**
     * Stage 2: DOM Parsing — parse HMLE text to DOM, create <template> for dynamic rules.
     * Created templates are preserved for reuse when Observable updates.
     */
    parseToDOM(content: string, scope?: Record<string, any>): DocumentFragment;
    /**
     * Stage 3: Hydration — remove templates and execute dynamic rules.
     */
    hydrate(fragment: DocumentFragment | Element, scope?: Record<string, any>): void;
    /**
     * Process {{EXP:expr}} placeholders in element attributes
     */
    private hydrateAttributeExpressions;
}
//# sourceMappingURL=HMLEParserReborn.d.ts.map
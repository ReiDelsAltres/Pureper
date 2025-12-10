/**
 * HMLEParser - HTML Markup Language Extensions Parser
 *
 * Two-stage parsing:
 * Stage 1: String processing - @for loops, @(expression) interpolations
 * Stage 2: DOM processing - @[event](handler) bindings, attribute directives
 *
 * Usage:
 *   const parser = new HMLEParser();
 *   parser.addVariable('items', [{name: 'Item 1'}, {name: 'Item 2'}]);
 *   const fragment = parser.parseToDOM(templateString, scopeObject);
 */
export default class HMLEParser {
    private static extractBalancedBraces;
    private static extractBalancedParens;
    private static rules;
    private static domRules;
    variables: Record<string, unknown>;
    /**
     * Add a variable to the parser's global scope
     */
    addVariable(name: string, value: unknown): this;
    /**
     * Build execution context that includes prototype methods from scope
     */
    private buildContext;
    /**
     * Resolve a dotted expression against the parser variables and optional local scope.
     */
    resolveExpression(expr: string, scope?: Record<string, any>): any;
    /**
     * Convert value to string for text content
     */
    private stringifyValue;
    /**
     * Evaluate a JavaScript expression in a given context
     */
    private evaluateInContext;
    /**
     * Parse HMLE template string and return processed HTML string
     * @param content HMLE template string
     * @param scope Optional scope object (can be a class instance)
     * @returns Processed HTML string
     */
    parse(content: string, scope?: Record<string, any>): string;
    /**
     * Stage 2: Process DOM rules on a fragment
     * Walks all elements and applies DOM rules based on attributes
     */
    private processDOMRules;
    /**
     * Parse HMLE template and create DOM elements (Stage 1 + Stage 2)
     * @param content HMLE template string
     * @param scope Optional scope object
     * @returns DocumentFragment containing parsed HTML with bindings applied
     */
    parseToDOM(content: string, scope?: Record<string, any>): DocumentFragment;
    /**
     * Parse HMLE template and return single element (first child)
     * @param content HMLE template string
     * @param scope Optional scope object
     * @returns First element from parsed HTML, or null
     */
    parseToElement<T extends Element = Element>(content: string, scope?: Record<string, any>): T | null;
    /**
     * Parse and append to a parent element
     * @param content HMLE template string
     * @param parent Parent element to append to
     * @param scope Optional scope object
     * @returns The parent element
     */
    parseAndAppend(content: string, parent: Element, scope?: Record<string, any>): Element;
    /**
     * Parse and replace element's innerHTML
     * @param content HMLE template string
     * @param element Element to update
     * @param scope Optional scope object
     * @returns The updated element
     */
    parseAndReplace(content: string, element: Element, scope?: Record<string, any>): Element;
    /**
     * Apply DOM rules to an existing element (Stage 2 only)
     * Useful when you already have DOM and just want to process bindings
     */
    applyBindings(element: Element, scope?: Record<string, any>): Element;
}
//# sourceMappingURL=HMLEParser.d.ts.map
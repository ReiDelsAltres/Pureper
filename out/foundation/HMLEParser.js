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
// Stage 1: String-based rules
class HMLEParserRule {
    pattern;
    replacer;
    constructor(pattern, replacer) {
        this.pattern = pattern;
        this.replacer = replacer;
    }
}
// Stage 2: DOM-based rules for attribute processing
class HMLEDOMRule {
    attrPattern;
    processor;
    constructor(attrPattern, processor) {
        this.attrPattern = attrPattern;
        this.processor = processor;
    }
}
export default class HMLEParser {
    // Extract balanced braces { ... }
    static extractBalancedBraces(content, start) {
        if (content[start] !== '{')
            return null;
        let depth = 1;
        let i = start + 1;
        while (i < content.length && depth > 0) {
            if (content[i] === '{')
                depth++;
            else if (content[i] === '}')
                depth--;
            i++;
        }
        if (depth !== 0)
            return null;
        return { block: content.slice(start + 1, i - 1), end: i };
    }
    // Extract balanced parentheses ( ... )
    static extractBalancedParens(content, start) {
        if (content[start] !== '(')
            return null;
        let depth = 1;
        let i = start + 1;
        while (i < content.length && depth > 0) {
            if (content[i] === '(')
                depth++;
            else if (content[i] === ')')
                depth--;
            i++;
        }
        if (depth !== 0)
            return null;
        return { block: content.slice(start + 1, i - 1), end: i };
    }
    // Predefined rules processed in order
    static rules = [
        // Rule: @for (item in items) { ... }
        // Accept either single variable or index,value pair and either a variable/expr or a numeric literal
        // Examples:
        //   @for (item in items) { ... }
        //   @for (idx, item in items) { ... }
        //   @for (i in 10) { ... }
        new HMLEParserRule(/@for\s*\(\s*([A-Za-z_$][A-Za-z0-9_$]*)(?:\s*,\s*([A-Za-z_$][A-Za-z0-9_$]*))?\s+in\s+([A-Za-z_$][A-Za-z0-9_$.]*|[0-9]+)\s*\)\s*\{/g, (parser, match, input, scope) => {
            // match[1] = first identifier (either item OR index when pair syntax used)
            // match[2] = optional second identifier (value when pair syntax used)
            // match[3] = iterable expression (dotted path or numeric literal)
            const maybeFirst = match[1];
            const maybeSecond = match[2];
            const iterableExpr = match[3];
            const blockStart = match.index + match[0].length - 1; // position of '{'
            const extracted = HMLEParser.extractBalancedBraces(input, blockStart);
            if (!extracted)
                return match[0];
            const inner = extracted.block;
            // Support numeric literal or expression that resolves to a number
            let arr = [];
            // If the iterable part is a plain number literal, use it directly
            if (/^\d+$/.test(iterableExpr)) {
                const n = parseInt(iterableExpr, 10);
                arr = Array.from({ length: Math.max(0, n) }, (_, i) => i);
            }
            else {
                const resolved = parser.resolveExpression(iterableExpr, scope);
                if (typeof resolved === 'number' && isFinite(resolved)) {
                    const n = Math.max(0, Math.floor(resolved));
                    arr = Array.from({ length: n }, (_, i) => i);
                }
                else if (Array.isArray(resolved)) {
                    arr = resolved;
                }
                else {
                    arr = [];
                }
            }
            const parts = [];
            for (let i = 0; i < arr.length; i++) {
                const item = arr[i];
                let fullScope;
                // If two identifiers were provided, treat first as index and second as value
                if (maybeSecond) {
                    fullScope = Object.assign({}, scope, { [maybeFirst]: i, [maybeSecond]: item });
                }
                else {
                    // Single identifier: bind it to the item
                    fullScope = Object.assign({}, scope, { [maybeFirst]: item });
                }
                parts.push(parser.parse(inner, fullScope));
            }
            return { text: parts.join('\n'), end: extracted.end };
        }),
        // Rule: @(( code )) — double-paren for complex expressions
        new HMLEParserRule(/@\(\(/g, (parser, match, input, scope) => {
            const blockStart = match.index + match[0].length - 1; // points at inner '('
            const extracted = HMLEParser.extractBalancedParens(input, blockStart);
            if (!extracted)
                return match[0];
            const code = extracted.block;
            const ctx = parser.buildContext(scope);
            let result;
            try {
                const fn = new Function('with(this){ return (' + code + '); }');
                result = fn.call(ctx);
            }
            catch (e) {
                try {
                    const fn2 = new Function('with(this){ ' + code + ' }');
                    result = fn2.call(ctx);
                }
                catch (e2) {
                    return { text: '', end: extracted.end };
                }
            }
            // Skip outer ')' if present
            let finalEnd = extracted.end;
            if (input[extracted.end] === ')')
                finalEnd = extracted.end + 1;
            return { text: parser.stringifyValue(result), end: finalEnd };
        }),
        // Rule: @( code ) — single-paren expression
        new HMLEParserRule(/@\(/g, (parser, match, input, scope) => {
            const blockStart = match.index + match[0].length - 1; // points at '('
            const extracted = HMLEParser.extractBalancedParens(input, blockStart);
            if (!extracted)
                return match[0];
            const code = extracted.block;
            const ctx = parser.buildContext(scope);
            let result;
            try {
                const fn = new Function('with(this){ return (' + code + '); }');
                result = fn.call(ctx);
            }
            catch (e) {
                try {
                    const fn2 = new Function('with(this){ ' + code + ' }');
                    result = fn2.call(ctx);
                }
                catch (e2) {
                    return { text: '', end: extracted.end };
                }
            }
            return { text: parser.stringifyValue(result), end: extracted.end };
        }),
    ];
    // Stage 2: DOM rules for attribute processing
    static domRules = [
        // Rule: @[on{eventName}] = "{expression}" — event binding
        // Example: @[onclick] = "handleClick()""
        // Expression is parsed from the attribute name itself: @[on{click}]= "code here"
        new HMLEDOMRule(/^@\[on([A-Za-z]+)\]/g, (parser, element, attrName, attrValue, match, scope) => {
            const eventName = match[1].toLowerCase(); // click, input, etc.
            const code = attrValue; // expression from (...)
            const ctx = parser.buildContext(scope);
            const handler = (event) => {
                // Add $event to context
                const eventCtx = Object.assign({}, ctx, { event: event, element: element });
                try {
                    const fn = new Function('with(this){ ' + code + ' }');
                    fn.call(eventCtx);
                }
                catch (e) {
                    console.error(`HMLEParser: Error in @[on${eventName}] handler:`, e);
                }
            };
            element.addEventListener(eventName, handler);
            //element.removeAttribute(attrName);
        }),
        // Rule: @[bind:attribute](expression) — two-way binding
        // Example: @[bind:value](inputValue)
        /*new HMLEDOMRule(/^@\[bind:([A-Za-z-]+)\]$/,
            (parser, element, attrName, attrValue, match, scope) => {
                const boundAttr = match[1];
                const ctx = parser.buildContext(scope);

                // Set initial value
                const initialValue = parser.evaluateInContext(attrValue, ctx);
                if (boundAttr === 'value' && 'value' in element) {
                    (element as HTMLInputElement).value = initialValue ?? '';
                } else {
                    element.setAttribute(boundAttr, parser.stringifyValue(initialValue));
                }

                // For input elements, listen for changes
                if (boundAttr === 'value' && (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA' || element.tagName === 'SELECT')) {
                    element.addEventListener('input', (event) => {
                        const newValue = (event.target as HTMLInputElement).value;
                        // Try to update the bound variable in scope
                        if (scope && attrValue in scope) {
                            scope[attrValue] = newValue;
                        } else if (attrValue in parser.variables) {
                            parser.variables[attrValue] = newValue;
                        }
                    });
                }

                element.removeAttribute(attrName);
            }
        ),*/
        // Rule: @[ref] = "refName" — element reference
        // Example: @[ref] = "myButton"
        new HMLEDOMRule(/^@\[ref\]/g, (parser, element, attrName, attrValue, match, scope) => {
            // attrValue may be a literal name or an expression that returns a string
            // Evaluate the value in context first, falling back to the raw attrValue
            const ctx = parser.buildContext(scope);
            let refName;
            if (attrValue && attrValue.trim() !== '') {
                const evaluated = parser.evaluateInContext(attrValue, ctx);
                if (typeof evaluated === 'string')
                    refName = evaluated;
                else if (evaluated != null)
                    refName = String(evaluated);
                else
                    refName = attrValue; // fallback to literal attr value
            }
            if (refName) {
                if (scope) {
                    scope[refName] = element;
                }
                else {
                    parser.variables[refName] = element;
                }
            }
            // keep attribute intact for debugging; parser consumer may remove it later
            // element.removeAttribute(attrName);
        }),
        // Rule: @[class:className](condition) — conditional class
        // Example: @[class:active](isActive)
        /*new HMLEDOMRule(/^@\[class:([A-Za-z_-][A-Za-z0-9_-]*)\]$/,
            (parser, element, attrName, attrValue, match, scope) => {
                const className = match[1];
                const ctx = parser.buildContext(scope);
                const condition = parser.evaluateInContext(attrValue, ctx);

                if (condition) {
                    element.classList.add(className);
                } else {
                    element.classList.remove(className);
                }

                element.removeAttribute(attrName);
            }
        ),*/
        // Rule: @[style:property](expression) — dynamic style
        // Example: @[style:color](textColor)
        /*new HMLEDOMRule(/^@\[style:([A-Za-z-]+)\]$/,
            (parser, element, attrName, attrValue, match, scope) => {
                const styleProp = match[1];
                const ctx = parser.buildContext(scope);
                const value = parser.evaluateInContext(attrValue, ctx);

                if (value != null) {
                    (element as HTMLElement).style.setProperty(styleProp, String(value));
                }

                element.removeAttribute(attrName);
            }
        ),*/
        // Rule: @[if](condition) — conditional rendering
        // Example: @[if](showElement)
        /*new HMLEDOMRule(/^@\[if\]$/,
            (parser, element, attrName, attrValue, match, scope) => {
                const ctx = parser.buildContext(scope);
                const condition : boolean = parser.evaluateInContext(attrValue, ctx);

                if (!condition) {
                    // Create a placeholder comment
                    const placeholder = document.createComment(`@[if](${attrValue})`);
                    element.parentNode?.replaceChild(placeholder, element);
                } else {
                    element.removeAttribute(attrName);
                }
            }
        ),*/
    ];
    variables = {};
    /**
     * Add a variable to the parser's global scope
     */
    addVariable(name, value) {
        this.variables[name] = value;
        return this;
    }
    /**
     * Build execution context that includes prototype methods from scope
     */
    buildContext(scope) {
        const ctx = Object.assign({}, this.variables);
        if (scope) {
            // Copy own properties
            Object.assign(ctx, scope);
            // Copy prototype methods (for class instances)
            let proto = Object.getPrototypeOf(scope);
            while (proto && proto !== Object.prototype) {
                // Avoid copying host (DOM/native) prototype methods which may throw
                const ctorName = proto && proto.constructor ? String(proto.constructor?.name ?? '') : '';
                if (/HTMLElement|Element|Node|EventTarget|Window|GlobalThis/i.test(ctorName)) {
                    // Skip host prototypes entirely
                    proto = Object.getPrototypeOf(proto);
                    continue;
                }
                for (const key of Object.getOwnPropertyNames(proto)) {
                    if (key === 'constructor' || key in ctx)
                        continue;
                    // Use descriptor to avoid triggering getters/accessors
                    let desc;
                    try {
                        desc = Object.getOwnPropertyDescriptor(proto, key);
                    }
                    catch (e) {
                        // Some host objects may throw on descriptor access — skip safely
                        continue;
                    }
                    if (!desc)
                        continue;
                    // Only bind plain function values — don't copy getters/setters
                    if (typeof desc.value === 'function') {
                        try {
                            ctx[key] = desc.value.bind(scope);
                        }
                        catch (e) {
                            // binding some native functions may throw; skip them
                            continue;
                        }
                    }
                }
                proto = Object.getPrototypeOf(proto);
            }
        }
        return ctx;
    }
    /**
     * Resolve a dotted expression against the parser variables and optional local scope.
     */
    resolveExpression(expr, scope) {
        const combined = this.buildContext(scope);
        const parts = expr.split('.').map(p => p.trim()).filter(Boolean);
        let cur = combined;
        for (const part of parts) {
            if (cur == null)
                return undefined;
            cur = cur[part];
        }
        return cur;
    }
    /**
     * Convert value to string for text content
     */
    stringifyValue(val) {
        if (val == null)
            return '';
        if (typeof val === 'string')
            return val;
        return String(val);
    }
    /**
     * Evaluate a JavaScript expression in a given context
     */
    evaluateInContext(code, ctx) {
        try {
            const fn = new Function('with(this){ return (' + code + '); }');
            return fn.call(ctx);
        }
        catch (e) {
            try {
                const fn2 = new Function('with(this){ ' + code + ' }');
                return fn2.call(ctx);
            }
            catch (e2) {
                return undefined;
            }
        }
    }
    /**
     * Parse HMLE template string and return processed HTML string
     * @param content HMLE template string
     * @param scope Optional scope object (can be a class instance)
     * @returns Processed HTML string
     */
    parse(content, scope) {
        let working = content;
        for (const rule of HMLEParser.rules) {
            const pattern = rule.pattern;
            let result = '';
            let lastIndex = 0;
            let match;
            // Reset scanning position
            pattern.lastIndex = 0;
            while ((match = pattern.exec(working)) !== null) {
                // Append text before this match
                result += working.slice(lastIndex, match.index);
                const out = rule.replacer(this, match, working, scope);
                if (typeof out === 'string') {
                    result += out;
                    lastIndex = match.index + match[0].length;
                }
                else {
                    result += out.text;
                    lastIndex = out.end;
                }
                // Continue scanning from the correct position
                pattern.lastIndex = lastIndex;
            }
            // Append tail and update working
            result += working.slice(lastIndex);
            working = result;
        }
        return working;
    }
    /**
     * Stage 2: Process DOM rules on a fragment
     * Walks all elements and applies DOM rules based on attributes
     */
    processDOMRules(fragment, scope) {
        const elements = fragment instanceof DocumentFragment
            ? Array.from(fragment.querySelectorAll('*'))
            : [fragment, ...Array.from(fragment.querySelectorAll('*'))];
        for (const element of elements) {
            // Get all attributes to process (copy to avoid mutation issues)
            const attrs = Array.from(element.attributes);
            for (const attr of attrs) {
                // Check each DOM rule
                for (const rule of HMLEParser.domRules) {
                    rule.attrPattern.lastIndex = 0;
                    const match = rule.attrPattern.exec(attr.name);
                    if (match) {
                        rule.processor(this, element, attr.name, attr.value, match, scope);
                        break; // Only one rule per attribute
                    }
                }
            }
        }
    }
    /**
     * Parse HMLE template and create DOM elements (Stage 1 + Stage 2)
     * @param content HMLE template string
     * @param scope Optional scope object
     * @returns DocumentFragment containing parsed HTML with bindings applied
     */
    parseToDOM(content, scope) {
        // Stage 1: String processing
        const html = this.parse(content, scope);
        const template = document.createElement('template');
        template.innerHTML = html.trim();
        const fragment = template.content;
        // Stage 2: DOM processing
        this.processDOMRules(fragment, scope);
        return fragment;
    }
    /**
     * Parse HMLE template and return single element (first child)
     * @param content HMLE template string
     * @param scope Optional scope object
     * @returns First element from parsed HTML, or null
     */
    parseToElement(content, scope) {
        const fragment = this.parseToDOM(content, scope);
        return fragment.firstElementChild;
    }
    /**
     * Parse and append to a parent element
     * @param content HMLE template string
     * @param parent Parent element to append to
     * @param scope Optional scope object
     * @returns The parent element
     */
    parseAndAppend(content, parent, scope) {
        const fragment = this.parseToDOM(content, scope);
        parent.appendChild(fragment);
        return parent;
    }
    /**
     * Parse and replace element's innerHTML
     * @param content HMLE template string
     * @param element Element to update
     * @param scope Optional scope object
     * @returns The updated element
     */
    parseAndReplace(content, element, scope) {
        const fragment = this.parseToDOM(content, scope);
        element.innerHTML = '';
        element.appendChild(fragment);
        return element;
    }
    /**
     * Apply DOM rules to an existing element (Stage 2 only)
     * Useful when you already have DOM and just want to process bindings
     */
    applyBindings(element, scope) {
        this.processDOMRules(element, scope);
        return element;
    }
}
//# sourceMappingURL=HMLEParser.js.map
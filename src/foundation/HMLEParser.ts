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
    public pattern: RegExp;
    public replacer: (parser: HMLEParser, match: RegExpExecArray, input: string, scope?: Record<string, any>) => string | { text: string; end: number };

    constructor(
        pattern: RegExp,
        replacer: (parser: HMLEParser, match: RegExpExecArray, input: string, scope?: Record<string, any>) => string | { text: string; end: number }
    ) {
        this.pattern = pattern;
        this.replacer = replacer;
    }
}

// Stage 2: DOM-based rules for attribute processing
class HMLEDOMRule {
    public attrPattern: RegExp;
    public processor: (parser: HMLEParser, element: Element, attrName: string, attrValue: string, match: RegExpExecArray, scope?: Record<string, any>) => void;

    constructor(
        attrPattern: RegExp,
        processor: (parser: HMLEParser, element: Element, attrName: string, attrValue: string, match: RegExpExecArray, scope?: Record<string, any>) => void
    ) {
        this.attrPattern = attrPattern;
        this.processor = processor;
    }
}

export default class HMLEParser {
    private deferredBlocksStack: Array<Map<string, string>> = [];
    private deferredBlockCounter = 0;
    // Extract balanced braces { ... }
    private static extractBalancedBraces(content: string, start: number): { block: string; end: number } | null {
        if (content[start] !== '{') return null;
        let depth = 1;
        let i = start + 1;
        while (i < content.length && depth > 0) {
            if (content[i] === '{') depth++;
            else if (content[i] === '}') depth--;
            i++;
        }
        if (depth !== 0) return null;
        return { block: content.slice(start + 1, i - 1), end: i };
    }

    // Extract balanced parentheses ( ... )
    private static extractBalancedParens(content: string, start: number): { block: string; end: number } | null {
        if (content[start] !== '(') return null;
        let depth = 1;
        let i = start + 1;
        while (i < content.length && depth > 0) {
            if (content[i] === '(') depth++;
            else if (content[i] === ')') depth--;
            i++;
        }
        if (depth !== 0) return null;
        return { block: content.slice(start + 1, i - 1), end: i };
    }

    private static isIdentifierStart(ch: string): boolean {
        return /[A-Za-z_$]/.test(ch);
    }

    private static isIdentifierPart(ch: string): boolean {
        return /[A-Za-z0-9_$]/.test(ch);
    }

    private static transformDefStatements(code: string): string {
        if (!code.includes('def')) return code;

        let result = '';
        let i = 0;
        const len = code.length;
        let inSingle = false;
        let inDouble = false;
        let inTemplate = false;
        let inLineComment = false;
        let inBlockComment = false;
        let escape = false;

        while (i < len) {
            const ch = code[i];

            if (inLineComment) {
                result += ch;
                if (ch === '\n') inLineComment = false;
                i++;
                continue;
            }

            if (inBlockComment) {
                result += ch;
                if (ch === '*' && code[i + 1] === '/') {
                    result += '/';
                    i += 2;
                    inBlockComment = false;
                } else {
                    i++;
                }
                continue;
            }

            if (inSingle) {
                result += ch;
                if (!escape && ch === '\\') {
                    escape = true;
                } else {
                    if (!escape && ch === "'") inSingle = false;
                    escape = false;
                }
                i++;
                continue;
            }

            if (inDouble) {
                result += ch;
                if (!escape && ch === '\\') {
                    escape = true;
                } else {
                    if (!escape && ch === '"') inDouble = false;
                    escape = false;
                }
                i++;
                continue;
            }

            if (inTemplate) {
                result += ch;
                if (!escape && ch === '\\') {
                    escape = true;
                } else {
                    if (!escape && ch === '`') inTemplate = false;
                    escape = false;
                }
                i++;
                continue;
            }

            if (ch === '/' && code[i + 1] === '/') {
                inLineComment = true;
                result += ch;
                i++;
                continue;
            }

            if (ch === '/' && code[i + 1] === '*') {
                inBlockComment = true;
                result += ch;
                i++;
                continue;
            }

            if (ch === "'") {
                inSingle = true;
                result += ch;
                i++;
                continue;
            }

            if (ch === '"') {
                inDouble = true;
                result += ch;
                i++;
                continue;
            }

            if (ch === '`') {
                inTemplate = true;
                result += ch;
                i++;
                continue;
            }

            if (code.startsWith('def', i) && (i === 0 || !HMLEParser.isIdentifierPart(code[i - 1])) && (i + 3 >= len || /\s/.test(code[i + 3]))) {
                const defResult = HMLEParser.extractDefStatement(code, i);
                if (defResult) {
                    result += defResult.replacement;
                    i = defResult.nextIndex;
                    continue;
                }
            }

            result += ch;
            i++;
        }

        return result;
    }

    private static extractDefStatement(code: string, start: number): { replacement: string; nextIndex: number } | null {
        const len = code.length;
        let i = start + 3;

        while (i < len && /\s/.test(code[i])) i++;
        if (i >= len || !HMLEParser.isIdentifierStart(code[i])) return null;

        const nameStart = i;
        i++;
        while (i < len && HMLEParser.isIdentifierPart(code[i])) i++;
        const name = code.slice(nameStart, i);

        while (i < len && /\s/.test(code[i])) i++;
        if (i >= len || code[i] !== '=') return null;
        i++; // skip '='
        while (i < len && /\s/.test(code[i])) i++;

        const exprInfo = HMLEParser.extractDefExpression(code, i);
        if (!exprInfo) return null;

        const replacement = `(void __hmle_def__("${name}", (${exprInfo.expression})))` + (exprInfo.terminatedWithSemicolon ? ';' : '');
        return { replacement, nextIndex: exprInfo.nextIndex };
    }

    private static extractDefExpression(code: string, start: number): { expression: string; nextIndex: number; terminatedWithSemicolon: boolean } | null {
        const len = code.length;
        let i = start;
        let depthParen = 0;
        let depthBrace = 0;
        let depthBracket = 0;
        let inSingle = false;
        let inDouble = false;
        let inTemplate = false;
        let inLineComment = false;
        let inBlockComment = false;
        let escape = false;

        while (i < len) {
            const ch = code[i];

            if (inLineComment) {
                if (ch === '\n') inLineComment = false;
                i++;
                continue;
            }

            if (inBlockComment) {
                if (ch === '*' && code[i + 1] === '/') {
                    i += 2;
                    inBlockComment = false;
                } else {
                    i++;
                }
                continue;
            }

            if (inSingle) {
                if (!escape && ch === '\\') {
                    escape = true;
                } else {
                    if (!escape && ch === "'") inSingle = false;
                    escape = false;
                }
                i++;
                continue;
            }

            if (inDouble) {
                if (!escape && ch === '\\') {
                    escape = true;
                } else {
                    if (!escape && ch === '"') inDouble = false;
                    escape = false;
                }
                i++;
                continue;
            }

            if (inTemplate) {
                if (!escape && ch === '\\') {
                    escape = true;
                } else {
                    if (!escape && ch === '`') inTemplate = false;
                    escape = false;
                }
                i++;
                continue;
            }

            if (ch === '/' && code[i + 1] === '/') {
                inLineComment = true;
                i += 2;
                continue;
            }

            if (ch === '/' && code[i + 1] === '*') {
                inBlockComment = true;
                i += 2;
                continue;
            }

            if (ch === "'") {
                inSingle = true;
                i++;
                continue;
            }

            if (ch === '"') {
                inDouble = true;
                i++;
                continue;
            }

            if (ch === '`') {
                inTemplate = true;
                i++;
                continue;
            }

            if (ch === '(') depthParen++;
            else if (ch === ')') depthParen = Math.max(0, depthParen - 1);
            else if (ch === '{') depthBrace++;
            else if (ch === '}') depthBrace = Math.max(0, depthBrace - 1);
            else if (ch === '[') depthBracket++;
            else if (ch === ']') depthBracket = Math.max(0, depthBracket - 1);

            if (ch === ';' && depthParen === 0 && depthBrace === 0 && depthBracket === 0) {
                const expression = code.slice(start, i).trim();
                return { expression, nextIndex: i + 1, terminatedWithSemicolon: true };
            }

            i++;
        }

        const expression = code.slice(start).trim();
        return { expression, nextIndex: len, terminatedWithSemicolon: false };
    }

    // Predefined rules processed in order
    private static rules: HMLEParserRule[] = [
        // Rule: @for (item in items) { ... }
        // Accept either single variable or index,value pair and either a variable/expr or a numeric literal
        // Examples:
        //   @for (item in items) { ... }
        //   @for (idx, item in items) { ... }
        //   @for (i in 10) { ... }
        new HMLEParserRule(/@for\s*\(\s*([A-Za-z_$][A-Za-z0-9_$]*)(?:\s*,\s*([A-Za-z_$][A-Za-z0-9_$]*))?\s+in\s+([A-Za-z_$][A-Za-z0-9_$.]*|[0-9]+)\s*\)\s*\{/g,
            (parser, match, input, scope) => {
                // match[1] = first identifier (either item OR index when pair syntax used)
                // match[2] = optional second identifier (value when pair syntax used)
                // match[3] = iterable expression (dotted path or numeric literal)
                const maybeFirst = match[1];
                const maybeSecond = match[2];
                const iterableExpr = match[3];
                const blockStart = match.index + match[0].length - 1; // position of '{'

                const extracted = HMLEParser.extractBalancedBraces(input, blockStart);
                if (!extracted) return match[0];

                const inner = extracted.block;
                // Support numeric literal or expression that resolves to a number/iterable
                let arr: any[] = [];
                let unresolvedIterable = false;
                // If the iterable part is a plain number literal, use it directly
                if (/^\d+$/.test(iterableExpr)) {
                    const n = parseInt(iterableExpr, 10);
                    arr = Array.from({ length: Math.max(0, n) }, (_, i) => i);
                } else {
                    const resolved = parser.resolveExpression(iterableExpr, scope);
                    if (resolved == null) {
                        unresolvedIterable = true;
                    } else if (typeof resolved === 'number' && isFinite(resolved)) {
                        const n = Math.max(0, Math.floor(resolved));
                        arr = Array.from({ length: n }, (_, i) => i);
                    } else if (Array.isArray(resolved)) {
                        arr = resolved;
                    } else if (typeof (resolved as any)[Symbol.iterator] === 'function') {
                        arr = Array.from(resolved as Iterable<any>);
                    } else if (typeof resolved === 'object' && typeof (resolved as any).length === 'number') {
                        arr = Array.from(resolved as ArrayLike<any>);
                    } else {
                        arr = [];
                    }
                }

                if (unresolvedIterable) {
                    const fullBlock = input.slice(match.index, extracted.end);
                    const placeholder = parser.deferBlock(fullBlock);
                    return { text: placeholder, end: extracted.end };
                }

                const parts: string[] = [];
                for (let i = 0; i < arr.length; i++) {
                    const item = arr[i];
                    let fullScope: Record<string, any>;
                    // If two identifiers were provided, treat first as index and second as value
                    if (maybeSecond) {
                        fullScope = Object.assign({}, scope, { [maybeFirst]: i, [maybeSecond]: item });
                    } else {
                        // Single identifier: bind it to the item
                        fullScope = Object.assign({}, scope, { [maybeFirst]: item });
                    }
                    parts.push(parser.parse(inner, fullScope));
                }

                return { text: parts.join('\n'), end: extracted.end };
            }
        ),

        // Rule: @(( code )) — double-paren for complex expressions
        new HMLEParserRule(/@\(\(/g,
            (parser, match, input, scope) => {
                const blockStart = match.index + match[0].length - 1; // points at inner '('

                const extracted = HMLEParser.extractBalancedParens(input, blockStart);
                if (!extracted) return match[0];

                const originalCode = extracted.block;
                const code = HMLEParser.transformDefStatements(originalCode);
                const ctx = parser.buildContext(scope);
                const assignToScope = (prop: string, value: any) => {
                    (ctx as any)[prop] = value;
                    if (scope) (scope as any)[prop] = value;
                    else parser.variables[prop] = value;
                    return value;
                };
                (ctx as any).__hmle_def__ = (prop: string, value: any) => assignToScope(prop, value);
                const execCtx = new Proxy(ctx, {
                    set(target, prop, value) {
                        (target as any)[prop as any] = value;
                        return true;
                    },
                    get(target, prop) {
                        return (target as any)[prop as any];
                    }
                });
                // Prepare code transformation rules:
                // - If the code is a single assignment (no semicolons), execute it but suppress output
                // - If code contains multiple statements separated by semicolons, transform so the
                //   last non-empty statement becomes a returned value so it is printed
                let processedCode = code;
                let suppressOutput = false;
                const trimmedCode = code.trim();

                if (trimmedCode.indexOf(';') === -1) {
                    // No semicolons: detect simple assignment like `a = 1` or `a += 1` and suppress output
                    // Match assignment ops (=, +=, -=, *=, /=, %=)
                    if (/^[A-Za-z_$][A-Za-z0-9_$]*\s*(?:[+\-*/%]?=)\s*[\s\S]+$/.test(trimmedCode)) {
                        suppressOutput = true;
                    }
                } else {
                    // Multi-statement: if the user used an explicit `return` anywhere,
                    // wrap original code in an IIFE so that `return` works as expected.
                    if (/\breturn\b/.test(code)) {
                        processedCode = '(function(){' + code + '})()';
                    } else {
                        // Fallback: return the last non-empty statement's value
                        const parts = code.split(';');
                        let last = parts.length - 1;
                        while (last >= 0 && parts[last].trim() === '') last--;
                        if (last >= 0) {
                            const head = parts.slice(0, last).join(';');
                            const lastExpr = parts[last];
                            // Build a small IIFE that runs the head and returns the last expression's value
                            processedCode = '(function(){' + (head ? head + ';' : '') + ' return (' + lastExpr + '); })()';
                        }
                    }
                }

                let result: any;
                try {
                    const fn = new Function('with(this){ return (' + processedCode + '); }');
                    result = fn.call(execCtx);
                } catch (e) {
                    try {
                        const fn2 = new Function('with(this){ ' + processedCode + ' }');
                        result = fn2.call(execCtx);
                    } catch (e2) {
                        return { text: '', end: extracted.end };
                    }
                }

                // Skip outer ')' if present
                let finalEnd = extracted.end;
                if (input[extracted.end] === ')') finalEnd = extracted.end + 1;

                // If result is non-primitive (object/function) or null/undefined - do not print
                let finalText = '';
                if (!suppressOutput && result != null && typeof result !== 'object' && typeof result !== 'function') {
                    finalText = parser.stringifyValue(result);
                }
                return { text: finalText, end: finalEnd };
            }
        ),

        // Rule: @( code ) — single-paren expression
        new HMLEParserRule(/@\(/g,
            (parser, match, input, scope) => {
                const blockStart = match.index + match[0].length - 1; // points at '('

                const extracted = HMLEParser.extractBalancedParens(input, blockStart);
                if (!extracted) return match[0];

                const originalCode = extracted.block;
                const code = HMLEParser.transformDefStatements(originalCode);
                const ctx = parser.buildContext(scope);
                const assignToScope = (prop: string, value: any) => {
                    (ctx as any)[prop] = value;
                    if (scope) (scope as any)[prop] = value;
                    else parser.variables[prop] = value;
                    return value;
                };
                (ctx as any).__hmle_def__ = (prop: string, value: any) => assignToScope(prop, value);
                const execCtx = new Proxy(ctx, {
                    set(target, prop, value) {
                        (target as any)[prop as any] = value;
                        return true;
                    },
                    get(target, prop) {
                        return (target as any)[prop as any];
                    }
                });
                // Prepare processed code / suppression rules similar to double-paren handling
                let processedCode = code;
                let suppressOutput = false;
                const trimmedCode = code.trim();

                if (trimmedCode.indexOf(';') === -1) {
                    if (/^[A-Za-z_$][A-Za-z0-9_$]*\s*(?:[+\-*/%]?=)\s*[\s\S]+$/.test(trimmedCode)) {
                        suppressOutput = true;
                    }
                } else {
                    // Multi-statement -> if explicit return used, wrap as-is in IIFE
                    if (/\breturn\b/.test(code)) {
                        processedCode = '(function(){' + code + '})()';
                    } else {
                        const parts = code.split(';');
                        let last = parts.length - 1;
                        while (last >= 0 && parts[last].trim() === '') last--;
                        if (last >= 0) {
                            const head = parts.slice(0, last).join(';');
                            const lastExpr = parts[last];
                            processedCode = '(function(){' + (head ? head + ';' : '') + ' return (' + lastExpr + '); })()';
                        }
                    }
                }

                let result: any;
                try {
                    const fn = new Function('with(this){ return (' + processedCode + '); }');
                    result = fn.call(execCtx);
                } catch (e) {
                    try {
                        const fn2 = new Function('with(this){ ' + processedCode + ' }');
                        result = fn2.call(execCtx);
                    } catch (e2) {
                        return { text: '', end: extracted.end };
                    }
                }

                let finalText = '';
                if (!suppressOutput && result != null && typeof result !== 'object' && typeof result !== 'function') {
                    finalText = parser.stringifyValue(result);
                }
                return { text: finalText, end: extracted.end };
            }
        ),
    ];

    // Stage 2: DOM rules for attribute processing
    private static domRules: HMLEDOMRule[] = [
        // Rule: @[on{eventName}] = "{expression}" — event binding
        // Example: @[onclick] = "handleClick()""
        // Expression is parsed from the attribute name itself: @[on{click}]= "code here"
        new HMLEDOMRule(/^@\[on([A-Za-z]+)\]/g,
            (parser, element, attrName, attrValue, match, scope) => {
                const eventName = match[1].toLowerCase(); // click, input, etc.
                const code = attrValue; // expression from (...)
                const ctx = parser.buildContext(scope);

                const handler = (event: Event) => {
                    // Add $event to context
                    const eventCtx = Object.assign({}, ctx, { event: event, element: element });
                    try {
                        const fn = new Function('with(this){ ' + code + ' }');
                        fn.call(eventCtx);
                    } catch (e) {
                        console.error(`HMLEParser: Error in @[on${eventName}] handler:`, e);
                    }
                };

                element.addEventListener(eventName, handler);
                //element.removeAttribute(attrName);
            }
        ),

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
        new HMLEDOMRule(/^@\[ref\]/g,
            (parser, element, attrName, attrValue, match, scope) => {
                // attrValue may be a literal name or an expression that returns a string
                // Evaluate the value in context first, falling back to the raw attrValue
                const ctx = parser.buildContext(scope);
                let refName: string | undefined;
                if (attrValue && attrValue.trim() !== '') {
                    const evaluated = parser.evaluateInContext(attrValue, ctx);
                    if (typeof evaluated === 'string') refName = evaluated;
                    else if (evaluated != null) refName = String(evaluated);
                    else refName = attrValue; // fallback to literal attr value
                }

                if (refName) {
                    if (scope) {
                        (scope as any)[refName] = element;
                    } else {
                        parser.variables[refName] = element;
                    }
                }

                // keep attribute intact for debugging; parser consumer may remove it later
                // element.removeAttribute(attrName);
            }
        ),

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

    public variables: Record<string, unknown> = {};

    /**
     * Add a variable to the parser's global scope
     */
    public addVariable(name: string, value: unknown): this {
        this.variables[name] = value;
        return this;
    }

    /**
     * Build execution context that includes prototype methods from scope
     */
    private buildContext(scope?: Record<string, any>): Record<string, any> {
        const ctx: Record<string, any> = Object.assign({}, this.variables);
        if (scope) {
            // Copy own properties
            Object.assign(ctx, scope);
            // Copy prototype methods (for class instances)
            let proto = Object.getPrototypeOf(scope);
            while (proto && proto !== Object.prototype) {
                for (const key of Object.getOwnPropertyNames(proto)) {
                    if (key !== 'constructor' && typeof proto[key] === 'function' && !(key in ctx)) {
                        ctx[key] = proto[key].bind(scope);
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
    public resolveExpression(expr: string, scope?: Record<string, any>): any {
        const combined = this.buildContext(scope);
        const parts = expr.split('.').map(p => p.trim()).filter(Boolean);
        let cur: any = combined;
        for (const part of parts) {
            if (cur == null) return undefined;
            cur = cur[part];
        }
        return cur;
    }

    /**
     * Convert value to string for text content
     */
    private stringifyValue(val: any): string {
        if (val == null) return '';
        if (typeof val === 'string') return val;
        return String(val);
    }

    /**
     * Evaluate a JavaScript expression in a given context
     */
    private evaluateInContext(code: string, ctx: Record<string, any>): any {
        try {
            const fn = new Function('with(this){ return (' + code + '); }');
            return fn.call(ctx);
        } catch (e) {
            try {
                const fn2 = new Function('with(this){ ' + code + ' }');
                return fn2.call(ctx);
            } catch (e2) {
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
    public parse(content: string, scope?: Record<string, any>): string {
        let working = content;
        const maxPasses = 5;
        let pass = 0;
        const deferredBlocks = new Map<string, string>();
        this.deferredBlocksStack.push(deferredBlocks);

        try {
            while (pass < maxPasses) {
                let passChanged = false;
                deferredBlocks.clear();

                for (const rule of HMLEParser.rules) {
                    const pattern = rule.pattern;
                    let result = '';
                    let lastIndex = 0;
                    let match: RegExpExecArray | null;

                    pattern.lastIndex = 0;
                    while ((match = pattern.exec(working)) !== null) {
                        result += working.slice(lastIndex, match.index);

                        const out = rule.replacer(this, match, working, scope);

                        if (typeof out === 'string') {
                            result += out;
                            lastIndex = match.index + match[0].length;
                        } else {
                            result += out.text;
                            lastIndex = out.end;
                        }

                        pattern.lastIndex = lastIndex;
                    }

                    result += working.slice(lastIndex);

                    if (result !== working) {
                        passChanged = true;
                        working = result;
                    }
                }

                working = this.restoreDeferredBlocks(working);

                if (!passChanged) break;
                pass++;
            }
        } finally {
            this.deferredBlocksStack.pop();
        }

        return working;
    }

    private deferBlock(content: string): string {
        const stack = this.deferredBlocksStack[this.deferredBlocksStack.length - 1];
        if (!stack) return content;
        const token = `__HMLE_PENDING_BLOCK_${this.deferredBlockCounter++}__`;
        stack.set(token, content);
        return token;
    }

    private restoreDeferredBlocks(text: string): string {
        const stack = this.deferredBlocksStack[this.deferredBlocksStack.length - 1];
        if (!stack || stack.size === 0) return text;
        let restored = text;
        for (const [token, content] of stack.entries()) {
            restored = restored.replace(token, content);
        }
        stack.clear();
        return restored;
    }

    /**
     * Stage 2: Process DOM rules on a fragment
     * Walks all elements and applies DOM rules based on attributes
     */
    private processDOMRules(fragment: DocumentFragment | Element, scope?: Record<string, any>): void {
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
    public parseToDOM(content: string, scope?: Record<string, any>): DocumentFragment {
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
    public parseToElement<T extends Element = Element>(content: string, scope?: Record<string, any>): T | null {
        const fragment = this.parseToDOM(content, scope);
        return fragment.firstElementChild as T | null;
    }

    /**
     * Parse and append to a parent element
     * @param content HMLE template string
     * @param parent Parent element to append to
     * @param scope Optional scope object
     * @returns The parent element
     */
    public parseAndAppend(content: string, parent: Element, scope?: Record<string, any>): Element {
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
    public parseAndReplace(content: string, element: Element, scope?: Record<string, any>): Element {
        const fragment = this.parseToDOM(content, scope);
        element.innerHTML = '';
        element.appendChild(fragment);
        return element;
    }

    /**
     * Apply DOM rules to an existing element (Stage 2 only)
     * Useful when you already have DOM and just want to process bindings
     */
    public applyBindings(element: Element, scope?: Record<string, any>): Element {
        this.processDOMRules(element, scope);
        return element;
    }
}

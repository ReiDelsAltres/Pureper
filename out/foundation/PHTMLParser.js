class PHTMLParserRule {
    pattern;
    // replacer can return either a string replacement OR an object with { text, end }
    // where `end` is a position in the source string just after the consumed range.
    replacer;
    constructor(pattern, replacer) {
        this.pattern = pattern;
        this.replacer = replacer;
    }
}
export default class PHTMLParser {
    // Extracts a balanced block starting from position `start` in `content`.
    // Returns { block, end } where `block` is the content inside braces and `end` is the position after closing brace.
    static extractBalancedBlock(content, start) {
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
    // Extracts a balanced parenthesis block starting at `start` (which must be '(')
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
    // Note: @for handling moved to a rule in `rules` so it can participate in the
    // ordered rules pipeline. The actual exec loop for the for-rule is implemented
    // inside parse() to allow balanced-brace extraction.
    static rules = [
        // Rule for nested @for blocks. This rule's replacer computes the
        // replacement for one @for occurrence when given a RegExpExecArray
        // (it expects match.index and match.input to be present so the parser
        // can extract the full balanced block that follows the match).
        new PHTMLParserRule(/@for\s*\(([A-Za-z0-9_$]+)\s+in\s+([A-Za-z0-9_$.]+)\s*\)\s*\{/g, (parser, m, scope) => {
            // `m` will be a RegExpExecArray-like object when used by the
            // exec-based loop inside `parse()` so we can treat it accordingly.
            const match = m;
            const iterVar = match[1];
            const iterableExpr = match[2];
            const offset = Number(match[match.length - 2]); // offset position
            const input = String(match[match.length - 1]); // source string
            const blockStart = offset + match[0].length - 1; // position of '{'
            const extracted = PHTMLParser.extractBalancedBlock(input, blockStart);
            if (!extracted)
                return match[0];
            const inner = extracted.block;
            const resolved = parser.resolveExpression(iterableExpr, scope);
            const arr = Array.isArray(resolved) ? resolved : [];
            const resultParts = [];
            for (const item of arr) {
                const fullScope = Object.assign({}, scope, { [iterVar]: item });
                resultParts.push(parser.parse(inner, fullScope));
            }
            // return both the replacement text and the position after the full balanced block
            return { text: resultParts.join('\n'), end: extracted.end };
        }),
        // Double-paren expression: @(( code ))  — use exec+balanced-start extraction
        new PHTMLParserRule(/@\(\(/g, (parser, m, scope) => {
            const match = m;
            const offset = Number(match[match.length - 2]);
            const input = String(match[match.length - 1]);
            const blockStart = offset + match[0].length - 1; // points at the inner '('
            // extract balanced parentheses
            const extracted = PHTMLParser.extractBalancedParens(input, blockStart);
            if (!extracted)
                return match[0];
            const code = extracted.block;
            // Evaluate code using parser.variables + local scope
            const ctx = parser.buildContext(scope);
            let result;
            try {
                // try to evaluate as expression first
                const fn = new Function('with(this){ return (' + code + '); }');
                result = fn.call(ctx);
            }
            catch (e) {
                try {
                    const fn2 = new Function('with(this){ ' + code + ' }');
                    result = fn2.call(ctx);
                }
                catch (e2) {
                    // On error return empty string
                    return '';
                }
            }
            // final end should include the outer ')' if present (for @(( ... )) constructs)
            let finalEnd = extracted.end;
            if (input[extracted.end] === ')')
                finalEnd = extracted.end + 1;
            return { text: parser.stringifyValue(result), end: finalEnd };
        }),
        // Single-paren expression: @( code ) — similar extraction, processed after double-paren rule
        new PHTMLParserRule(/@\(/g, (parser, m, scope) => {
            const match = m;
            const offset = Number(match[match.length - 2]);
            const input = String(match[match.length - 1]);
            const blockStart = offset + match[0].length - 1; // points at '('
            const extracted = PHTMLParser.extractBalancedParens(input, blockStart);
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
                    return '';
                }
            }
            return { text: parser.stringifyValue(result), end: extracted.end };
        }),
    ];
    variables = {};
    addVariable(name, value) {
        this.variables[name] = value;
        return this;
    }
    // Resolve a dotted expression against the parser variables and optional local scope.
    // Examples: "subjectChips" -> this.variables.subjectChips
    //           "chip.Color" -> scope.chip.Color (if chip exists in scope) or this.variables.chip.Color
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
    // Build execution context that includes prototype methods from scope
    buildContext(scope) {
        const ctx = Object.assign({}, this.variables);
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
    stringifyValue(val) {
        if (val == null)
            return '';
        if (typeof val === 'string')
            return val;
        const str = String(val);
        return str;
    }
    parse(content, scope) {
        let working = content;
        for (const rule of PHTMLParser.rules) {
            const pattern = rule.pattern;
            let result = '';
            let lastIndex = 0;
            let match;
            // reset scanning position
            pattern.lastIndex = 0;
            while ((match = pattern.exec(working)) !== null) {
                // append text before this match
                result += working.slice(lastIndex, match.index);
                // build args array similar to replace(): [...match, offset, input]
                const args = [...match, match.index, working];
                const out = rule.replacer(this, args, scope);
                if (typeof out === 'string') {
                    // simple replacement: advance by matched token length
                    result += out;
                    lastIndex = match.index + match[0].length;
                }
                else {
                    // object replacement provides final end index — consume until that position
                    result += out.text;
                    lastIndex = out.end;
                }
                // make sure regex scanning continues from the correct place
                pattern.lastIndex = lastIndex;
            }
            // append tail and update working
            result += working.slice(lastIndex);
            working = result;
        }
        return working;
    }
}
//# sourceMappingURL=PHTMLParser.js.map
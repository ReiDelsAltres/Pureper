class PHTMLParserRule {
    public pattern: RegExp;

    // replacer can return either a string replacement OR an object with { text, end }
    // where `end` is a position in the source string just after the consumed range.
    public replacer: (parser: PHTMLParser, match: IArguments, scope?: Record<string, any>) => string | { text: string; end: number };

    constructor(pattern: RegExp, replacer: (parser: PHTMLParser, match: IArguments, scope?: Record<string, any>) => string | { text: string; end: number }) {
        this.pattern = pattern;
        this.replacer = replacer;
    }
}

export default class PHTMLParser {
    // Extracts a balanced block starting from position `start` in `content`.
    // Returns { block, end } where `block` is the content inside braces and `end` is the position after closing brace.
    private static extractBalancedBlock(content: string, start: number): { block: string; end: number } | null {
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

    // Extracts a balanced parenthesis block starting at `start` (which must be '(')
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

    // Note: @for handling moved to a rule in `rules` so it can participate in the
    // ordered rules pipeline. The actual exec loop for the for-rule is implemented
    // inside parse() to allow balanced-brace extraction.

    private static rules: PHTMLParserRule[] = [
        // Rule for nested @for blocks. This rule's replacer computes the
        // replacement for one @for occurrence when given a RegExpExecArray
        // (it expects match.index and match.input to be present so the parser
        // can extract the full balanced block that follows the match).
        new PHTMLParserRule(/@for\s*\(([A-Za-z0-9_$]+)\s+in\s+([A-Za-z0-9_$.]+)\s*\)\s*\{/g,
            (parser, m, scope) => {
                // `m` will be a RegExpExecArray-like object when used by the
                // exec-based loop inside `parse()` so we can treat it accordingly.
                const match = m as any as RegExpExecArray;
                const iterVar = match[1];
                const iterableExpr = match[2];
                const offset = Number(match[match.length - 2]); // offset position
                const input = String(match[match.length - 1]);   // source string

                const blockStart = offset + match[0].length - 1; // position of '{'
                const extracted = PHTMLParser.extractBalancedBlock(input, blockStart);
                if (!extracted) return match[0];

                const inner = extracted.block;
                const resolved = parser.resolveExpression(iterableExpr, scope);
                const arr = Array.isArray(resolved) ? resolved : [];

                const resultParts: string[] = [];
                for (const item of arr) {
                    const fullScope = Object.assign({}, scope, { [iterVar]: item });
                    resultParts.push(parser.parse(inner, fullScope));
                }

                // return both the replacement text and the position after the full balanced block
                return { text: resultParts.join('\n'), end: extracted.end };
            }),
        // Double-paren expression: @(( code ))  — use exec+balanced-start extraction
        new PHTMLParserRule(/@\(\(/g, (parser, m, scope) => {
            const match = m as any as RegExpExecArray;
            const offset = Number(match[match.length - 2]);
            const input = String(match[match.length - 1]);
            const blockStart = offset + match[0].length - 1; // points at the inner '('

            // extract balanced parentheses
            const extracted = PHTMLParser.extractBalancedParens(input, blockStart);
            if (!extracted) return match[0];

            const code = extracted.block;
            // Evaluate code using parser.variables + local scope
            const ctx = Object.assign({}, parser.variables, scope || {});
            let result: any;
            try {
                // try to evaluate as expression first
                const fn = new Function('with(this){ return (' + code + '); }');
                result = fn.call(ctx);
            } catch (e) {
                try {
                    const fn2 = new Function('with(this){ ' + code + ' }');
                    result = fn2.call(ctx);
                } catch (e2) {
                    // On error return empty string
                    return '';
                }
            }

            // final end should include the outer ')' if present (for @(( ... )) constructs)
            let finalEnd = extracted.end;
            if (input[extracted.end] === ')') finalEnd = extracted.end + 1;
            return { text: parser.stringifyValue(result), end: finalEnd };
        }),
        // Single-paren expression: @( code ) — similar extraction, processed after double-paren rule
        new PHTMLParserRule(/@\(/g, (parser, m, scope) => {
            const match = m as any as RegExpExecArray;
            const offset = Number(match[match.length - 2]);
            const input = String(match[match.length - 1]);
            const blockStart = offset + match[0].length - 1; // points at '('

            const extracted = PHTMLParser.extractBalancedParens(input, blockStart);
            if (!extracted) return match[0];

            const code = extracted.block;
            const ctx = Object.assign({}, parser.variables, scope || {});
            let result: any;
            try {
                const fn = new Function('with(this){ return (' + code + '); }');
                result = fn.call(ctx);
            } catch (e) {
                try {
                    const fn2 = new Function('with(this){ ' + code + ' }');
                    result = fn2.call(ctx);
                } catch (e2) {
                    return '';
                }
            }

            return { text: parser.stringifyValue(result), end: extracted.end };
        }),
    ];
    public variables: Record<string, unknown> = {};

    public addVariable(name: string, value: unknown): this {
        this.variables[name] = value;
        return this;
    }

    // Resolve a dotted expression against the parser variables and optional local scope.
    // Examples: "subjectChips" -> this.variables.subjectChips
    //           "chip.Color" -> scope.chip.Color (if chip exists in scope) or this.variables.chip.Color
    public resolveExpression(expr: string, scope?: Record<string, any>): any {
        const combined = Object.assign({}, this.variables, scope || {});
        const parts = expr.split('.').map(p => p.trim()).filter(Boolean);
        let cur: any = combined;
        for (const part of parts) {
            if (cur == null) return undefined;
            cur = cur[part];
        }
        return cur;
    }

    private stringifyValue(val: any): string {
        if (val == null) return '';
        if (typeof val === 'string') return val;
        const str = String(val);
        return str;
    }

    public parse(content: string, scope?: Record<string, any>): string {
        let working = content;

        for (const rule of PHTMLParser.rules) {
            const pattern = rule.pattern;
            let result = '';
            let lastIndex = 0;
            let match: RegExpExecArray | null;

            // reset scanning position
            pattern.lastIndex = 0;
            while ((match = pattern.exec(working)) !== null) {
                // append text before this match
                result += working.slice(lastIndex, match.index);

                // build args array similar to replace(): [...match, offset, input]
                const args = [...match, match.index, working] as any as IArguments;
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
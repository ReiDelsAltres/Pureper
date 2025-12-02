class PHTMLParserRule {
    public pattern: RegExp;

    public replacer: (parser: PHTMLParser, match: IArguments, scope?: Record<string, any>) => string;

    constructor(pattern: RegExp, replacer: (parser: PHTMLParser, match: IArguments, scope?: Record<string, any>) => string) {
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

    // Parses @for constructs with proper nesting support using brace counting.
    private parseForLoops(content: string, scope?: Record<string, any>): string {
        const forPattern = /@for\s*\(([A-Za-z0-9_$]+)\s+in\s+([A-Za-z0-9_$.]+)\s*\)\s*\{/g;
        let result = '';
        let lastIndex = 0;
        let match: RegExpExecArray | null;

        while ((match = forPattern.exec(content)) !== null) {
            // Append text before this @for
            result += content.slice(lastIndex, match.index);

            const iterVar = match[1];
            const iterableExpr = match[2];
            const blockStart = match.index + match[0].length - 1; // position of '{'

            const extracted = PHTMLParser.extractBalancedBlock(content, blockStart);
            if (!extracted) {
                // Unbalanced braces, just append the match as-is and continue
                result += match[0];
                lastIndex = match.index + match[0].length;
                continue;
            }

            const inner = extracted.block;
            lastIndex = extracted.end;
            forPattern.lastIndex = lastIndex; // Update regex position

            const resolved = this.resolveExpression(iterableExpr, scope);
            const arr = Array.isArray(resolved) ? resolved : [];

            const resultParts: string[] = [];
            for (const item of arr) {
                const fullScope = Object.assign({}, scope, { [iterVar]: item });
                // Recursively parse inner block (handles nested @for and other rules)
                const t = this.parse(inner, fullScope);
                resultParts.push(t);
            }
            result += resultParts.join('\n');
        }

        // Append remaining content after last match
        result += content.slice(lastIndex);
        return result;
    }

    private static rules: PHTMLParserRule[] = [
        new PHTMLParserRule(/@\(\(([\s\S]+?)\)\)/g, (parser, m, scope) => 
            parser.stringifyValue(parser.resolveExpression(m[1], scope))),
        new PHTMLParserRule(/@\(([\s\S]+?)\)/g, (parser, m, scope) => 
            parser.stringifyValue(parser.resolveExpression(m[1], scope))),
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
        return JSON.stringify(val, null, 0);
    }

    public parse(content: string, scope?: Record<string, any>): string {
        // First, parse @for loops with proper nesting support
        let working = this.parseForLoops(content, scope);
        
        // Then apply other rules
        for (const rule of PHTMLParser.rules) {
            working = working.replace(rule.pattern,
                (...args) => rule.replacer(this, args as any, scope));
        }
        return working;
    }
}
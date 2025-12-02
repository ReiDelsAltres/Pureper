class PHTMLParserRule {
    public pattern: RegExp;

    public replacer: (parser: PHTMLParser, match: IArguments, scope?: Record<string, any>) => string;

    constructor(pattern: RegExp, replacer: (parser: PHTMLParser, match: IArguments, scope?: Record<string, any>) => string) {
        this.pattern = pattern;
        this.replacer = replacer;
    }
}

export default class PHTMLParser {
    private static rules: PHTMLParserRule[] = [
        // Rule: for-loops like @for (item in items) { ... }
        new PHTMLParserRule(/@for\s*\(([A-Za-z0-9_$]+)\s+in\s+([A-Za-z0-9_$.]+)\s*\)\s*\{([\s\S]*?)\}/g,
            (parser, m, scope) => {
                // m[1] = iteration variable name, m[2] = iterable expression, m[3] = inner block
                const iterVar = m[1];
                const iterableExpr = m[2];
                const inner = m[3];

                const resolved = parser.resolveExpression(iterableExpr, scope);
                const arr = Array.isArray(resolved) ? resolved : [];

                const resultParts: string[] = [];
                let i = 0;
                for (const item of arr) {
                    const fullScope = Object.assign({}, scope, { [iterVar]: item });
                    // parse inner block for this item
                    let t = parser.parse(inner, fullScope);
                    // normalize whitespace: remove leading/trailing whitespace lines and 
                    if (i === 0) {
                        t = t.trim();
                        t = "    " + t;
                    }
                    t = t.split(/\n/)
                        //.map(line => line.trim())
                        .filter(line => line.length > 0)
                        .toString();
                        //.join('\n');
                    resultParts.push(t);
                    i++;
                }
                // join each item's rendered chunk with a single newline so output is compact
                return resultParts.join('\n');

                // Parse inner block for each element in the iterable using a local scope
                //return arr.map((el) => parser.parse(inner, Object.assign({}, scope, { [iterVar]: el }))).join('');
            }),
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
        return String(val);
    }

    public parse(content: string, scope?: Record<string, any>): string {
        let working = content;
        for (const rule of PHTMLParser.rules) {
            working = working.replace(rule.pattern,
                (...args) => rule.replacer(this, args as any, scope));
        }
        return working;
    }
}
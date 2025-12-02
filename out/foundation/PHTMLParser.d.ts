export default class PHTMLParser {
    private static rules;
    variables: Record<string, unknown>;
    addVariable(name: string, value: unknown): this;
    resolveExpression(expr: string, scope?: Record<string, any>): any;
    private stringifyValue;
    parse(content: string, scope?: Record<string, any>): string;
}
//# sourceMappingURL=PHTMLParser.d.ts.map
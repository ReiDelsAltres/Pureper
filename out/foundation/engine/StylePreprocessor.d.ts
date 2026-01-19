import Scope from "./Scope.js";
interface Node {
    type: string;
    loc?: {
        start: number;
        end: number;
    };
}
type Token = {
    type: "ident";
    value: string;
} | {
    type: "brace-open";
    depth: number;
} | {
    type: "brace-close";
    depth: number;
} | {
    type: "parenthesis-open";
    depth: number;
} | {
    type: "parenthesis-close";
    depth: number;
} | {
    type: "colon";
} | {
    type: "semicolon";
} | {
    type: "colon-rule";
    value: string;
} | {
    type: "at";
    value: string;
} | {
    type: "string";
    value: string;
};
export default class StylePreprocessor {
    private tokens;
    private pos;
    constructor(tokens: Token[], pos?: number);
    private match;
    private consume;
    static tokenize(css: string): Token[];
    static preprocess(css: string, data?: Scope): string;
    walk(walker: StylePreprocessor, node: Token[], data?: Scope): Node[];
}
export {};
//# sourceMappingURL=StylePreprocessor.d.ts.map
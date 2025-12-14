export default class Rule {
    static readonly PREFIX = "@";
}
export declare class RuleFor<T> extends Rule {
    indexName: string;
    index: number;
    variableName: string;
    variable: T;
    iterableName: string;
    iterable: Iterable<T>;
    constructor(index: number, variable: T, iterable: Iterable<T>);
}
export type Expression<T> = () => T;
export declare class Scope {
}
//# sourceMappingURL=Rule.d.ts.map
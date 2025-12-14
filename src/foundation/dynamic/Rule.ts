export default class Rule {
    public static readonly PREFIX = "@";
}
export class RuleFor<T> extends Rule {
    public indexName: string;
    public index: number;

    public variableName: string;
    public variable: T;

    public iterableName: string;
    public iterable: Iterable<T>;

    public constructor(index: number, variable: T, iterable: Iterable<T>) {
        super();
        this.index = index;
        this.variable = variable;
        this.iterable = iterable;
    }
}
export type Expression<T> = () => T; 
export class Scope {

}
export default class Rule {
    static PREFIX = "@";
}
export class RuleFor extends Rule {
    indexName;
    index;
    variableName;
    variable;
    iterableName;
    iterable;
    constructor(index, variable, iterable) {
        super();
        this.index = index;
        this.variable = variable;
        this.iterable = iterable;
    }
}
export class Scope {
}
//# sourceMappingURL=Rule.js.map
import { SyntaxRule } from '../../Rule.js';
import type { RuleMatch, RuleResult } from '../../Rule.js';
import Scope from '../../Scope.js';
/**
 * ForRule - обработка @for
 * Варианты:
 * 1. @for(item in collection) { ... }
 * 2. @for(idx, item in collection) { ... }
 * 3. @for(i in 5) { ... } - числовая итерация 0..4
 */
export default class ForRule extends SyntaxRule {
    readonly name = "for";
    readonly priority = 10;
    find(template: string): RuleMatch[];
    private parseForStatement;
    private skipString;
    execute(match: RuleMatch, scope: Scope, engine?: any): RuleResult;
}
//# sourceMappingURL=ForRule.d.ts.map
import { SyntaxRule } from '../../Rule.js';
import type { RuleMatch, RuleResult } from '../../Rule.js';
import Scope from '../../Scope.js';
/**
 * IfRule - обработка @if/@elseif/@else
 */
export default class IfRule extends SyntaxRule {
    readonly name = "if";
    readonly priority = 20;
    find(template: string): RuleMatch[];
    private parseIfChain;
    private parseConditionBlock;
    private parseElseBlock;
    private skipString;
    execute(match: RuleMatch, scope: Scope, engine?: any): RuleResult;
}
//# sourceMappingURL=IfRule.d.ts.map
import { SyntaxRule } from '../../Rule.js';
import type { RuleMatch, RuleResult } from '../../Rule.js';
import Scope from '../../Scope.js';
/**
 * ExpressionRule - обработка @(Expression)
 * Выводит результат выражения как строку.
 * Автоматически отслеживает Observable и разворачивает их значения.
 */
export default class ExpressionRule extends SyntaxRule {
    readonly name = "expression";
    readonly priority = 50;
    find(template: string): RuleMatch[];
    execute(match: RuleMatch, scope: Scope): RuleResult;
    /**
     * Асинхронная версия execute
     */
    executeAsync(match: RuleMatch, scope: Scope): Promise<RuleResult>;
}
//# sourceMappingURL=ExpressionRule.d.ts.map
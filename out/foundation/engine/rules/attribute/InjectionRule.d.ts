import { AttributeRule } from '../../Rule.js';
import type { RuleMatch, RuleResult } from '../../Rule.js';
import Scope from '../../Scope.js';
/**
 * InjectionRule - обработка @injection[type]="expression"
 * Инжектирует элемент в целевой элемент (найденный по @[ref]).
 * type: 'head' = prepend, 'tail' = append
 */
export default class InjectionRule extends AttributeRule {
    readonly name = "injection";
    readonly priority = 200;
    find(template: string): RuleMatch[];
    execute(match: RuleMatch, scope: Scope): RuleResult;
    supportsObservable(): boolean;
    /**
     * Постобработка: выполнить инжекцию элементов
     */
    static processInjections(root: Element | DocumentFragment, scope: Scope): void;
}
//# sourceMappingURL=InjectionRule.d.ts.map
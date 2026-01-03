import { AttributeRule } from '../../Rule.js';
import type { RuleMatch, RuleResult } from '../../Rule.js';
import Scope from '../../Scope.js';
/**
 * RefRule - обработка @[ref]="expression"
 * Добавляет HTML элемент в Scope под указанным именем.
 */
export default class RefRule extends AttributeRule {
    readonly name = "ref";
    readonly priority = 5;
    find(template: string): RuleMatch[];
    execute(match: RuleMatch, scope: Scope): RuleResult;
    supportsObservable(): boolean;
    /**
     * Постобработка: привязать реальный элемент к Scope
     */
    static bindElement(element: Element, refName: string, scope: Scope): void;
    /**
     * Очистка: установить ref в null если элемент удалён
     */
    static unbindElement(refName: string, scope: Scope): void;
}
//# sourceMappingURL=RefRule.d.ts.map
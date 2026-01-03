import { AttributeRule } from '../../Rule.js';
import type { RuleMatch, RuleResult } from '../../Rule.js';
import Scope from '../../Scope.js';
/**
 * EventRule - обработка @on[eventName]="expression"
 * Подписывает элемент на событие.
 */
export default class EventRule extends AttributeRule {
    readonly name = "event";
    readonly priority = 30;
    find(template: string): RuleMatch[];
    execute(match: RuleMatch, scope: Scope): RuleResult;
    /**
     * Постобработка: привязать события к элементам
     */
    static bindEvents(element: Element, scope: Scope): (() => void)[];
    /**
     * Привязать событие с поддержкой Observable
     */
    static bindEventWithObservable(element: Element, eventName: string, exprCode: string, scope: Scope): () => void;
}
//# sourceMappingURL=EventRule.d.ts.map
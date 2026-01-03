import Scope from './Scope.js';
/**
 * RuleMatch - результат поиска Rule в шаблоне
 */
export interface RuleMatch {
    /** Полное совпадение включая синтаксис Rule */
    fullMatch: string;
    /** Начальная позиция в исходной строке */
    start: number;
    /** Конечная позиция в исходной строке */
    end: number;
    /** Дополнительные данные специфичные для Rule */
    data?: Record<string, any>;
}
/**
 * RuleResult - результат выполнения Rule
 */
export interface RuleResult {
    /** HTML-результат для замены */
    output: string;
    /** Использованные Observable для отслеживания */
    observables?: any[];
    /** Дочерние Rule (для вложенных структур) */
    children?: Rule[];
    /** Дополнительные данные (например, refName для RefRule) */
    data?: Record<string, any>;
}
/**
 * RuleType - тип Rule
 */
export type RuleType = 'syntax' | 'attribute';
/**
 * Rule - базовый абстрактный класс для всех правил шаблонизатора.
 */
export default abstract class Rule {
    /** Уникальное имя правила */
    abstract readonly name: string;
    /** Тип правила: syntax или attribute */
    abstract readonly type: RuleType;
    /** Приоритет выполнения (меньше = раньше) */
    readonly priority: number;
    /**
     * Найти все вхождения этого Rule в шаблоне.
     * @param template - исходный шаблон
     * @returns массив найденных совпадений
     */
    abstract find(template: string): RuleMatch[];
    /**
     * Выполнить Rule и вернуть результат.
     * @param match - найденное совпадение
     * @param scope - текущий Scope
     * @param engine - ссылка на TemplateEngine (для рекурсивной обработки)
     */
    abstract execute(match: RuleMatch, scope: Scope, engine?: any): RuleResult | Promise<RuleResult>;
    /**
     * Проверить, поддерживает ли Rule Observable значения
     */
    supportsObservable(): boolean;
}
/**
 * SyntaxRule - базовый класс для синтаксических правил.
 * Синтаксические правила могут быть в любом месте шаблона (кроме атрибутов).
 */
export declare abstract class SyntaxRule extends Rule {
    readonly type: RuleType;
}
/**
 * AttributeRule - базовый класс для атрибутивных правил.
 * Атрибутивные правила работают только внутри HTML-тегов.
 */
export declare abstract class AttributeRule extends Rule {
    readonly type: RuleType;
    /**
     * Получить элемент, к которому применяется атрибут.
     * @param template - шаблон
     * @param attributePosition - позиция атрибута
     * @returns информация об элементе
     */
    protected findParentElement(template: string, attributePosition: number): {
        tagName: string;
        tagStart: number;
        tagEnd: number;
    } | null;
}
//# sourceMappingURL=Rule.d.ts.map
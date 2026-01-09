import Scope from './Scope.js';
import Expression from './Expression.js';
import TemplateInstance, { TemplateSection } from './TemplateInstance.js';
import Rule, { SyntaxRule, AttributeRule } from './Rule.js';
import Observable from '../api/Observer.js';
import ExpressionRule from './rules/syntax/ExpressionRule.js';
import IfRule from './rules/syntax/IfRule.js';
import ForRule from './rules/syntax/ForRule.js';
import RefRule from './rules/attribute/RefRule.js';
import EventRule from './rules/attribute/EventRule.js';
import InjectionRule from './rules/attribute/InjectionRule.js';
/**
 * TemplateEngineOptions - настройки TemplateEngine
 */
export interface TemplateEngineOptions {
    /** Оставлять синтаксис атрибутивных Rule в финальном HTML */
    showAttributeRule?: boolean;
    /** Включить предупреждения отладки */
    debugWarnings?: boolean;
}
/**
 * ProcessResult - результат обработки шаблона
 */
export interface ProcessResult {
    output: string;
    observables: Observable<any>[];
    sections: TemplateSection[];
    /** ID созданного фрагмента (если был создан) */
    fragmentId?: string;
}
/**
 * TemplateEngine - главный класс шаблонизатора.
 * Обрабатывает HTML-шаблон с Rule и создаёт TemplateInstance.
 */
export default class TemplateEngine {
    private readonly scope;
    private readonly options;
    private readonly syntaxRules;
    private readonly attributeRules;
    constructor(scope: Scope | object, options?: TemplateEngineOptions);
    /**
     * Зарегистрировать стандартные правила
     */
    private registerDefaultRules;
    /**
     * Добавить пользовательское правило
     */
    addRule(rule: Rule): void;
    /**
     * Получить Scope
     */
    getScope(): Scope;
    /**
     * Обработать шаблон и вернуть TemplateInstance
     */
    parse(template: string): TemplateInstance;
    /**
     * Обработать шаблон с созданием фрагментов
     */
    private processTemplateWithFragments;
    /**
     * Обработать шаблон (внутренний метод, используется Rule для рекурсии)
     */
    processTemplate(template: string, scope: Scope): ProcessResult;
    /**
     * Обработать одно правило
     */
    private processRule;
    /**
     * Удалить синтаксис атрибутивных Rule из финального HTML
     */
    private removeAttributeSyntax;
    /**
     * Добавить новый шаблон в существующий TemplateInstance.
     * Обрабатывает шаблон и добавляет результат как новый фрагмент.
     * Если instance привязан к контейнерам, DOM обновится автоматически.
     *
     * @param instance - существующий TemplateInstance
     * @param template - новый шаблон для добавления
     * @param customScope - опциональный scope для нового шаблона
     * @returns ID созданного фрагмента
     */
    appendTemplate(instance: TemplateInstance, template: string, customScope?: Scope | object): string;
    /**
     * Статический метод для быстрой обработки
     */
    static process(template: string, scope: object, options?: TemplateEngineOptions): string;
    /**
     * Создать TemplateInstance из шаблона
     */
    static create(template: string, scope: object, options?: TemplateEngineOptions): TemplateInstance;
}
export { Scope, Expression, TemplateInstance, Rule, SyntaxRule, AttributeRule };
export { ExpressionRule, IfRule, ForRule, RefRule, EventRule, InjectionRule };
export * from './exceptions/TemplateExceptions.js';
//# sourceMappingURL=TemplateEngine.old.d.ts.map
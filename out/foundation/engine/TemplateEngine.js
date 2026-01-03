import Scope from './Scope.js';
import Expression from './Expression.js';
import EscapeHandler from './EscapeHandler.js';
import TemplateInstance from './TemplateInstance.js';
import Rule, { SyntaxRule, AttributeRule } from './Rule.js';
// Import rules
import ExpressionRule from './rules/syntax/ExpressionRule.js';
import IfRule from './rules/syntax/IfRule.js';
import ForRule from './rules/syntax/ForRule.js';
import RefRule from './rules/attribute/RefRule.js';
import EventRule from './rules/attribute/EventRule.js';
import InjectionRule from './rules/attribute/InjectionRule.js';
/**
 * TemplateEngine - главный класс шаблонизатора.
 * Обрабатывает HTML-шаблон с Rule и создаёт TemplateInstance.
 */
export default class TemplateEngine {
    scope;
    options;
    syntaxRules = [];
    attributeRules = [];
    constructor(scope, options) {
        this.scope = scope instanceof Scope ? scope : Scope.from(scope);
        this.options = {
            showAttributeRule: false,
            debugWarnings: true,
            ...options
        };
        // Register default rules (sorted by priority)
        this.registerDefaultRules();
    }
    /**
     * Зарегистрировать стандартные правила
     */
    registerDefaultRules() {
        // Syntax rules
        this.syntaxRules.push(new ForRule());
        this.syntaxRules.push(new IfRule());
        this.syntaxRules.push(new ExpressionRule());
        // Attribute rules
        this.attributeRules.push(new RefRule());
        this.attributeRules.push(new EventRule());
        this.attributeRules.push(new InjectionRule());
        // Sort by priority
        this.syntaxRules.sort((a, b) => a.priority - b.priority);
        this.attributeRules.sort((a, b) => a.priority - b.priority);
    }
    /**
     * Добавить пользовательское правило
     */
    addRule(rule) {
        if (rule.type === 'syntax') {
            this.syntaxRules.push(rule);
            this.syntaxRules.sort((a, b) => a.priority - b.priority);
        }
        else {
            this.attributeRules.push(rule);
            this.attributeRules.sort((a, b) => a.priority - b.priority);
        }
    }
    /**
     * Получить Scope
     */
    getScope() {
        return this.scope;
    }
    /**
     * Обработать шаблон и вернуть TemplateInstance
     */
    parse(template) {
        const result = this.processTemplate(template, this.scope);
        const templateInstance = new TemplateInstance(result.output, this.scope);
        // Add sections
        for (const section of result.sections) {
            templateInstance.addSection(section);
            // Track observables
            for (const observable of section.result.observables || []) {
                templateInstance.trackObservable(observable, section, (s) => {
                    return this.processTemplate(s.sourceTemplate, this.scope);
                });
            }
        }
        return templateInstance;
    }
    /**
     * Обработать шаблон (внутренний метод, используется Rule для рекурсии)
     */
    processTemplate(template, scope) {
        const allObservables = [];
        const allSections = [];
        // Step 1: Handle @@ escape sequences
        let processed = EscapeHandler.process(template, (escaped) => {
            let result = escaped;
            // Step 2: Process syntax rules (in priority order)
            for (const rule of this.syntaxRules) {
                result = this.processRule(rule, result, scope, allObservables, allSections);
            }
            // Step 3: Process attribute rules
            for (const rule of this.attributeRules) {
                // Skip injection - processed last
                if (rule.name === 'injection')
                    continue;
                result = this.processRule(rule, result, scope, allObservables, allSections);
            }
            return result;
        });
        // Step 4: Process injection rules last
        const injectionRule = this.attributeRules.find(r => r.name === 'injection');
        if (injectionRule) {
            processed = this.processRule(injectionRule, processed, scope, allObservables, allSections);
        }
        // Step 5: Handle showAttributeRule option
        if (!this.options.showAttributeRule) {
            processed = this.removeAttributeSyntax(processed);
        }
        return {
            output: processed,
            observables: allObservables,
            sections: allSections
        };
    }
    /**
     * Обработать одно правило
     */
    processRule(rule, template, scope, observables, sections) {
        const matches = rule.find(template);
        // Sort matches by position (reverse to process from end)
        matches.sort((a, b) => b.start - a.start);
        let result = template;
        for (const match of matches) {
            try {
                const ruleResult = rule.execute(match, scope, this);
                // Track observables
                if (ruleResult.observables) {
                    observables.push(...ruleResult.observables);
                }
                // Create section
                const section = {
                    rule,
                    match,
                    result: ruleResult,
                    sourceTemplate: match.fullMatch,
                    children: [],
                    subscriptions: []
                };
                sections.push(section);
                // Replace in template
                result = result.slice(0, match.start) + ruleResult.output + result.slice(match.end);
            }
            catch (error) {
                console.error(`[TemplateEngine] Error processing rule "${rule.name}":`, error);
                // Continue processing other rules
            }
        }
        return result;
    }
    /**
     * Удалить синтаксис атрибутивных Rule из финального HTML
     */
    removeAttributeSyntax(template) {
        // Remove @[ref], @on[...], @injection[...] patterns that weren't processed
        return template
            .replace(/@\[ref\]\s*=\s*["'][^"']*["']/gi, '')
            .replace(/@on\[[a-zA-Z]+\]\s*=\s*["'][^"']*["']/gi, '')
            .replace(/@injection\[(head|tail)\]\s*=\s*["'][^"']*["']/gi, '');
    }
    /**
     * Статический метод для быстрой обработки
     */
    static process(template, scope, options) {
        const engine = new TemplateEngine(scope, options);
        const TemplateInstance = engine.parse(template);
        return TemplateInstance.getTemplate();
    }
    /**
     * Создать TemplateInstance из шаблона
     */
    static create(template, scope, options) {
        const engine = new TemplateEngine(scope, options);
        return engine.parse(template);
    }
}
// Re-export useful types
export { Scope, Expression, TemplateInstance, Rule, SyntaxRule, AttributeRule };
export { ExpressionRule, IfRule, ForRule, RefRule, EventRule, InjectionRule };
export * from './exceptions/TemplateExceptions.js';
//# sourceMappingURL=TemplateEngine.js.map
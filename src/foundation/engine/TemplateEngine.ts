import Scope from './Scope.js';
import Expression from './Expression.js';
import EscapeHandler from './EscapeHandler.js';
import TemplateInstance, { TemplateSection } from './TemplateInstance.js';
import Rule, { RuleMatch, RuleResult, SyntaxRule, AttributeRule } from './Rule.js';
import Observable from '../api/Observer.js';

// Import rules
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
}

/**
 * TemplateEngine - главный класс шаблонизатора.
 * Обрабатывает HTML-шаблон с Rule и создаёт TemplateInstance.
 */
export default class TemplateEngine {
    private readonly scope: Scope;
    private readonly options: TemplateEngineOptions;
    private readonly syntaxRules: SyntaxRule[] = [];
    private readonly attributeRules: AttributeRule[] = [];

    constructor(scope: Scope | object, options?: TemplateEngineOptions) {
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
    private registerDefaultRules(): void {
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
    public addRule(rule: Rule): void {
        if (rule.type === 'syntax') {
            this.syntaxRules.push(rule as SyntaxRule);
            this.syntaxRules.sort((a, b) => a.priority - b.priority);
        } else {
            this.attributeRules.push(rule as AttributeRule);
            this.attributeRules.sort((a, b) => a.priority - b.priority);
        }
    }

    /**
     * Получить Scope
     */
    public getScope(): Scope {
        return this.scope;
    }

    /**
     * Обработать шаблон и вернуть TemplateInstance
     */
    public parse(template: string): TemplateInstance {
        const result = this.processTemplate(template, this.scope);
        const TemplateInstance = new TemplateInstance(result.output, this.scope);

        // Add sections
        for (const section of result.sections) {
            TemplateInstance.addSection(section);

            // Track observables
            for (const observable of section.result.observables || []) {
                TemplateInstance.trackObservable(observable, section, (s) => {
                    return this.processTemplate(s.sourceTemplate, this.scope);
                });
            }
        }

        return TemplateInstance;
    }

    /**
     * Обработать шаблон (внутренний метод, используется Rule для рекурсии)
     */
    public processTemplate(template: string, scope: Scope): ProcessResult {
        const allObservables: Observable<any>[] = [];
        const allSections: TemplateSection[] = [];

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
                if (rule.name === 'injection') continue;
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
    private processRule(
        rule: Rule,
        template: string,
        scope: Scope,
        observables: Observable<any>[],
        sections: TemplateSection[]
    ): string {
        const matches = rule.find(template);
        
        // Sort matches by position (reverse to process from end)
        matches.sort((a, b) => b.start - a.start);

        let result = template;

        for (const match of matches) {
            try {
                const ruleResult = rule.execute(match, scope, this) as RuleResult;

                // Track observables
                if (ruleResult.observables) {
                    observables.push(...ruleResult.observables);
                }

                // Create section
                const section: TemplateSection = {
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

            } catch (error) {
                console.error(`[TemplateEngine] Error processing rule "${rule.name}":`, error);
                // Continue processing other rules
            }
        }

        return result;
    }

    /**
     * Удалить синтаксис атрибутивных Rule из финального HTML
     */
    private removeAttributeSyntax(template: string): string {
        // Remove @[ref], @on[...], @injection[...] patterns that weren't processed
        return template
            .replace(/@\[ref\]\s*=\s*["'][^"']*["']/gi, '')
            .replace(/@on\[[a-zA-Z]+\]\s*=\s*["'][^"']*["']/gi, '')
            .replace(/@injection\[(head|tail)\]\s*=\s*["'][^"']*["']/gi, '');
    }

    /**
     * Статический метод для быстрой обработки
     */
    public static process(template: string, scope: object, options?: TemplateEngineOptions): string {
        const engine = new TemplateEngine(scope, options);
        const TemplateInstance = engine.parse(template);
        return TemplateInstance.getTemplate();
    }

    /**
     * Создать TemplateInstance из шаблона
     */
    public static create(template: string, scope: object, options?: TemplateEngineOptions): TemplateInstance {
        const engine = new TemplateEngine(scope, options);
        return engine.parse(template);
    }
}

// Re-export useful types
export { Scope, Expression, TemplateInstance, Rule, SyntaxRule, AttributeRule };
export { ExpressionRule, IfRule, ForRule, RefRule, EventRule, InjectionRule };
export * from './exceptions/TemplateExceptions.js';

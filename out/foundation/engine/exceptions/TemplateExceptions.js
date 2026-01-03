/**
 * InvalidDynamicRuleUsage - исключение при использовании Observable
 * в правилах, которые не поддерживают динамическое обновление.
 * Например: @[ref], @injection
 */
export class InvalidDynamicRuleUsage extends Error {
    constructor(ruleName, message) {
        super(message ?? `Rule "${ruleName}" does not support Observable values. Use a static value instead.`);
        this.name = 'InvalidDynamicRuleUsage';
    }
}
/**
 * InvalidTemplateEngineSyntaxException - исключение при синтаксических ошибках
 * в шаблоне. Например: @if без boolean, @for с неверным типом.
 */
export class InvalidTemplateEngineSyntaxException extends Error {
    line;
    column;
    constructor(message, options) {
        super(message);
        this.name = 'InvalidTemplateEngineSyntaxException';
        this.line = options?.line;
        this.column = options?.column;
    }
}
//# sourceMappingURL=TemplateExceptions.js.map
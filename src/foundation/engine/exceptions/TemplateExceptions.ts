/**
 * InvalidDynamicRuleUsage - исключение при использовании Observable
 * в правилах, которые не поддерживают динамическое обновление.
 * Например: @[ref], @injection
 */
export class InvalidDynamicRuleUsage extends Error {
    constructor(ruleName: string, message?: string) {
        super(message ?? `Rule "${ruleName}" does not support Observable values. Use a static value instead.`);
        this.name = 'InvalidDynamicRuleUsage';
    }
}

/**
 * InvalidTemplateEngineSyntaxException - исключение при синтаксических ошибках
 * в шаблоне. Например: @if без boolean, @for с неверным типом.
 */
export class InvalidTemplateEngineSyntaxException extends Error {
    public readonly line?: number;
    public readonly column?: number;

    constructor(message: string, options?: { line?: number; column?: number }) {
        super(message);
        this.name = 'InvalidTemplateEngineSyntaxException';
        this.line = options?.line;
        this.column = options?.column;
    }
}

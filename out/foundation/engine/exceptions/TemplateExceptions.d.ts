/**
 * InvalidDynamicRuleUsage - исключение при использовании Observable
 * в правилах, которые не поддерживают динамическое обновление.
 * Например: @[ref], @injection
 */
export declare class InvalidDynamicRuleUsage extends Error {
    constructor(ruleName: string, message?: string);
}
/**
 * InvalidTemplateEngineSyntaxException - исключение при синтаксических ошибках
 * в шаблоне. Например: @if без boolean, @for с неверным типом.
 */
export declare class InvalidTemplateEngineSyntaxException extends Error {
    readonly line?: number;
    readonly column?: number;
    constructor(message: string, options?: {
        line?: number;
        column?: number;
    });
}
//# sourceMappingURL=TemplateExceptions.d.ts.map
/**
 * BalancedParser - утилита для парсинга сбалансированных скобок (), {}.
 * Корректно обрабатывает строки и комментарии.
 */
export default class BalancedParser {
    /**
     * Найти все сбалансированные выражения с заданным opener.
     * @param input - входная строка
     * @param opener - открывающая последовательность, например '@(' или '@for('
     * @returns массив объектов с content и позициями
     */
    static parseBalanced(input: string, opener: string, closerChar?: ')' | '}'): Array<{
        content: string;
        start: number;
        end: number;
    }>;
    /**
     * Парсить блочные Rule типа @for(...) { ... }
     * @returns объект с condition (содержимое скобок) и block (содержимое фигурных скобок)
     */
    static parseBlockRule(input: string, opener: string): Array<{
        condition: string;
        block: string;
        start: number;
        end: number;
    }>;
    /**
     * Парсить @if/@elseif/@else цепочки
     */
    static parseIfChain(input: string): Array<{
        type: 'if' | 'elseif' | 'else';
        condition?: string;
        block: string;
        start: number;
        end: number;
    }>;
    /**
     * Skip over a string literal (handles escape sequences)
     */
    private static skipString;
    /**
     * Skip single-line comment
     */
    private static skipLineComment;
    /**
     * Skip block comment
     */
    private static skipBlockComment;
    /**
     * Извлечь простые @(expression) без блоков
     */
    static parseExpressions(input: string): Array<{
        content: string;
        start: number;
        end: number;
    }>;
}
//# sourceMappingURL=BalancedParser.d.ts.map
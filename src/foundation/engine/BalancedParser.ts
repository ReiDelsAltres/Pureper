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
    public static parseBalanced(
        input: string, 
        opener: string,
        closerChar: ')' | '}' = ')'
    ): Array<{ content: string; start: number; end: number }> {
        const results: Array<{ content: string; start: number; end: number }> = [];
        const openerChar = closerChar === ')' ? '(' : '{';
        let i = 0;

        while (i < input.length) {
            const idx = input.indexOf(opener, i);
            if (idx === -1) break;

            const contentStart = idx + opener.length;
            let pos = contentStart;
            let depth = 1;

            while (pos < input.length && depth > 0) {
                const ch = input[pos];

                // Skip string literals
                if (ch === '"' || ch === "'" || ch === '`') {
                    pos = this.skipString(input, pos, ch);
                    continue;
                }

                // Skip single-line comments
                if (ch === '/' && input[pos + 1] === '/') {
                    pos = this.skipLineComment(input, pos);
                    continue;
                }

                // Skip multi-line comments
                if (ch === '/' && input[pos + 1] === '*') {
                    pos = this.skipBlockComment(input, pos);
                    continue;
                }

                if (ch === openerChar) depth++;
                else if (ch === closerChar) depth--;

                pos++;
            }

            if (depth === 0) {
                results.push({
                    content: input.slice(contentStart, pos - 1),
                    start: idx,
                    end: pos
                });
                i = pos;
            } else {
                // Unbalanced, skip this opener and continue
                i = idx + 1;
            }
        }

        return results;
    }

    /**
     * Парсить блочные Rule типа @for(...) { ... }
     * @returns объект с condition (содержимое скобок) и block (содержимое фигурных скобок)
     */
    public static parseBlockRule(
        input: string,
        opener: string // например '@for', '@if'
    ): Array<{ condition: string; block: string; start: number; end: number }> {
        const results: Array<{ condition: string; block: string; start: number; end: number }> = [];
        const openerLower = opener.toLowerCase();
        let i = 0;

        while (i < input.length) {
            // Case-insensitive search
            const lowerInput = input.toLowerCase();
            let idx = lowerInput.indexOf(openerLower, i);
            if (idx === -1) break;

            // Check for @@ escape
            if (idx > 0 && input[idx - 1] === '@') {
                i = idx + 1;
                continue;
            }

            // Find opening parenthesis
            let parenStart = idx + opener.length;
            while (parenStart < input.length && /\s/.test(input[parenStart])) {
                parenStart++;
            }

            if (input[parenStart] !== '(') {
                i = idx + 1;
                continue;
            }

            // Parse balanced parentheses for condition
            let pos = parenStart + 1;
            let depth = 1;

            while (pos < input.length && depth > 0) {
                const ch = input[pos];

                if (ch === '"' || ch === "'" || ch === '`') {
                    pos = this.skipString(input, pos, ch);
                    continue;
                }
                if (ch === '/' && input[pos + 1] === '/') {
                    pos = this.skipLineComment(input, pos);
                    continue;
                }
                if (ch === '/' && input[pos + 1] === '*') {
                    pos = this.skipBlockComment(input, pos);
                    continue;
                }

                if (ch === '(') depth++;
                else if (ch === ')') depth--;
                pos++;
            }

            if (depth !== 0) {
                i = idx + 1;
                continue;
            }

            const condition = input.slice(parenStart + 1, pos - 1);
            const conditionEnd = pos;

            // Find opening brace for block
            let braceStart = conditionEnd;
            while (braceStart < input.length && /\s/.test(input[braceStart])) {
                braceStart++;
            }

            if (input[braceStart] !== '{') {
                i = idx + 1;
                continue;
            }

            // Parse balanced braces for block
            pos = braceStart + 1;
            depth = 1;

            while (pos < input.length && depth > 0) {
                const ch = input[pos];

                if (ch === '"' || ch === "'" || ch === '`') {
                    pos = this.skipString(input, pos, ch);
                    continue;
                }
                if (ch === '/' && input[pos + 1] === '/') {
                    pos = this.skipLineComment(input, pos);
                    continue;
                }
                if (ch === '/' && input[pos + 1] === '*') {
                    pos = this.skipBlockComment(input, pos);
                    continue;
                }

                if (ch === '{') depth++;
                else if (ch === '}') depth--;
                pos++;
            }

            if (depth !== 0) {
                i = idx + 1;
                continue;
            }

            const block = input.slice(braceStart + 1, pos - 1);

            results.push({
                condition,
                block,
                start: idx,
                end: pos
            });

            i = pos;
        }

        return results;
    }

    /**
     * Парсить @if/@elseif/@else цепочки
     */
    public static parseIfChain(input: string): Array<{
        type: 'if' | 'elseif' | 'else';
        condition?: string;
        block: string;
        start: number;
        end: number;
    }> {
        const results: Array<{
            type: 'if' | 'elseif' | 'else';
            condition?: string;
            block: string;
            start: number;
            end: number;
        }> = [];

        // Find @if first
        const ifMatches = this.parseBlockRule(input, '@if');
        
        for (const ifMatch of ifMatches) {
            results.push({
                type: 'if',
                condition: ifMatch.condition,
                block: ifMatch.block,
                start: ifMatch.start,
                end: ifMatch.end
            });

            // Look for @elseif/@else after this @if
            let searchPos = ifMatch.end;
            
            while (searchPos < input.length) {
                // Skip whitespace
                while (searchPos < input.length && /\s/.test(input[searchPos])) {
                    searchPos++;
                }

                const remaining = input.slice(searchPos).toLowerCase();

                if (remaining.startsWith('@elseif')) {
                    const elseifMatches = this.parseBlockRule(input.slice(searchPos), '@elseif');
                    if (elseifMatches.length > 0) {
                        const m = elseifMatches[0];
                        results.push({
                            type: 'elseif',
                            condition: m.condition,
                            block: m.block,
                            start: searchPos + m.start,
                            end: searchPos + m.end
                        });
                        searchPos = searchPos + m.end;
                        continue;
                    }
                } else if (remaining.startsWith('@else')) {
                    // @else without condition
                    let pos = searchPos + 5; // length of '@else'
                    while (pos < input.length && /\s/.test(input[pos])) {
                        pos++;
                    }

                    if (input[pos] === '{') {
                        let bracePos = pos + 1;
                        let depth = 1;

                        while (bracePos < input.length && depth > 0) {
                            const ch = input[bracePos];
                            if (ch === '"' || ch === "'" || ch === '`') {
                                bracePos = this.skipString(input, bracePos, ch);
                                continue;
                            }
                            if (ch === '{') depth++;
                            else if (ch === '}') depth--;
                            bracePos++;
                        }

                        if (depth === 0) {
                            results.push({
                                type: 'else',
                                block: input.slice(pos + 1, bracePos - 1),
                                start: searchPos,
                                end: bracePos
                            });
                            searchPos = bracePos;
                            continue;
                        }
                    }
                }

                break; // No more @elseif/@else found
            }
        }

        return results;
    }

    /**
     * Skip over a string literal (handles escape sequences)
     */
    private static skipString(input: string, pos: number, quote: string): number {
        pos++; // skip opening quote
        while (pos < input.length) {
            if (input[pos] === '\\') {
                pos += 2; // skip escape sequence
                continue;
            }
            if (input[pos] === quote) {
                return pos + 1;
            }
            // Handle template literal ${...}
            if (quote === '`' && input[pos] === '$' && input[pos + 1] === '{') {
                pos += 2;
                let depth = 1;
                while (pos < input.length && depth > 0) {
                    if (input[pos] === '{') depth++;
                    else if (input[pos] === '}') depth--;
                    pos++;
                }
                continue;
            }
            pos++;
        }
        return pos;
    }

    /**
     * Skip single-line comment
     */
    private static skipLineComment(input: string, pos: number): number {
        while (pos < input.length && input[pos] !== '\n') {
            pos++;
        }
        return pos + 1;
    }

    /**
     * Skip block comment
     */
    private static skipBlockComment(input: string, pos: number): number {
        pos += 2; // skip /*
        while (pos < input.length - 1) {
            if (input[pos] === '*' && input[pos + 1] === '/') {
                return pos + 2;
            }
            pos++;
        }
        return pos;
    }

    /**
     * Извлечь простые @(expression) без блоков
     */
    public static parseExpressions(input: string): Array<{ content: string; start: number; end: number }> {
        return this.parseBalanced(input, '@(', ')');
    }
}

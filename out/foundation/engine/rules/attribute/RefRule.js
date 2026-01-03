import { AttributeRule } from '../../Rule.js';
import Expression from '../../Expression.js';
import { InvalidDynamicRuleUsage } from '../../exceptions/TemplateExceptions.js';
/**
 * RefRule - обработка @[ref]="expression"
 * Добавляет HTML элемент в Scope под указанным именем.
 */
export default class RefRule extends AttributeRule {
    name = 'ref';
    priority = 5; // Выполняется очень рано
    find(template) {
        const results = [];
        // Match @[ref]=" or @[ref]='
        const opener = '@[ref]=';
        let i = 0;
        while (i < template.length) {
            const idx = template.toLowerCase().indexOf(opener.toLowerCase(), i);
            if (idx === -1)
                break;
            // Check for @@ escape
            if (idx > 0 && template[idx - 1] === '@') {
                i = idx + 1;
                continue;
            }
            // Find quote char after =
            let pos = idx + opener.length;
            while (pos < template.length && /\s/.test(template[pos])) {
                pos++;
            }
            const quoteChar = template[pos];
            if (quoteChar !== '"' && quoteChar !== "'") {
                i = idx + 1;
                continue;
            }
            // Find matching closing quote (handle nested quotes)
            const contentStart = pos + 1;
            pos++;
            // Simple: find the closing quote that matches
            while (pos < template.length && template[pos] !== quoteChar) {
                pos++;
            }
            if (pos >= template.length) {
                i = idx + 1;
                continue;
            }
            const content = template.slice(contentStart, pos);
            const fullMatch = template.slice(idx, pos + 1);
            results.push({
                fullMatch,
                start: idx,
                end: pos + 1,
                data: {
                    expression: content,
                    attributeMatch: fullMatch
                }
            });
            i = pos + 1;
        }
        return results;
    }
    execute(match, scope) {
        const exprCode = match.data?.expression;
        const expr = new Expression(exprCode);
        const refName = expr.execute(scope);
        // Check if Observable - not allowed for @[ref]
        if (refName && typeof refName === 'object' && typeof refName.subscribe === 'function') {
            throw new InvalidDynamicRuleUsage('@[ref]', '@[ref] does not support Observable values. The reference name must be static.');
        }
        if (typeof refName !== 'string') {
            console.error(`[RefRule] Expression must return a string (variable name), got: ${typeof refName}`);
            return { output: '' };
        }
        // Сразу регистрируем ref в scope с null значением
        // Будет заполнен реальным элементом при bindRefs()
        if (!scope.has(refName)) {
            scope.set(refName, null);
        }
        // Store placeholder - actual element will be set during DOM processing
        // For now, return the attribute without the @[ref] syntax
        return {
            output: `data-ref="${refName}"`,
            observables: [],
            data: { refName } // Сохраняем имя ref для быстрого доступа
        };
    }
    supportsObservable() {
        return false;
    }
    /**
     * Постобработка: привязать реальный элемент к Scope
     */
    static bindElement(element, refName, scope) {
        scope.set(refName, element);
    }
    /**
     * Очистка: установить ref в null если элемент удалён
     */
    static unbindElement(refName, scope) {
        if (scope.has(refName)) {
            scope.set(refName, null);
        }
    }
}
//# sourceMappingURL=RefRule.js.map
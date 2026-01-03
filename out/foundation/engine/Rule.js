/**
 * Rule - базовый абстрактный класс для всех правил шаблонизатора.
 */
export default class Rule {
    /** Приоритет выполнения (меньше = раньше) */
    priority = 100;
    /**
     * Проверить, поддерживает ли Rule Observable значения
     */
    supportsObservable() {
        return true;
    }
}
/**
 * SyntaxRule - базовый класс для синтаксических правил.
 * Синтаксические правила могут быть в любом месте шаблона (кроме атрибутов).
 */
export class SyntaxRule extends Rule {
    type = 'syntax';
}
/**
 * AttributeRule - базовый класс для атрибутивных правил.
 * Атрибутивные правила работают только внутри HTML-тегов.
 */
export class AttributeRule extends Rule {
    type = 'attribute';
    /**
     * Получить элемент, к которому применяется атрибут.
     * @param template - шаблон
     * @param attributePosition - позиция атрибута
     * @returns информация об элементе
     */
    findParentElement(template, attributePosition) {
        // Find opening < before attribute
        let tagStart = attributePosition;
        while (tagStart > 0 && template[tagStart] !== '<') {
            tagStart--;
        }
        if (template[tagStart] !== '<') {
            return null;
        }
        // Extract tag name
        let nameEnd = tagStart + 1;
        while (nameEnd < template.length && /[a-zA-Z0-9_-]/.test(template[nameEnd])) {
            nameEnd++;
        }
        const tagName = template.slice(tagStart + 1, nameEnd);
        // Find closing >
        let tagEnd = attributePosition;
        let inString = false;
        let stringChar = '';
        while (tagEnd < template.length) {
            const ch = template[tagEnd];
            if (!inString && (ch === '"' || ch === "'")) {
                inString = true;
                stringChar = ch;
            }
            else if (inString && ch === stringChar) {
                inString = false;
            }
            else if (!inString && ch === '>') {
                break;
            }
            tagEnd++;
        }
        return { tagName, tagStart, tagEnd: tagEnd + 1 };
    }
}
//# sourceMappingURL=Rule.js.map
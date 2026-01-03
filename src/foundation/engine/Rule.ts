import Scope from './Scope.js';
import Expression from './Expression.js';

/**
 * RuleMatch - результат поиска Rule в шаблоне
 */
export interface RuleMatch {
    /** Полное совпадение включая синтаксис Rule */
    fullMatch: string;
    /** Начальная позиция в исходной строке */
    start: number;
    /** Конечная позиция в исходной строке */
    end: number;
    /** Дополнительные данные специфичные для Rule */
    data?: Record<string, any>;
}

/**
 * RuleResult - результат выполнения Rule
 */
export interface RuleResult {
    /** HTML-результат для замены */
    output: string;
    /** Использованные Observable для отслеживания */
    observables?: any[];
    /** Дочерние Rule (для вложенных структур) */
    children?: Rule[];
    /** Дополнительные данные (например, refName для RefRule) */
    data?: Record<string, any>;
}

/**
 * RuleType - тип Rule
 */
export type RuleType = 'syntax' | 'attribute';

/**
 * Rule - базовый абстрактный класс для всех правил шаблонизатора.
 */
export default abstract class Rule {
    /** Уникальное имя правила */
    public abstract readonly name: string;
    
    /** Тип правила: syntax или attribute */
    public abstract readonly type: RuleType;
    
    /** Приоритет выполнения (меньше = раньше) */
    public readonly priority: number = 100;

    /**
     * Найти все вхождения этого Rule в шаблоне.
     * @param template - исходный шаблон
     * @returns массив найденных совпадений
     */
    public abstract find(template: string): RuleMatch[];

    /**
     * Выполнить Rule и вернуть результат.
     * @param match - найденное совпадение
     * @param scope - текущий Scope
     * @param engine - ссылка на TemplateEngine (для рекурсивной обработки)
     */
    public abstract execute(
        match: RuleMatch, 
        scope: Scope,
        engine?: any // TemplateEngine, circular dependency workaround
    ): RuleResult | Promise<RuleResult>;

    /**
     * Проверить, поддерживает ли Rule Observable значения
     */
    public supportsObservable(): boolean {
        return true;
    }
}

/**
 * SyntaxRule - базовый класс для синтаксических правил.
 * Синтаксические правила могут быть в любом месте шаблона (кроме атрибутов).
 */
export abstract class SyntaxRule extends Rule {
    public readonly type: RuleType = 'syntax';
}

/**
 * AttributeRule - базовый класс для атрибутивных правил.
 * Атрибутивные правила работают только внутри HTML-тегов.
 */
export abstract class AttributeRule extends Rule {
    public readonly type: RuleType = 'attribute';
    
    /**
     * Получить элемент, к которому применяется атрибут.
     * @param template - шаблон
     * @param attributePosition - позиция атрибута
     * @returns информация об элементе
     */
    protected findParentElement(
        template: string, 
        attributePosition: number
    ): { tagName: string; tagStart: number; tagEnd: number } | null {
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
            } else if (inString && ch === stringChar) {
                inString = false;
            } else if (!inString && ch === '>') {
                break;
            }
            tagEnd++;
        }

        return { tagName, tagStart, tagEnd: tagEnd + 1 };
    }
}

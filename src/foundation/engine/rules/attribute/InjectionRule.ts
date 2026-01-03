import { AttributeRule } from '../../Rule.js';
import type { RuleMatch, RuleResult } from '../../Rule.js';
import Scope from '../../Scope.js';
import Expression from '../../Expression.js';
import { InvalidDynamicRuleUsage } from '../../exceptions/TemplateExceptions.js';

interface InjectionMatch extends RuleMatch {
    data: {
        type: 'head' | 'tail';
        expression: string;
        attributeMatch: string;
    };
}

/**
 * InjectionRule - обработка @injection[type]="expression"
 * Инжектирует элемент в целевой элемент (найденный по @[ref]).
 * type: 'head' = prepend, 'tail' = append
 */
export default class InjectionRule extends AttributeRule {
    public readonly name = 'injection';
    public readonly priority = 200; // Выполняется в самом конце

    public find(template: string): RuleMatch[] {
        const results: RuleMatch[] = [];
        // Match @injection[head] or @injection[tail]
        const pattern = /@injection\[(head|tail)\]\s*=/gi;
        let match: RegExpExecArray | null;

        while ((match = pattern.exec(template)) !== null) {
            const idx = match.index;

            // Check for @@ escape
            if (idx > 0 && template[idx - 1] === '@') {
                continue;
            }

            const injectionType = match[1].toLowerCase() as 'head' | 'tail';

            // Find quote char after =
            let pos = idx + match[0].length;
            while (pos < template.length && /\s/.test(template[pos])) {
                pos++;
            }

            const quoteChar = template[pos];
            if (quoteChar !== '"' && quoteChar !== "'") {
                continue;
            }

            // Find matching closing quote
            const contentStart = pos + 1;
            pos++;
            while (pos < template.length && template[pos] !== quoteChar) {
                pos++;
            }

            if (pos >= template.length) continue;

            const content = template.slice(contentStart, pos);
            const fullMatch = template.slice(idx, pos + 1);

            results.push({
                fullMatch,
                start: idx,
                end: pos + 1,
                data: {
                    type: injectionType,
                    expression: content,
                    attributeMatch: fullMatch
                }
            });
        }

        return results;
    }

    public execute(match: RuleMatch, scope: Scope): RuleResult {
        const data = (match as InjectionMatch).data;
        const expr = new Expression(data.expression);
        const targetRefName = expr.execute(scope);

        // Check if Observable - not allowed for @injection
        if (targetRefName && typeof targetRefName === 'object' && typeof targetRefName.subscribe === 'function') {
            throw new InvalidDynamicRuleUsage('@injection',
                '@injection does not support Observable values. The target reference must be static.');
        }

        if (typeof targetRefName !== 'string') {
            console.error(`[InjectionRule] Expression must return a string (reference name), got: ${typeof targetRefName}`);
            return { output: '' };
        }

        // Store injection info for postprocessing
        const encodedTarget = encodeURIComponent(targetRefName);

        return {
            output: `data-injection-type="${data.type}" data-injection-target="${encodedTarget}"`,
            observables: []
        };
    }

    public supportsObservable(): boolean {
        return false;
    }

    /**
     * Постобработка: выполнить инжекцию элементов
     */
    public static processInjections(root: Element | DocumentFragment, scope: Scope): void {
        // Find all elements with injection attributes
        const injectElements = root.querySelectorAll('[data-injection-type][data-injection-target]');

        for (const element of Array.from(injectElements)) {
            const type = element.getAttribute('data-injection-type') as 'head' | 'tail';
            const targetRefName = decodeURIComponent(element.getAttribute('data-injection-target') || '');

            if (!targetRefName) continue;

            // Get target element from scope
            const targetElement = scope.get(targetRefName);

            if (!targetElement || !(targetElement instanceof Element)) {
                console.warn(`[InjectionRule] Target element "${targetRefName}" not found in scope or is not an Element`);
                continue;
            }

            // Remove injection attributes
            element.removeAttribute('data-injection-type');
            element.removeAttribute('data-injection-target');

            // Perform injection
            if (type === 'head') {
                targetElement.prepend(element);
            } else {
                targetElement.append(element);
            }
        }
    }
}

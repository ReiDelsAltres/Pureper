import { AttributeRule } from '../../Rule.js';
import Expression from '../../Expression.js';
/**
 * EventRule - обработка @on[eventName]="expression"
 * Подписывает элемент на событие.
 */
export default class EventRule extends AttributeRule {
    name = 'event';
    priority = 30;
    find(template) {
        const results = [];
        // Match @on[eventName]="
        const pattern = /@on\[([a-zA-Z]+)\]\s*=/gi;
        let match;
        while ((match = pattern.exec(template)) !== null) {
            const idx = match.index;
            // Check for @@ escape
            if (idx > 0 && template[idx - 1] === '@') {
                continue;
            }
            const eventName = match[1].toLowerCase();
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
            if (pos >= template.length)
                continue;
            const content = template.slice(contentStart, pos);
            const fullMatch = template.slice(idx, pos + 1);
            results.push({
                fullMatch,
                start: idx,
                end: pos + 1,
                data: {
                    eventName,
                    expression: content,
                    attributeMatch: fullMatch
                }
            });
        }
        return results;
    }
    execute(match, scope) {
        const data = match.data;
        // Generate data attribute for later DOM binding
        // Actual event binding happens in postprocessing
        const encodedExpr = encodeURIComponent(data.expression);
        return {
            output: `data-event-${data.eventName}="${encodedExpr}"`,
            observables: []
        };
    }
    /**
     * Постобработка: привязать события к элементам
     */
    static bindEvents(element, scope) {
        const unbinders = [];
        // Find all data-event-* attributes
        const attributes = Array.from(element.attributes);
        for (const attr of attributes) {
            if (attr.name.startsWith('data-event-')) {
                const eventName = attr.name.slice('data-event-'.length);
                const exprCode = decodeURIComponent(attr.value);
                const handler = (event) => {
                    // Create local scope with event
                    const localScope = scope.createChild({ event });
                    const expr = new Expression(exprCode);
                    try {
                        expr.execute(localScope);
                    }
                    catch (error) {
                        console.error(`[EventRule] Error executing handler for ${eventName}:`, error);
                    }
                };
                element.addEventListener(eventName, handler);
                unbinders.push(() => element.removeEventListener(eventName, handler));
                // Optionally remove the data attribute
                // element.removeAttribute(attr.name);
            }
        }
        return unbinders;
    }
    /**
     * Привязать событие с поддержкой Observable
     */
    static bindEventWithObservable(element, eventName, exprCode, scope) {
        let currentHandler = null;
        const setupHandler = () => {
            // Remove old handler if exists
            if (currentHandler) {
                element.removeEventListener(eventName, currentHandler);
            }
            currentHandler = (event) => {
                const localScope = scope.createChild({ event });
                const expr = new Expression(exprCode);
                try {
                    const result = expr.execute(localScope);
                    // If result is Observable, handle it
                    if (result && typeof result === 'object' && typeof result.subscribe === 'function') {
                        // Re-setup handler when Observable changes
                        result.subscribe(() => setupHandler());
                    }
                }
                catch (error) {
                    console.error(`[EventRule] Error executing handler for ${eventName}:`, error);
                }
            };
            element.addEventListener(eventName, currentHandler);
        };
        setupHandler();
        return () => {
            if (currentHandler) {
                element.removeEventListener(eventName, currentHandler);
            }
        };
    }
}
//# sourceMappingURL=EventRule.js.map
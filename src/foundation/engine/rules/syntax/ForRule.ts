import { SyntaxRule } from '../../Rule.js';
import type { RuleMatch, RuleResult } from '../../Rule.js';
import Scope from '../../Scope.js';
import Expression from '../../Expression.js';
import { InvalidTemplateEngineSyntaxException } from '../../exceptions/TemplateExceptions.js';
import { isObservable } from '../../../api/Observer.js';

interface ForMatch extends RuleMatch {
    data: {
        /** Вариант: 'single' (item in expr), 'indexed' (idx, item in expr), 'numeric' (i in number) */
        variant: 'single' | 'indexed' | 'numeric';
        /** Имена локальных переменных */
        variables: string[];
        /** Выражение коллекции/числа */
        expression: string;
        /** Тело цикла */
        block: string;
    };
}

/**
 * ForRule - обработка @for
 * Варианты:
 * 1. @for(item in collection) { ... }
 * 2. @for(idx, item in collection) { ... }
 * 3. @for(i in 5) { ... } - числовая итерация 0..4
 */
export default class ForRule extends SyntaxRule {
    public readonly name = 'for';
    public readonly priority = 10; // Выполняется раньше всех

    public find(template: string): RuleMatch[] {
        const results: RuleMatch[] = [];
        const lowerTemplate = template.toLowerCase();
        let i = 0;

        while (i < template.length) {
            const idx = lowerTemplate.indexOf('@for', i);
            if (idx === -1) break;

            // Check for @@ escape
            if (idx > 0 && template[idx - 1] === '@') {
                i = idx + 1;
                continue;
            }

            const parsed = this.parseForStatement(template, idx);
            if (parsed) {
                results.push({
                    fullMatch: template.slice(parsed.start, parsed.end),
                    start: parsed.start,
                    end: parsed.end,
                    data: {
                        variant: parsed.variant,
                        variables: parsed.variables,
                        expression: parsed.expression,
                        block: parsed.block
                    }
                });
                i = parsed.end;
            } else {
                i = idx + 1;
            }
        }

        return results;
    }

    private parseForStatement(template: string, start: number): {
        start: number;
        end: number;
        variant: 'single' | 'indexed' | 'numeric';
        variables: string[];
        expression: string;
        block: string;
    } | null {
        let pos = start + 4; // '@for'.length

        // Skip whitespace
        while (pos < template.length && /\s/.test(template[pos])) {
            pos++;
        }

        // Expect (
        if (template[pos] !== '(') return null;

        // Parse balanced parentheses
        const conditionStart = pos + 1;
        pos++;
        let depth = 1;

        while (pos < template.length && depth > 0) {
            const ch = template[pos];
            if (ch === '"' || ch === "'" || ch === '`') {
                pos = this.skipString(template, pos, ch);
                continue;
            }
            if (ch === '(') depth++;
            else if (ch === ')') depth--;
            pos++;
        }

        if (depth !== 0) return null;
        const conditionContent = template.slice(conditionStart, pos - 1).trim();

        // Parse condition: "var in expr" or "idx, var in expr"
        const inMatch = conditionContent.match(/^(.+?)\s+in\s+(.+)$/);
        if (!inMatch) return null;

        const varPart = inMatch[1].trim();
        const expression = inMatch[2].trim();

        // Parse variables
        let variables: string[];
        let variant: 'single' | 'indexed' | 'numeric';

        if (varPart.includes(',')) {
            // Indexed variant: "idx, item"
            variables = varPart.split(',').map(v => v.trim());
            if (variables.length !== 2) return null;
            variant = 'indexed';
        } else {
            variables = [varPart];
            variant = 'single'; // Will be determined at execution time if numeric
        }

        // Skip whitespace
        while (pos < template.length && /\s/.test(template[pos])) {
            pos++;
        }

        // Expect {
        if (template[pos] !== '{') return null;

        // Parse balanced braces
        const blockStart = pos + 1;
        pos++;
        depth = 1;

        while (pos < template.length && depth > 0) {
            const ch = template[pos];
            if (ch === '"' || ch === "'" || ch === '`') {
                pos = this.skipString(template, pos, ch);
                continue;
            }
            if (ch === '{') depth++;
            else if (ch === '}') depth--;
            pos++;
        }

        if (depth !== 0) return null;
        const block = template.slice(blockStart, pos - 1);

        return { start, end: pos, variant, variables, expression, block };
    }

    private skipString(input: string, pos: number, quote: string): number {
        pos++;
        while (pos < input.length) {
            if (input[pos] === '\\') {
                pos += 2;
                continue;
            }
            if (input[pos] === quote) {
                return pos + 1;
            }
            pos++;
        }
        return pos;
    }

    public execute(match: RuleMatch, scope: Scope, engine?: any): RuleResult {
        const data = (match as ForMatch).data;
        const observables: any[] = [];
        const outputs: string[] = [];

        // Evaluate expression
        const expr = new Expression(data.expression);
        
        // Находим Observable в выражении
        const exprObservables = expr.findObservables(scope);
        observables.push(...exprObservables);
        
        let collection = expr.execute(scope);

        // Check if Observable
        if (isObservable(collection)) {
            observables.push(collection);
            collection = collection.getObject?.() ?? collection;
        }

        // Determine iteration type
        if (typeof collection === 'number') {
            // Numeric iteration: 0 to collection-1
            if (data.variant === 'indexed') {
                throw new InvalidTemplateEngineSyntaxException(
                    '@for with numeric value does not support indexed variant (idx, var). Use single variable.'
                );
            }

            const count = Math.floor(collection);
            if (count < 0) {
                throw new InvalidTemplateEngineSyntaxException(
                    `@for numeric value must be non-negative, got: ${count}`
                );
            }

            for (let i = 0; i < count; i++) {
                const localScope = scope.createChild({ [data.variables[0]]: i });
                
                if (engine) {
                    const result = engine.processTemplate(data.block, localScope);
                    outputs.push(result.output);
                    if (result.observables) observables.push(...result.observables);
                } else {
                    outputs.push(data.block);
                }
            }
        } else if (Array.isArray(collection) || (collection && typeof collection[Symbol.iterator] === 'function')) {
            // Array or iterable
            const items = Array.isArray(collection) ? collection : Array.from(collection);

            if (data.variant === 'indexed') {
                // (idx, item in collection)
                items.forEach((item, idx) => {
                    const localScope = scope.createChild({
                        [data.variables[0]]: idx,
                        [data.variables[1]]: item
                    });

                    if (engine) {
                        const result = engine.processTemplate(data.block, localScope);
                        outputs.push(result.output);
                        if (result.observables) observables.push(...result.observables);
                    } else {
                        outputs.push(data.block);
                    }
                });
            } else {
                // (item in collection)
                items.forEach((item) => {
                    const localScope = scope.createChild({ [data.variables[0]]: item });

                    if (engine) {
                        const result = engine.processTemplate(data.block, localScope);
                        outputs.push(result.output);
                        if (result.observables) observables.push(...result.observables);
                    } else {
                        outputs.push(data.block);
                    }
                });
            }
        } else if (typeof collection === 'string') {
            throw new InvalidTemplateEngineSyntaxException(
                `@for does not support string iteration. Got: "${collection}"`
            );
        } else if (collection === null || collection === undefined) {
            // Empty result
        } else {
            throw new InvalidTemplateEngineSyntaxException(
                `@for expression must return a number, array, or iterable. Got: ${typeof collection}`
            );
        }

        return { output: outputs.join(''), observables };
    }
}

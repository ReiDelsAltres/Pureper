import { SyntaxRule } from '../../Rule.js';
import type { RuleMatch, RuleResult } from '../../Rule.js';
import Scope from '../../Scope.js';
import Expression from '../../Expression.js';
import BalancedParser from '../../BalancedParser.js';
import { isObservable } from '../../../api/Observer.js';

/**
 * ExpressionRule - обработка @(Expression)
 * Выводит результат выражения как строку.
 * Автоматически отслеживает Observable и разворачивает их значения.
 */
export default class ExpressionRule extends SyntaxRule {
    public readonly name = 'expression';
    public readonly priority = 50; // Выполняется после блочных правил

    public find(template: string): RuleMatch[] {
        const matches = BalancedParser.parseExpressions(template);
        
        return matches.map(m => ({
            fullMatch: template.slice(m.start, m.end),
            start: m.start,
            end: m.end,
            data: { expression: m.content }
        }));
    }

    public execute(match: RuleMatch, scope: Scope): RuleResult {
        const code = match.data?.expression as string;
        
        if (!code || code.trim() === '') {
            return { output: '' };
        }

        const expr = new Expression(code);
        
        // Находим Observable, используемые в выражении
        const observables = expr.findObservables(scope);
        
        // Check for async
        if (expr.isAsyncExpression()) {
            // Return promise wrapper - engine should handle this
            const promise = expr.executeAsync(scope).then(result => {
                if (result === undefined || result === null) {
                    return '';
                }
                return String(result);
            });
            
            // For now, return placeholder - proper async handling in engine
            return { 
                output: '', 
                observables,
                children: []
            };
        }

        const result = expr.execute(scope);
        
        // Если результат сам Observable (например @(counter)), отслеживаем его
        if (isObservable(result)) {
            return {
                output: String(result.getObject?.() ?? result),
                observables: [...observables, result]
            };
        }

        if (result === undefined || result === null) {
            return { output: '', observables };
        }

        return { output: String(result), observables };
    }

    /**
     * Асинхронная версия execute
     */
    public async executeAsync(match: RuleMatch, scope: Scope): Promise<RuleResult> {
        const code = match.data?.expression as string;
        
        if (!code || code.trim() === '') {
            return { output: '' };
        }

        const expr = new Expression(code);
        const observables = expr.findObservables(scope);
        const result = await expr.executeAsync(scope);
        
        if (isObservable(result)) {
            return {
                output: String(result.getObject?.() ?? result),
                observables: [...observables, result]
            };
        }

        if (result === undefined || result === null) {
            return { output: '', observables };
        }

        return { output: String(result), observables };
    }
}

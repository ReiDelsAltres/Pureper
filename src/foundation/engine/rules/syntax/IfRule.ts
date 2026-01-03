import { SyntaxRule } from '../../Rule.js';
import type { RuleMatch, RuleResult } from '../../Rule.js';
import Scope from '../../Scope.js';
import Expression from '../../Expression.js';
import BalancedParser from '../../BalancedParser.js';
import { InvalidTemplateEngineSyntaxException } from '../../exceptions/TemplateExceptions.js';
import { isObservable } from '../../../api/Observer.js';

interface IfChainMatch extends RuleMatch {
    data: {
        chain: Array<{
            type: 'if' | 'elseif' | 'else';
            condition?: string;
            block: string;
        }>;
    };
}

/**
 * IfRule - обработка @if/@elseif/@else
 */
export default class IfRule extends SyntaxRule {
    public readonly name = 'if';
    public readonly priority = 20; // Выполняется раньше @expression

    public find(template: string): RuleMatch[] {
        const results: RuleMatch[] = [];
        const lowerTemplate = template.toLowerCase();
        let i = 0;

        while (i < template.length) {
            const idx = lowerTemplate.indexOf('@if', i);
            if (idx === -1) break;

            // Check for @@ escape
            if (idx > 0 && template[idx - 1] === '@') {
                i = idx + 1;
                continue;
            }

            // Parse the full if/elseif/else chain
            const chain = this.parseIfChain(template, idx);
            if (chain) {
                results.push({
                    fullMatch: template.slice(chain.start, chain.end),
                    start: chain.start,
                    end: chain.end,
                    data: { chain: chain.items }
                });
                i = chain.end;
            } else {
                i = idx + 1;
            }
        }

        return results;
    }

    private parseIfChain(template: string, startIdx: number): { 
        start: number; 
        end: number; 
        items: Array<{ type: 'if' | 'elseif' | 'else'; condition?: string; block: string }> 
    } | null {
        const items: Array<{ type: 'if' | 'elseif' | 'else'; condition?: string; block: string }> = [];
        let pos = startIdx;

        // Parse @if
        const ifParsed = this.parseConditionBlock(template, pos, '@if');
        if (!ifParsed) return null;

        items.push({ type: 'if', condition: ifParsed.condition, block: ifParsed.block });
        pos = ifParsed.end;

        // Parse @elseif/@else chain
        while (pos < template.length) {
            // Skip whitespace
            while (pos < template.length && /\s/.test(template[pos])) {
                pos++;
            }

            const remaining = template.slice(pos).toLowerCase();

            if (remaining.startsWith('@elseif')) {
                const elseifParsed = this.parseConditionBlock(template, pos, '@elseif');
                if (!elseifParsed) break;
                items.push({ type: 'elseif', condition: elseifParsed.condition, block: elseifParsed.block });
                pos = elseifParsed.end;
            } else if (remaining.startsWith('@else') && !remaining.startsWith('@elseif')) {
                const elseParsed = this.parseElseBlock(template, pos);
                if (!elseParsed) break;
                items.push({ type: 'else', block: elseParsed.block });
                pos = elseParsed.end;
                break; // @else is always last
            } else {
                break;
            }
        }

        return { start: startIdx, end: pos, items };
    }

    private parseConditionBlock(template: string, start: number, keyword: string): {
        condition: string;
        block: string;
        end: number;
    } | null {
        let pos = start + keyword.length;

        // Skip whitespace
        while (pos < template.length && /\s/.test(template[pos])) {
            pos++;
        }

        // Expect (
        if (template[pos] !== '(') return null;

        // Parse balanced condition
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
        const condition = template.slice(conditionStart, pos - 1);

        // Skip whitespace
        while (pos < template.length && /\s/.test(template[pos])) {
            pos++;
        }

        // Expect {
        if (template[pos] !== '{') return null;

        // Parse balanced block
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

        return { condition, block, end: pos };
    }

    private parseElseBlock(template: string, start: number): { block: string; end: number } | null {
        let pos = start + 5; // '@else'.length

        // Skip whitespace
        while (pos < template.length && /\s/.test(template[pos])) {
            pos++;
        }

        // Expect {
        if (template[pos] !== '{') return null;

        // Parse balanced block
        const blockStart = pos + 1;
        pos++;
        let depth = 1;

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

        return { block, end: pos };
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
        const chain = (match as IfChainMatch).data.chain;
        const observables: any[] = [];

        for (const item of chain) {
            if (item.type === 'else') {
                // Process else block
                if (engine) {
                    const result = engine.processTemplate(item.block, scope);
                    return { output: result.output, observables: [...observables, ...(result.observables || [])] };
                }
                return { output: item.block, observables };
            }

            // Evaluate condition
            const expr = new Expression(item.condition!);
            
            // Находим Observable в условии
            const conditionObservables = expr.findObservables(scope);
            observables.push(...conditionObservables);
            
            const conditionResult = expr.execute(scope);

            // Check if result is Observable
            if (isObservable(conditionResult)) {
                observables.push(conditionResult);
                const value = conditionResult.getObject?.() ?? conditionResult;
                if (value) {
                    if (engine) {
                        const result = engine.processTemplate(item.block, scope);
                        return { output: result.output, observables: [...observables, ...(result.observables || [])] };
                    }
                    return { output: item.block, observables };
                }
            } else if (conditionResult) {
                // Condition is truthy
                if (engine) {
                    const result = engine.processTemplate(item.block, scope);
                    return { output: result.output, observables: [...observables, ...(result.observables || [])] };
                }
                return { output: item.block, observables };
            }
        }

        // No condition matched and no else
        return { output: '', observables };
    }
}

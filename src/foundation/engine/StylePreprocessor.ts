import Scope from './Scope.js';

// AST Node Types
type ASTNode = TextNode | ForNode | IfNode | InterpolationNode | ContinueNode;

interface TextNode { type: 'text'; value: string; }
interface ForNode { type: 'for'; variable: string; collection: string; body: ASTNode[]; }
interface IfNode { type: 'if'; branches: { condition: Expression | null; body: ASTNode[] }[]; }
interface InterpolationNode { type: 'interpolation'; expression: string; }
interface ContinueNode { type: 'continue'; }

// Signal for @continue - carries partial result
class ContinueSignal extends Error { 
    constructor(public partial: string = '') { super('continue'); } 
}

// Expression Types
type Expression = BinaryExpr | UnaryExpr | LiteralExpr | IdentifierExpr | MemberExpr;

interface BinaryExpr { type: 'binary'; operator: '==' | '!=' | '&&' | '||' | '>' | '<' | '>=' | '<='; left: Expression; right: Expression; }
interface UnaryExpr { type: 'unary'; operator: '!'; operand: Expression; }
interface LiteralExpr { type: 'literal'; value: string | number | boolean; }
interface IdentifierExpr { type: 'identifier'; name: string; }
interface MemberExpr { type: 'member'; object: Expression; property: string; }

// StylePreprocessor
export default class StylePreprocessor {
    private pos = 0;
    constructor(private input: string) { }

    public static process(input: string, scope: Scope): string {
        const ast = new StylePreprocessor(input).parse();
        return new Evaluator(scope).eval(ast).replace(/\n{3,}/g, '\n\n').trim();
    }

    parse(): ASTNode[] {
        return this.parseNodes(0);
    }

    private parseNodes(braceDepth: number): ASTNode[] {
        const nodes: ASTNode[] = [];
        let text = '';

        const flush = () => { if (text) { nodes.push({ type: 'text', value: text }); text = ''; } };

        while (this.pos < this.input.length) {
            // Stop at } when we're at directive level (braceDepth == 1)
            if (braceDepth === 1 && this.check('}')) {
                break;
            }

            // Check for @elseIf or @else (should stop current block parsing)
            if (braceDepth > 0 && (this.checkAhead('@elseIf') || this.checkAhead('@else'))) {
                break;
            }

            // Directives - check these BEFORE handling braces
            if (this.checkAhead('@for ')) {
                flush();
                nodes.push(this.parseFor());
            } else if (this.checkAhead('@if ')) {
                flush();
                nodes.push(this.parseIf());
            } else if (this.checkAhead('@continue')) {
                flush();
                this.consume('@continue');
                nodes.push({ type: 'continue' });
            } else if (this.check('@') && this.isIdentAt(1) && !this.checkAhead('@else') && !this.checkAhead('@elseIf')) {
                flush();
                nodes.push(this.parseInterpolation());
            } else if (this.check('{')) {
                // CSS brace - include it and recurse for content
                text += this.input[this.pos++];
                flush();
                const inner = this.parseNodes(braceDepth + 1);
                nodes.push(...inner);
                // Add closing brace
                if (this.check('}')) {
                    nodes.push({ type: 'text', value: this.input[this.pos++] });
                }
            } else if (this.check('}') && braceDepth > 1) {
                // Closing a CSS brace (not directive) - don't consume, let parent handle
                break;
            } else {
                text += this.input[this.pos++];
            }
        }
        flush();
        return nodes;
    }

    private parseFor(): ForNode {
        this.consume('@for'); this.ws();
        const variable = this.ident(); this.ws();
        this.consume('in'); this.ws();
        const collection = this.ident(); this.ws();
        this.consume('{');
        const body = this.parseNodes(1);
        this.consume('}');
        return { type: 'for', variable, collection, body };
    }

    private parseIf(): IfNode {
        const branches: { condition: Expression | null; body: ASTNode[] }[] = [];

        this.consume('@if'); this.ws();
        branches.push({ condition: this.parseExpr(), body: (this.ws(), this.consume('{'), this.parseNodes(1)) });
        this.consume('}');

        while (true) {
            this.ws();
            if (this.checkAhead('@elseIf')) {
                this.consume('@elseIf'); this.ws();
                branches.push({ condition: this.parseExpr(), body: (this.ws(), this.consume('{'), this.parseNodes(1)) });
                this.consume('}');
            } else if (this.checkAhead('@else')) {
                this.consume('@else'); this.ws();
                this.consume('{');
                branches.push({ condition: null, body: this.parseNodes(1) });
                this.consume('}');
                break;
            } else {
                break;
            }
        }

        return { type: 'if', branches };
    }

    private parseInterpolation(): InterpolationNode {
        this.consume('@');
        let expr = this.ident();
        while (this.check('.')) { this.pos++; expr += '.' + this.ident(); }
        return { type: 'interpolation', expression: expr };
    }

    private parseExpr(): Expression { return this.parseOr(); }

    private parseOr(): Expression {
        let left = this.parseAnd();
        while (this.ws(), this.checkAhead('||')) { this.consume('||'); this.ws(); left = { type: 'binary', operator: '||', left, right: this.parseAnd() }; }
        return left;
    }

    private parseAnd(): Expression {
        let left = this.parseEq();
        while (this.ws(), this.checkAhead('&&')) { this.consume('&&'); this.ws(); left = { type: 'binary', operator: '&&', left, right: this.parseEq() }; }
        return left;
    }

    private parseEq(): Expression {
        let left = this.parseCmp();
        while (this.ws(), this.checkAhead('==') || this.checkAhead('!=')) {
            const op = this.checkAhead('==') ? (this.consume('=='), '==') : (this.consume('!='), '!=');
            this.ws(); left = { type: 'binary', operator: op as '==' | '!=', left, right: this.parseCmp() };
        }
        return left;
    }

    private parseCmp(): Expression {
        let left = this.parseUnary();
        while (this.ws(), this.checkAhead('>=') || this.checkAhead('<=') || this.checkAhead('>') || this.checkAhead('<')) {
            let op: '>=' | '<=' | '>' | '<';
            if (this.checkAhead('>=')) { this.consume('>='); op = '>='; }
            else if (this.checkAhead('<=')) { this.consume('<='); op = '<='; }
            else if (this.checkAhead('>')) { this.consume('>'); op = '>'; }
            else { this.consume('<'); op = '<'; }
            this.ws(); left = { type: 'binary', operator: op, left, right: this.parseUnary() };
        }
        return left;
    }

    private parseUnary(): Expression {
        this.ws();
        if (this.check('!') && !this.checkAhead('!=')) { this.pos++; this.ws(); return { type: 'unary', operator: '!', operand: this.parseUnary() }; }
        return this.parsePrimary();
    }

    private parsePrimary(): Expression {
        this.ws();
        if (this.check('(')) { this.pos++; const e = this.parseExpr(); this.ws(); this.consume(')'); return e; }
        if (this.check('"') || this.check("'")) return { type: 'literal', value: this.str() };
        if (this.isDigit()) return { type: 'literal', value: parseInt(this.num()) };
        if (this.checkAhead('true')) { this.consume('true'); return { type: 'literal', value: true }; }
        if (this.checkAhead('false')) { this.consume('false'); return { type: 'literal', value: false }; }

        let expr: Expression = { type: 'identifier', name: this.ident() };
        while (this.check('.')) { this.pos++; expr = { type: 'member', object: expr, property: this.ident() }; }
        return expr;
    }

    // Helpers
    private check(s: string) { return this.input[this.pos] === s; }
    private checkAhead(s: string) { return this.input.slice(this.pos, this.pos + s.length) === s; }
    private consume(s: string) { if (!this.checkAhead(s)) throw new Error(`Expected '${s}' at ${this.pos}`); this.pos += s.length; }
    private ws() { while (this.pos < this.input.length && /\s/.test(this.input[this.pos])) this.pos++; }
    private isIdentAt(off: number) { return /[a-zA-Z_]/.test(this.input[this.pos + off] || ''); }
    private isDigit() { return /\d/.test(this.input[this.pos] || ''); }
    private ident() { let r = ''; while (/[a-zA-Z0-9_-]/.test(this.input[this.pos] || '')) r += this.input[this.pos++]; return r; }
    private num() { let r = ''; while (/\d/.test(this.input[this.pos] || '')) r += this.input[this.pos++]; return r; }
    private str() { const q = this.input[this.pos++]; let r = ''; while (this.input[this.pos] !== q) r += this.input[this.pos++]; this.pos++; return r; }
}

// Evaluator
class Evaluator {
    constructor(private scope: Scope) { }

    eval(nodes: ASTNode[]): string {
        let result = '';
        for (const n of nodes) {
            try {
                result += this.node(n);
            } catch (e) {
                if (e instanceof ContinueSignal) {
                    throw new ContinueSignal(result + e.partial);
                }
                throw e;
            }
        }
        return result;
    }

    private node(n: ASTNode): string {
        switch (n.type) {
            case 'text': return n.value;
            case 'for': return this.forNode(n);
            case 'if': return this.ifNode(n);
            case 'interpolation': return this.interp(n);
            case 'continue': throw new ContinueSignal('');
        }
    }

    private forNode(n: ForNode): string {
        const arr = this.scope.get(n.collection);
        if (!Array.isArray(arr)) throw new Error(`${n.collection} is not an array`);
        const results: string[] = [];
        for (const item of arr) {
            try {
                results.push(new Evaluator(this.scope.createChild({ [n.variable]: item })).eval(n.body));
            } catch (e) {
                if (e instanceof ContinueSignal) {
                    results.push(e.partial);
                    continue;
                }
                throw e;
            }
        }
        return results.join('');
    }

    private ifNode(n: IfNode): string {
        for (const b of n.branches) {
            if (b.condition === null || this.expr(b.condition)) return this.eval(b.body);
        }
        return '';
    }

    private interp(n: InterpolationNode): string {
        const parts = n.expression.split('.');
        let value: any = this.scope.get(parts[0]);
        for (let i = 1; i < parts.length; i++) value = value?.[parts[i]];
        return String(value ?? '');
    }

    private expr(e: Expression): any {
        switch (e.type) {
            case 'literal': return e.value;
            case 'identifier': return this.scope.get(e.name);
            case 'member': return this.expr(e.object)?.[e.property];
            case 'unary': return !this.expr(e.operand);
            case 'binary': {
                const l = this.expr(e.left), r = this.expr(e.right);
                switch (e.operator) {
                    case '==': return l === r;
                    case '!=': return l !== r;
                    case '&&': return l && r;
                    case '||': return l || r;
                    case '>': return l > r;
                    case '<': return l < r;
                    case '>=': return l >= r;
                    case '<=': return l <= r;
                }
            }
        }
    }
}

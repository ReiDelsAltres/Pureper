const FOR_RULE = {
    walk(walker, tokens, data) {
        if (tokens[0].type !== "at")
            return null;
        if (tokens[1].type !== "ident")
            return null;
        if (tokens[2].type !== "brace-open")
            return null;
        if (tokens[0].value !== "for")
            return null;
        const at = tokens[0];
        const ident = tokens[1];
        const braceOpen = tokens[2];
        const braceCloseIndex = tokens.findIndex((t, i) => t.type === "brace-close" && t.depth === braceOpen.depth);
        const bodyTokens = tokens.slice(3, braceCloseIndex);
        const walkedChildrens = walker.walk(walker, bodyTokens, data);
        const nestingNode = {
            type: `for`,
            exp: ident.value,
            children: walkedChildrens,
        };
        return { node: nestingNode, tokens: tokens.slice(braceCloseIndex + 1) };
    }
};
const IF_RULE = {
    walk(walker, tokens, data) {
        if (tokens[0].type !== "at")
            return null;
        if (tokens[1].type !== "ident")
            return null;
        if (tokens[2].type !== "brace-open")
            return null;
        if (tokens[0].value !== "if")
            return null;
        const at = tokens[0];
        const ident = tokens[1];
        const braceOpen = tokens[2];
        const braceCloseIndex = tokens.findIndex((t, i) => t.type === "brace-close" && t.depth === braceOpen.depth);
        const bodyTokens = tokens.slice(3, braceCloseIndex);
        const walkedChildrens = walker.walk(walker, bodyTokens, data);
        const nestingNode = {
            type: `if`,
            exp: ident.value,
            children: walkedChildrens,
        };
        return { node: nestingNode, tokens: tokens.slice(braceCloseIndex + 1) };
    }
};
export default class StylePreprocessor {
    tokens;
    pos;
    constructor(tokens, pos = 0) {
        this.tokens = tokens;
        this.pos = pos;
    }
    match(type) {
        return this.tokens[this.pos]?.type === type;
    }
    consume(type) {
        const token = this.tokens[this.pos];
        if (!token || token.type !== type) {
            throw new SyntaxError(`Expected ${type}`);
        }
        this.pos++;
        return token;
    }
    static tokenize(css) {
        const tokens = [];
        let i = 0;
        let braceDepth = 0;
        let parenthesisDepth = 0;
        while (i < css.length) {
            const c = css[i];
            if (/\s/.test(c)) {
                i++;
                continue;
            }
            if (c === "{")
                tokens.push({ type: "brace-open", depth: braceDepth++ });
            else if (c === "}")
                tokens.push({ type: "brace-close", depth: braceDepth-- });
            else if (c === "(")
                tokens.push({ type: "parenthesis-open", depth: parenthesisDepth++ });
            else if (c === ")")
                tokens.push({ type: "parenthesis-close", depth: parenthesisDepth-- });
            else if (c === ":") {
                let name = "";
                while (/[:a-zA-Z]/.test(css[i]))
                    name += css[i++];
                tokens.push({ type: "colon-rule", value: name });
                if (name.length === 0) {
                    tokens.push({ type: "colon" });
                }
                i--;
            }
            else if (c === ";")
                tokens.push({ type: "semicolon" });
            else if (c === "@") {
                i++;
                let name = "";
                while (/[a-zA-Z-]/.test(css[i]))
                    name += css[i++];
                tokens.push({ type: "at", value: name });
                continue;
            }
            else {
                let value = "";
                while (!/[(){}:;]/.test(css[i]))
                    value += css[i++];
                tokens.push({ type: "ident", value: value.trim() });
                continue;
            }
            i++;
        }
        return tokens;
    }
    static preprocess(css, data) {
        const tokens = StylePreprocessor.tokenize(css);
        const parser = new StylePreprocessor(tokens);
        return JSON.stringify(parser.walk(parser, tokens, data));
    }
    walk(walker, node, data) {
        const ast = [];
        const rules = [FOR_RULE, IF_RULE /*, ... other rules */];
        let tokens = node;
        for (const rule of rules) {
            let result = rule.walk(walker, tokens, data);
            if (result)
                tokens = result.tokens;
            while (result) {
                ast.push(result.node);
                result = rule.walk(walker, tokens, data);
                tokens = result.tokens;
            }
        }
        return ast;
    }
}
//# sourceMappingURL=StylePreprocessor.js.map
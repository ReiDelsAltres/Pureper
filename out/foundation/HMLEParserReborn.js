import Observable from './api/Observer.js';
import Context from './hmle/Context.js';
// Helper: encode expression for HTML attribute
function encodeAttr(s) {
    return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
// Helper: decode expression from HTML attribute
function decodeAttr(s) {
    return s.replace(/&gt;/g, '>').replace(/&lt;/g, '<').replace(/&quot;/g, '"').replace(/&amp;/g, '&');
}
// Helper: find all Observable variable names used in an expression
// Also considers dynamicVars as "Observable-like" for template generation
function findObservablesInExpr(expr, scope, dynamicVars) {
    const result = [];
    // Extract all identifier-like tokens from expression
    const identifiers = expr.match(/[A-Za-z_$][A-Za-z0-9_$]*/g) || [];
    for (const id of identifiers) {
        // Check if it's an actual Observable in scope
        if (scope[id] instanceof Observable && !result.includes(id)) {
            result.push(id);
        }
        // Check if it's a dynamic variable (from @for loop)
        else if (dynamicVars?.has(id) && !result.includes(id)) {
            result.push(id);
        }
    }
    return result;
}
// Helper: Find the index of the matching closing brace '}' ignoring braces inside quotes/comments
function findMatchingClosingBrace(content, openIndex) {
    let i = openIndex + 1;
    let depth = 1;
    let inSingle = false;
    let inDouble = false;
    let inBacktick = false;
    let inLineComment = false;
    let inBlockComment = false;
    let prevChar = '';
    while (i < content.length && depth > 0) {
        const ch = content[i];
        // handle comment states
        if (inLineComment) {
            if (ch === '\n')
                inLineComment = false;
            prevChar = ch;
            i++;
            continue;
        }
        if (inBlockComment) {
            if (prevChar === '*' && ch === '/')
                inBlockComment = false;
            prevChar = ch;
            i++;
            continue;
        }
        // handle string/template states, allow escaping
        if (inSingle) {
            if (ch === '\\' && prevChar !== '\\') {
                prevChar = ch;
                i++;
                continue;
            }
            if (ch === "'" && prevChar !== '\\')
                inSingle = false;
            prevChar = ch;
            i++;
            continue;
        }
        if (inDouble) {
            if (ch === '\\' && prevChar !== '\\') {
                prevChar = ch;
                i++;
                continue;
            }
            if (ch === '"' && prevChar !== '\\')
                inDouble = false;
            prevChar = ch;
            i++;
            continue;
        }
        if (inBacktick) {
            if (ch === '\\' && prevChar !== '\\') {
                prevChar = ch;
                i++;
                continue;
            }
            if (ch === '`' && prevChar !== '\\')
                inBacktick = false;
            prevChar = ch;
            i++;
            continue;
        }
        // Not inside quotes or comments
        // Start comments
        if (prevChar === '/' && ch === '/') {
            inLineComment = true;
            prevChar = '';
            i++;
            continue;
        }
        if (prevChar === '/' && ch === '*') {
            inBlockComment = true;
            prevChar = '';
            i++;
            continue;
        }
        // Start quotes
        if (ch === "'") {
            inSingle = true;
            prevChar = ch;
            i++;
            continue;
        }
        if (ch === '"') {
            inDouble = true;
            prevChar = ch;
            i++;
            continue;
        }
        if (ch === '`') {
            inBacktick = true;
            prevChar = ch;
            i++;
            continue;
        }
        // handle braces
        if (ch === '{')
            depth++;
        else if (ch === '}')
            depth--;
        prevChar = ch;
        i++;
    }
    // i is index just after the closing brace (since we increment after reading '}' )
    return i;
}
export default class HMLEParserReborn {
    rules = [];
    variables = {};
    constructor() {
        // Register default rules — order matters!
        // forRule must come before expRule so that @for creates local scope first
        this.rules.push(forRule);
        // element attribute rules
        this.rules.push(refRule);
        this.rules.push(onRule);
        this.rules.push(expRule);
    }
    /**
     * Add a custom rule to the parser
     */
    addRule(rule) {
        this.rules.push(rule);
        return this;
    }
    /**
     * Get registered rules
     */
    getRules() {
        return this.rules;
    }
    static isIdentifier(s) {
        return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test((s || '').trim());
    }
    buildContext(scope) {
        return Context.build(this.variables, scope);
    }
    evaluate(expr, scope) {
        const ctx = this.buildContext(scope);
        try {
            const fn = new Function('with(this){ return (' + expr + '); }');
            return fn.call(ctx);
        }
        catch (e) {
            return null;
        }
    }
    stringify(v) {
        if (v == null)
            return '';
        if (typeof v === 'string')
            return v;
        return String(v);
    }
    /**
     * Stage 1: Parsing — parse HMLE as text, execute STATIC RULES.
     * Observable values are left as <template ...> placeholders for Stage 3.
     */
    parse(content, scope) {
        let working = content || '';
        // Build dynamic var list from ref attributes in raw content so expressions referencing
        // DOM-created variables (like @[ref]="name") are not evaluated at parse time.
        const dynamicVars = new Set();
        // Match patterns like @[ref]="name" or @[ref]='name'
        const refAttrRe = /@\[\s*ref\s*\]\s*=\s*"([A-Za-z_$][A-Za-z0-9_$]*)"|@\[\s*ref\s*\]\s*=\s*'([A-Za-z_$][A-Za-z0-9_$]*)'/g;
        let rm;
        while ((rm = refAttrRe.exec(working)) !== null) {
            const name = rm[1] || rm[2];
            if (name)
                dynamicVars.add(name);
        }
        // Apply parseText rules in order, passing dynamicVars so rules like expRule can
        // treat references to these variables as dynamic
        for (const rule of this.rules) {
            if (rule.parseText) {
                const result = rule.parseText(this, working, scope, dynamicVars);
                if (result !== null) {
                    working = result;
                }
            }
        }
        return working;
    }
    /**
     * Stage 2: DOM Parsing — parse HMLE text to DOM, create <template> for dynamic rules.
     * Created templates are preserved for reuse when Observable updates.
     */
    parseToDOM(content, scope) {
        const html = this.parse(content, scope);
        const template = document.createElement('template');
        template.innerHTML = html.trim();
        return template.content;
    }
    /**
     * Stage 3: Hydration — remove templates and execute dynamic rules.
     */
    hydrate(fragment, scope) {
        let root;
        if (typeof DocumentFragment !== 'undefined' && fragment instanceof DocumentFragment)
            root = fragment;
        else if (fragment.nodeType === 11)
            root = fragment;
        else
            root = fragment;
        // Stage 2-ish: Process element-level rules (like @[ref] and @[on-event]) before templates are hydrated
        const allElements = Array.from(root.querySelectorAll('*'));
        for (const rule of this.rules) {
            if (rule.elementHydrate) {
                for (const el of allElements) {
                    rule.elementHydrate(this, el, scope);
                }
            }
        }
        // Process each rule's template hydrate method (stage 3)
        for (const rule of this.rules) {
            if (rule.hydrate) {
                const selector = `template[${rule.name}]`;
                const templates = Array.from(root.querySelectorAll(selector));
                for (const t of templates) {
                    rule.hydrate(this, t, scope);
                }
            }
        }
        // Process {{EXP:...}} placeholders in attributes
        this.hydrateAttributeExpressions(root, scope);
    }
    /**
     * Process {{EXP:expr}} placeholders in element attributes
     */
    hydrateAttributeExpressions(root, scope) {
        const expPattern = /\{\{EXP:([^}]+)\}\}/g;
        // Get all elements
        const elements = root.querySelectorAll('*');
        const allElements = [root, ...Array.from(elements)];
        for (const el of allElements) {
            if (!el.attributes)
                continue;
            for (const attr of Array.from(el.attributes)) {
                if (!expPattern.test(attr.value))
                    continue;
                // Reset regex
                expPattern.lastIndex = 0;
                const originalValue = attr.value;
                const observablesInAttr = [];
                // Find all expressions in this attribute
                let match;
                while ((match = expPattern.exec(originalValue)) !== null) {
                    const expr = decodeAttr(match[1]);
                    const obsNames = scope ? findObservablesInExpr(expr, scope) : [];
                    const obs = obsNames.map(name => scope[name]).filter(o => o instanceof Observable);
                    observablesInAttr.push({ expr, obs });
                }
                // Evaluate and replace
                const evalAttr = () => {
                    let result = originalValue;
                    expPattern.lastIndex = 0;
                    result = result.replace(expPattern, (_, encodedExpr) => {
                        const expr = decodeAttr(encodedExpr);
                        // Build scope with Observable values
                        const evalScope = Object.assign({}, scope);
                        if (scope) {
                            for (const name of findObservablesInExpr(expr, scope)) {
                                const obs = scope[name];
                                if (obs instanceof Observable) {
                                    evalScope[name] = obs.getObject ? obs.getObject() : undefined;
                                }
                            }
                        }
                        const val = this.evaluate(expr, evalScope);
                        return this.stringify(val);
                    });
                    return result;
                };
                // Initial evaluation
                attr.value = evalAttr();
                // Subscribe to all Observables for updates
                for (const { obs } of observablesInAttr) {
                    for (const o of obs) {
                        o.subscribe(() => {
                            attr.value = evalAttr();
                        });
                    }
                }
            }
        }
    }
}
/**
 * Helper: Parse content with specific variables treated as "dynamic" (Observable-like).
 * This is used inside Observable @for loops where index and value variables
 * should be treated as dynamic even though they're not in scope yet.
 */
function parseWithDynamicVars(parser, content, scope, dynamicVars) {
    let working = content;
    // Apply parseText rules in order with dynamicVars
    for (const rule of parser.getRules()) {
        if (rule.parseText) {
            const result = rule.parseText(parser, working, scope, dynamicVars);
            if (result !== null) {
                working = result;
            }
        }
    }
    return working;
}
// ==========================================
// Rule: exp — @(expression or variable)
// ==========================================
const expRule = {
    name: 'exp',
    parseText(parser, content, scope, dynamicVars) {
        let working = content;
        let out = '';
        let pos = 0;
        // Track if we're inside a <template for> tag
        let templateDepth = 0;
        while (pos < working.length) {
            // Check for <template for opening
            const templateForStart = working.indexOf('<template for', pos);
            // Check for </template> closing
            const templateEnd = working.indexOf('</template>', pos);
            // Check for @(
            const atIdx = working.indexOf('@(', pos);
            // Find the earliest marker
            const markers = [
                { type: 'start', idx: templateForStart },
                { type: 'end', idx: templateEnd },
                { type: 'expr', idx: atIdx }
            ].filter(m => m.idx !== -1).sort((a, b) => a.idx - b.idx);
            if (markers.length === 0) {
                // No more markers, append rest and break
                out += working.slice(pos);
                break;
            }
            const first = markers[0];
            if (first.type === 'start') {
                // Found <template for — copy up to it and increase depth
                const endOfTag = working.indexOf('>', first.idx);
                if (endOfTag === -1) {
                    out += working.slice(pos);
                    break;
                }
                out += working.slice(pos, endOfTag + 1);
                pos = endOfTag + 1;
                templateDepth++;
                continue;
            }
            if (first.type === 'end') {
                // Found </template> — copy up to it (including) and decrease depth
                const closeEnd = first.idx + '</template>'.length;
                out += working.slice(pos, closeEnd);
                pos = closeEnd;
                if (templateDepth > 0)
                    templateDepth--;
                continue;
            }
            if (first.type === 'expr') {
                // Found @( — if inside template, skip it
                if (templateDepth > 0) {
                    // Copy including @( and move on
                    out += working.slice(pos, first.idx + 2);
                    pos = first.idx + 2;
                    continue;
                }
                // Not inside template — process the expression
                out += working.slice(pos, first.idx);
                // Find balanced parentheses
                let j = first.idx + 2;
                let depth = 1;
                while (j < working.length && depth > 0) {
                    if (working[j] === '(')
                        depth++;
                    else if (working[j] === ')')
                        depth--;
                    j++;
                }
                if (depth !== 0) {
                    out += working.slice(first.idx, first.idx + 2);
                    pos = first.idx + 2;
                    continue;
                }
                const innerExpr = working.slice(first.idx + 2, j - 1).trim();
                // Check if expression references any Observable in scope or dynamic vars
                const observablesUsed = scope ? findObservablesInExpr(innerExpr, scope, dynamicVars) :
                    (dynamicVars ? findObservablesInExpr(innerExpr, {}, dynamicVars) : []);
                if (observablesUsed.length > 0) {
                    // Expression uses Observable or dynamic var — make it dynamic
                    // Check if we're inside an HTML attribute (look back for ="
                    const beforeMatch = out.slice(-50);
                    const inAttribute = /=["'][^"']*$/.test(beforeMatch);
                    if (inAttribute) {
                        out += `{{EXP:${encodeAttr(innerExpr)}}}`;
                    }
                    else {
                        // For dynamic vars from @for, include the var name
                        const dynamicVarsUsed = dynamicVars ? observablesUsed.filter(v => dynamicVars.has(v)) : [];
                        if (dynamicVarsUsed.length > 0) {
                            // Expression uses dynamic loop variables
                            out += `<template exp var="${dynamicVarsUsed.join(',')}" expr="${encodeAttr(innerExpr)}"></template>`;
                        }
                        else if (HMLEParserReborn.isIdentifier(innerExpr)) {
                            out += `<template exp var="${innerExpr}"></template>`;
                        }
                        else {
                            out += `<template exp expr="${encodeAttr(innerExpr)}"></template>`;
                        }
                    }
                    pos = j;
                    continue;
                }
                // Evaluate expression
                const res = parser.evaluate(innerExpr, scope);
                if (res instanceof Observable) {
                    out += `<template exp></template>`;
                }
                else if (typeof res === 'undefined') {
                    // void: nothing displayed
                }
                else {
                    out += parser.stringify(res);
                }
                pos = j;
            }
        }
        return out;
    },
    hydrate(parser, template, scope) {
        const varAttr = template.getAttribute('var') ?? null;
        const exprAttr = template.getAttribute('expr');
        const expr = exprAttr ? decodeAttr(exprAttr) : null;
        // Case 1: var="varName" without expr — simple variable reference @(obs)
        if (varAttr && !expr && scope) {
            // Single variable that should be Observable in scope
            if (scope[varAttr] instanceof Observable) {
                const obs = scope[varAttr];
                const value = obs.getObject ? obs.getObject() : undefined;
                const textNode = document.createTextNode(parser.stringify(value));
                template.parentNode?.replaceChild(textNode, template);
                // Subscribe for updates
                obs.subscribe((v) => {
                    textNode.textContent = parser.stringify(v);
                });
                return;
            }
        }
        // Case 2: var="i,v" with expr="..." — expression using dynamic variables
        // The var attribute contains comma-separated list of dynamic vars that should be Observable in scope
        if (varAttr && expr && scope) {
            const dynamicVarNames = varAttr.split(',').map(s => s.trim());
            // Collect all Observable variables used in the expression
            const observablesUsed = [];
            // Add dynamic vars from var attribute
            for (const name of dynamicVarNames) {
                if (scope[name] instanceof Observable) {
                    observablesUsed.push({ name, obs: scope[name] });
                }
            }
            // Also find any other Observable variables used in expression
            const identifiers = expr.match(/[A-Za-z_$][A-Za-z0-9_$]*/g) || [];
            for (const id of identifiers) {
                if (scope[id] instanceof Observable && !observablesUsed.some(o => o.name === id)) {
                    observablesUsed.push({ name: id, obs: scope[id] });
                }
            }
            // Evaluate with current Observable values
            const evalWithScope = () => {
                const evalScope = Object.assign({}, scope);
                for (const { name, obs } of observablesUsed) {
                    evalScope[name] = obs.getObject ? obs.getObject() : undefined;
                }
                return parser.evaluate(expr, evalScope);
            };
            const value = evalWithScope();
            const textNode = document.createTextNode(parser.stringify(value));
            template.parentNode?.replaceChild(textNode, template);
            // Subscribe to all Observables
            for (const { obs } of observablesUsed) {
                obs.subscribe(() => {
                    textNode.textContent = parser.stringify(evalWithScope());
                });
            }
            return;
        }
        // Case 3: Expression without var attribute that uses Observables @(action(greeting))
        if (expr && scope) {
            const observables = findObservablesInExpr(expr, scope);
            // Evaluate with current Observable values
            const evalWithScope = () => {
                const evalScope = Object.assign({}, scope);
                // Get current values from Observables
                for (const name of observables) {
                    const obs = scope[name];
                    if (obs instanceof Observable) {
                        evalScope[name] = obs.getObject ? obs.getObject() : undefined;
                    }
                }
                return parser.evaluate(expr, evalScope);
            };
            const value = evalWithScope();
            const textNode = document.createTextNode(parser.stringify(value));
            template.parentNode?.replaceChild(textNode, template);
            // Subscribe to all Observables used in expression
            for (const name of observables) {
                const obs = scope[name];
                if (obs instanceof Observable) {
                    obs.subscribe(() => {
                        textNode.textContent = parser.stringify(evalWithScope());
                    });
                }
            }
            return;
        }
        // Fallback: replace with comment
        const comment = document.createComment('exp');
        template.parentNode?.replaceChild(comment, template);
    }
};
// ==========================================
// Rule: for — @for (index, value in values) { ... }
// ==========================================
const forRule = {
    name: 'for',
    parseText(parser, content, scope, dynamicVars) {
        let working = content;
        const forRe = /@for\s*\(\s*([A-Za-z_$][A-Za-z0-9_$]*)(?:\s*,\s*([A-Za-z_$][A-Za-z0-9_$]*))?\s+in\s+([^\)\s]+)\s*\)\s*\{/g;
        let out = '';
        let lastIndex = 0;
        forRe.lastIndex = 0;
        let m;
        while ((m = forRe.exec(working)) !== null) {
            out += working.slice(lastIndex, m.index);
            const a = m[1];
            const b = m[2];
            const iterable = m[3];
            const blockStart = m.index + m[0].length - 1; // position of '{'
            // Extract balanced brace block using robust finder that ignores braces inside strings/comments
            const i = findMatchingClosingBrace(working, blockStart);
            if (i > working.length || i <= blockStart) {
                // Unable to find matching closing brace — fallback to leaving original match as-is
                out += working.slice(m.index, forRe.lastIndex);
                lastIndex = forRe.lastIndex;
                continue;
            }
            const inner = working.slice(blockStart + 1, i - 1);
            // Determine if this @for is dynamic (iterates over Observable or uses dynamic vars)
            const indexName = b ? a : 'index';
            const varName = b ? b : a;
            let isObservable = false;
            let values = [];
            if (/^\d+$/.test(iterable)) {
                // Numeric literal: @for (i in 5) { } — static
                const n = parseInt(iterable, 10);
                values = Array.from({ length: Math.max(0, n) }, (_, k) => k);
            }
            else {
                // Variable or dotted path
                const rootName = iterable.split('.')[0];
                // Check if iterable references Observable or dynamic variable
                const val = scope ? scope[rootName] : undefined;
                const isDynamicIterable = dynamicVars?.has(rootName);
                if (val instanceof Observable || isDynamicIterable) {
                    isObservable = true;
                }
                else {
                    // Evaluate expression for non-Observable
                    const resolved = parser.evaluate(iterable, scope);
                    if (Array.isArray(resolved))
                        values = resolved;
                    else if (typeof resolved === 'number' && isFinite(resolved)) {
                        values = Array.from({ length: Math.max(0, Math.floor(resolved)) }, (_, k) => k);
                    }
                    else {
                        values = [];
                    }
                }
            }
            if (isObservable) {
                // DYNAMIC @for — create template placeholder
                // Parse inner content with index and value marked as dynamic variables
                const innerDynamicVars = new Set(dynamicVars ?? []);
                innerDynamicVars.add(indexName);
                innerDynamicVars.add(varName);
                // Parse inner content — @() using dynamic vars will create <template exp>
                const parsedInner = parseWithDynamicVars(parser, inner, scope, innerDynamicVars);
                out += `<template for index="${indexName}" var="${varName}" in="${iterable}">${parsedInner}</template>`;
                lastIndex = i;
                forRe.lastIndex = i;
                continue;
            }
            // STATIC expansion for non-Observable values
            for (let idx = 0; idx < values.length; idx++) {
                const item = values[idx];
                const localScope = Object.assign({}, scope ?? {});
                if (b) {
                    localScope[a] = idx;
                    localScope[b] = item;
                }
                else {
                    localScope[a] = item;
                }
                out += parser.parse(inner, localScope);
            }
            lastIndex = i;
            forRe.lastIndex = i;
        }
        out += working.slice(lastIndex);
        return out;
    },
    hydrate(parser, template, scope) {
        const inExpr = template.getAttribute('in') ?? '';
        const varName = template.getAttribute('var') ?? 'item';
        const indexName = template.getAttribute('index') ?? 'i';
        // Get the root variable name and any nested path
        const rootName = inExpr.split('.')[0];
        const isNestedPath = inExpr.includes('.');
        const pathAfterRoot = isNestedPath ? inExpr.slice(rootName.length + 1) : '';
        const parent = template.parentNode;
        if (!parent)
            return;
        // Save insertion point (element after template, or null if at end)
        const insertionPoint = template.nextSibling;
        const innerContent = template.innerHTML;
        // Track rendered nodes for cleanup
        let rendered = [];
        // Helper: get array value from expression, unwrapping Observables
        const resolveArray = () => {
            if (isNestedPath) {
                // For nested paths like category.items, unwrap Observables in scope
                const unwrappedScope = Object.assign({}, scope);
                for (const key in unwrappedScope) {
                    if (unwrappedScope[key] instanceof Observable) {
                        unwrappedScope[key] = unwrappedScope[key].getObject();
                    }
                }
                const resolved = parser.evaluate(inExpr, unwrappedScope);
                return Array.isArray(resolved) ? resolved : [];
            }
            else {
                const val = scope ? scope[rootName] : undefined;
                if (val instanceof Observable) {
                    const v = val.getObject();
                    return Array.isArray(v) ? v : [];
                }
                else if (Array.isArray(val)) {
                    return val;
                }
                else if (typeof val === 'number') {
                    return Array.from({ length: Math.max(0, Math.floor(val)) }, (_, k) => k);
                }
                return [];
            }
        };
        // Check if this loop depends on any Observable
        const rootVal = scope ? scope[rootName] : undefined;
        const isObservableLoop = rootVal instanceof Observable;
        // Render a single item and return its nodes
        const renderItem = (idx, item, insertBefore) => {
            const localScope = Object.assign({}, scope ?? {});
            // Create Observables for index and value (so inner templates can subscribe)
            const idxObs = new Observable(idx);
            const valObs = new Observable(item);
            // Always put Observables in scope for Observable loops
            if (isObservableLoop) {
                localScope[indexName] = idxObs;
                localScope[varName] = valObs;
            }
            else {
                localScope[indexName] = idx;
                localScope[varName] = item;
            }
            const tmp = document.createElement('template');
            tmp.innerHTML = innerContent;
            // Hydrate nested templates with Observable scope
            parser.hydrate(tmp.content, localScope);
            const nodes = [];
            while (tmp.content.firstChild) {
                nodes.push(tmp.content.firstChild);
                parent.insertBefore(tmp.content.firstChild, insertBefore);
            }
            return { nodes, observables: { idx: idxObs, val: valObs } };
        };
        // Remove all rendered nodes
        const clearRendered = () => {
            for (const r of rendered) {
                for (const node of r.nodes) {
                    if (node.parentNode) {
                        node.parentNode.removeChild(node);
                    }
                }
            }
            rendered = [];
        };
        // Full re-render: clear old nodes and render new array
        const fullRerender = (insertBefore) => {
            clearRendered();
            const arr = resolveArray();
            for (let idx = 0; idx < arr.length; idx++) {
                const result = renderItem(idx, arr[idx], insertBefore);
                rendered.push(result);
            }
        };
        // Smart update: update existing, add/remove as needed
        const smartUpdate = (newArr) => {
            const oldLen = rendered.length;
            const newLen = newArr.length;
            // Update existing items (just update Observable values)
            for (let i = 0; i < Math.min(oldLen, newLen); i++) {
                rendered[i].observables.idx.setObject(i);
                rendered[i].observables.val.setObject(newArr[i]);
            }
            // If new array is longer, add new items
            if (newLen > oldLen) {
                let insertBeforeNode = null;
                if (rendered.length > 0) {
                    const lastNodes = rendered[rendered.length - 1].nodes;
                    if (lastNodes.length > 0) {
                        insertBeforeNode = lastNodes[lastNodes.length - 1].nextSibling;
                    }
                }
                else {
                    insertBeforeNode = insertionPoint;
                }
                for (let i = oldLen; i < newLen; i++) {
                    const result = renderItem(i, newArr[i], insertBeforeNode);
                    rendered.push(result);
                }
            }
            // If new array is shorter, remove extra items
            if (newLen < oldLen) {
                for (let i = oldLen - 1; i >= newLen; i--) {
                    for (const node of rendered[i].nodes) {
                        if (node.parentNode) {
                            node.parentNode.removeChild(node);
                        }
                    }
                }
                rendered.splice(newLen);
            }
        };
        // Initial render
        const arr = resolveArray();
        for (let idx = 0; idx < arr.length; idx++) {
            const result = renderItem(idx, arr[idx], template);
            rendered.push(result);
        }
        // Remove the template element
        parent.removeChild(template);
        // Subscribe to Observable updates
        if (isObservableLoop) {
            if (isNestedPath) {
                // For nested paths like category.items, we need to re-render when the root Observable changes
                // because the nested structure might have changed entirely
                rootVal.subscribe(() => {
                    // Find current insertion point (after last rendered node, or original point)
                    let insertBeforeNode = insertionPoint;
                    if (rendered.length > 0) {
                        const lastNodes = rendered[rendered.length - 1].nodes;
                        if (lastNodes.length > 0) {
                            insertBeforeNode = lastNodes[lastNodes.length - 1].nextSibling;
                        }
                    }
                    fullRerender(insertBeforeNode);
                });
            }
            else {
                // Direct Observable - use smart update
                rootVal.subscribe((newArr) => {
                    const items = Array.isArray(newArr) ? newArr : [];
                    smartUpdate(items);
                });
            }
        }
    }
};
// ==========================================
// Rule: ref — @[ref]="name"
// Create a variable in scope referencing the element
// ==========================================
const refRule = {
    name: 'ref',
    elementHydrate(parser, el, scope) {
        // attribute name is '@[ref]'
        if (!el.hasAttribute('@[ref]'))
            return;
        const raw = el.getAttribute('@[ref]')?.trim();
        if (!raw)
            return;
        // Build evaluation context so prototype methods are available
        const ctx = Context.build(parser.variables, scope);
        // If attribute contains attribute-expression placeholders like {{EXP:...}},
        // replace them by evaluating inner expressions. Otherwise try to evaluate the whole
        // attribute as an expression. Fallback to literal if evaluation fails.
        let refName;
        const expPattern = /\{\{EXP:([^}]+)\}\}/g;
        if (expPattern.test(raw)) {
            // Replace each placeholder with evaluated string
            let tmp = raw;
            expPattern.lastIndex = 0;
            tmp = tmp.replace(expPattern, (_m, enc) => {
                const expr = decodeAttr(enc);
                // Build evaluation scope with unwrapped Observable values used in expr
                const evalScope = Object.assign({}, ctx);
                if (scope) {
                    const obsNames = findObservablesInExpr(expr, scope);
                    for (const name of obsNames) {
                        const o = scope[name];
                        if (o instanceof Observable)
                            evalScope[name] = o.getObject ? o.getObject() : undefined;
                    }
                }
                const val = parser.evaluate(expr, evalScope);
                return val == null ? '' : String(val);
            });
            refName = tmp;
        }
        else {
            // Try evaluating full attribute as JS expression
            try {
                const evalScope = Object.assign({}, ctx);
                if (scope) {
                    const obsNames = findObservablesInExpr(raw, scope);
                    for (const name of obsNames) {
                        const o = scope[name];
                        if (o instanceof Observable)
                            evalScope[name] = o.getObject ? o.getObject() : undefined;
                    }
                }
                const evaluated = parser.evaluate(raw, evalScope);
                if (typeof evaluated === 'string')
                    refName = evaluated;
                else if (evaluated != null)
                    refName = String(evaluated);
            }
            catch (e) {
                // ignore and fallback to raw
            }
        }
        if (!refName)
            refName = raw;
        if (refName) {
            if (scope) {
                scope[refName] = el;
            }
            else {
                parser.variables[refName] = el;
            }
        }
    }
};
// ==========================================
// Rule: on — @[onclick]="expression"; binds events to elements
// ==========================================
const onRule = {
    name: 'on',
    elementHydrate(parser, el, scope) {
        // Ensure we don't attach duplicate handlers when hydration runs multiple times
        const anyEl = el;
        anyEl.__hmle_on_handlers = anyEl.__hmle_on_handlers || {};
        const HMLE_ON_HANDLERS = anyEl.__hmle_on_handlers;
        for (const attr of Array.from(el.attributes)) {
            const an = attr.name;
            if (!an.startsWith('@[on') || !an.endsWith(']'))
                continue;
            // Example: '@[onclick]' -> 'onclick' -> event 'click'
            let eventName = an.slice(2, an.length - 1); // removes '@[' and ']'
            if (eventName.startsWith('on'))
                eventName = eventName.slice(2);
            const expr = attr.value;
            // Skip if we already attached a handler for this event on this element
            if (HMLE_ON_HANDLERS[eventName]) {
                el.removeAttribute(an);
                continue;
            }
            // Add event listener
            const handler = (ev) => {
                // Build evaluation scope with unwrapped Observables while preserving
                // the prototype of the original scope so prototype methods remain bound.
                let evalScope = Object.create(scope ?? null);
                // Ensure Context.bindPrototypeMethods binds to the real scope instance,
                // not to this wrapper object (otherwise `this` inside methods is not HTMLElement).
                evalScope.__hmle_this = scope ?? null;
                // Unwrap Observables referenced in expression into own-properties
                if (scope) {
                    const observed = findObservablesInExpr(expr, scope);
                    for (const name of observed) {
                        const o = scope[name];
                        if (o instanceof Observable)
                            evalScope[name] = o.getObject ? o.getObject() : undefined;
                    }
                }
                // event and element are added to the scope as own-properties
                evalScope['event'] = ev;
                evalScope['element'] = el;
                parser.evaluate(expr, evalScope);
            };
            el.addEventListener(eventName, handler);
            HMLE_ON_HANDLERS[eventName] = handler;
            el.removeAttribute(an);
        }
    }
};
//# sourceMappingURL=HMLEParserReborn.js.map
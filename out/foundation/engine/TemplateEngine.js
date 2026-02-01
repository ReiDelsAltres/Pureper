import Observable from "../api/Observer.js";
import Expression from "./Expression.js";
export default class TemplateEngine {
    ref_component = new class {
        engine;
        globalScope;
        constructor(engine) {
            this.engine = engine;
        }
        acceptNode(node) {
            return node.hasAttribute("ref");
        }
        walkthrough(walker, node, data) {
            const element = node;
            const bool = this.acceptNode(element);
            if (bool) {
                const refAtt = element.getAttribute("ref");
                const refName = new Expression(refAtt).eval(data);
                this.doWork({ element, refName, data });
            }
            return false;
        }
        doWork(context) {
            context.data.set(context.refName, context.element);
            this.globalScope.set(context.refName, context.element);
            this.engine.bindings.set(context.element, () => {
                context.data.delete(context.refName);
                this.globalScope.delete(context.refName);
            });
        }
    }(this);
    set_component = new class {
        engine;
        constructor(engine) {
            this.engine = engine;
        }
        acceptNode(node) {
            return Array.from(node.attributes).some(attr => /^set\[[^\]]+\]$/i.test(attr.name));
        }
        walkthrough(walker, node, data) {
            const element = node;
            const bool = this.acceptNode(element);
            if (!bool)
                return false;
            for (const attr of Array.from(element.attributes).filter(attr => /^set\[[^\]]+\]$/i.test(attr.name))) {
                const attributeName = attr.name.substring(4, attr.name.length - 1);
                const valueExpression = new Expression(attr.value);
                const of = valueExpression.eval(data);
                const value = of instanceof Observable ? of.getObject() : of;
                if (value === null || value === undefined)
                    continue;
                if (of instanceof Observable) {
                    of.subscribe((newValue) => {
                        this.engine.change();
                        this.doWork({ element, name: attributeName, value: newValue });
                    });
                }
                this.doWork({ element, name: attributeName, value });
                this.engine.bindings.set(element, () => {
                    element.removeAttribute(attributeName);
                });
            }
            return false;
        }
        doWork(context) {
            const { element, name, value } = context;
            element.setAttribute(name, value);
        }
    }(this);
    on_component = new class {
        engine;
        constructor(engine) {
            this.engine = engine;
        }
        acceptNode(node) {
            return Array.from(node.attributes).some(attr => /^on\[[^\]]+\]$/i.test(attr.name));
        }
        walkthrough(walker, node, data) {
            const element = node;
            const bool = this.acceptNode(element);
            if (!bool)
                return false;
            for (const attr of Array.from(element.attributes).filter(attr => /^on\[[^\]]+\]$/i.test(attr.name))) {
                const eventName = attr.name.substring(3, attr.name.length - 1);
                const handler = new Expression(attr.value);
                const listener = (event) => {
                    handler.eval(data, { event });
                };
                element.addEventListener(eventName, listener);
                this.engine.bindings.set(element, () => {
                    element.removeEventListener(eventName, listener);
                });
            }
            return false;
        }
    }(this);
    injection_component = new class {
        engine;
        constructor(engine) {
            this.engine = engine;
        }
        acceptNode(node) {
            return node.tagName === "INJECTION";
        }
        walkthrough(walker, node, data) {
            const element = node;
            const bool = this.acceptNode(element);
            if (bool) {
                function insideWork() {
                    const targetAtt = element.getAttribute("target");
                    const targetName = new Expression(targetAtt).eval(data);
                    const at = element.getAttribute("at");
                    element.remove();
                    const targetElement = data.get(targetName);
                    if (!targetElement) {
                        this.engine.processLogs.push(`Injection target '${targetName}' not found.`);
                        return true;
                    }
                    ;
                    this.doWork({ element, target: targetElement, at: at });
                }
                insideWork.call(this);
                this.engine.onChange(() => insideWork.call(this));
            }
            return bool;
        }
        doWork(context) {
            const { element, target, at } = context;
            if (at === "head") {
                target.prepend(...element.childNodes);
            }
            else {
                target.append(...element.childNodes);
            }
        }
    }(this);
    exp_component = new class {
        engine;
        constructor(engine) {
            this.engine = engine;
        }
        acceptNode(node) {
            return node.tagName === "EXP";
        }
        walkthrough(walker, node, data) {
            const element = node;
            const bool = this.acceptNode(element);
            if (bool) {
                const vvv = element.getAttribute("of");
                const allowHtmlInjection = element.hasAttribute("html-injection") ||
                    element.getAttribute("html-injection") === "true";
                const of = new Expression(vvv).eval(data);
                const value = of instanceof Observable ? of.getObject() : of;
                if (of instanceof Observable) {
                    of.subscribe((newValue) => {
                        element.textContent = "";
                        this.engine.change();
                        this.doWork({ element, value: newValue, allowHtmlInjection: allowHtmlInjection });
                    });
                }
                this.doWork({ element, value, allowHtmlInjection: allowHtmlInjection });
                /*const textNode = document.createTextNode(of);
                element.parentNode!.replaceChild(textNode, element);*/
            }
            return bool;
        }
        doWork(context) {
            if (context.allowHtmlInjection) {
                context.element.innerHTML = context.value;
                return;
            }
            context.element.textContent = context.value;
        }
    }(this);
    for_component = new class {
        engine;
        constructor(engine) {
            this.engine = engine;
        }
        acceptNode(element) {
            return element.tagName === "FOR";
        }
        walkthrough(walker, node, data) {
            const element = node;
            const bool = this.acceptNode(element);
            if (bool) {
                const shadow = TemplateEngine.transContentToShadow(element);
                const index = element.getAttribute("index");
                const value = element.getAttribute("value");
                const vvv = element.getAttribute("of");
                const of = new Expression(vvv).eval(data);
                const iterable = of instanceof Observable ? of.getObject() : of;
                if (of instanceof Observable) {
                    of.subscribe((newValue) => {
                        this.engine.change();
                        this.doWork({ element, iterable: newValue, index, value, walker, shadow, data });
                    });
                }
                this.doWork({ element, iterable: iterable, index, value, walker, shadow, data });
            }
            return bool;
        }
        doWork(context) {
            const conseg = [];
            const element = context.element;
            const iterable = context.iterable;
            const index = context.index;
            const value = context.value;
            const walker = context.walker;
            const shadow = context.shadow;
            const data = context.data;
            element.childNodes.forEach(n => this.engine.fullCleanup(n));
            const lenght = typeof iterable === "number" ? iterable : iterable.length;
            for (let i = 0; i < lenght; i++) {
                const z = i;
                const nestedScope = data.createChild();
                const setToScope = typeof iterable === "number" ? z : iterable[z];
                if (index)
                    nestedScope.set(index, z);
                nestedScope.set(value, setToScope);
                const block = document.createElement("for-temporary-block");
                block.appendChild(shadow.content.cloneNode(true));
                walker.walk(block, nestedScope);
                conseg.push(block);
            }
            conseg.forEach(c => {
                element.append(...c.childNodes);
            });
        }
    }(this);
    if_component = new class {
        engine;
        constructor(engine) {
            this.engine = engine;
        }
        acceptNode(node) {
            return node.tagName === "IF"
                || node.tagName === "ELSEIF"
                || node.tagName === "ELSE";
        }
        walkthrough(walker, node, data) {
            const element = node;
            const bool = element.tagName === "IF";
            if (bool) {
                const allParts = [];
                allParts.push({ element, shadow: TemplateEngine.transContentToShadow(element) });
                let point = element;
                while (true) {
                    if (!point.nextSibling)
                        break;
                    point = point.nextSibling;
                    if (!point || point.nodeType !== Node.ELEMENT_NODE)
                        continue;
                    if (!point || !this.acceptNode(point))
                        break;
                    allParts.push({ element: point, shadow: TemplateEngine.transContentToShadow(point) });
                }
                for (const part of allParts) {
                    const conditionAtt = part.element.getAttribute('condition');
                    if (!conditionAtt)
                        continue;
                    const condition = new Expression(conditionAtt).eval(data);
                    if (condition instanceof Observable) {
                        condition.subscribe((newValue) => {
                            this.engine.change();
                            this.doWork({ walker, data, allParts: allParts });
                        });
                    }
                }
                this.doWork({ walker, data, allParts: allParts });
            }
            return bool;
        }
        doWork(context) {
            const { walker, data, allParts } = context;
            allParts.forEach(part => {
                this.engine.fullCleanup(part.element);
                /*part.element.childNodes.forEach(n =>
                    this.engine.fullCleanup(n));*/
            });
            for (const part of allParts) {
                const conditionAtt = part.element.getAttribute('condition');
                if (!conditionAtt && part.element.tagName === "ELSE") {
                    const block = document.createElement("if-temporary-block");
                    block.appendChild(part.shadow.content.cloneNode(true));
                    walker.walk(block, data);
                    part.element.append(...block.childNodes);
                    break;
                }
                ;
                const condition = new Expression(conditionAtt).eval(data);
                const conditionValue = condition instanceof Observable ? condition.getObject() : condition;
                if (conditionValue) {
                    const block = document.createElement("if-temporary-block");
                    block.appendChild(part.shadow.content.cloneNode(true));
                    walker.walk(block, data);
                    part.element.append(...block.childNodes);
                    break;
                }
            }
        }
    }(this);
    components = [
        this.ref_component, this.on_component, this.set_component,
        this.injection_component, this.exp_component, this.for_component,
        this.if_component
    ];
    bindings = new Map();
    onChangeCallbacks = [];
    processLogs = [];
    static fullProcess(root, scope) {
        const engine = new TemplateEngine();
        engine.fullProcess(root, scope);
        return engine.processLogs;
    }
    static createHolder(markup, scope) {
        const engine = new TemplateEngine();
        const fragment = document.createRange().createContextualFragment(markup);
        engine.fullProcess(fragment, scope);
        return new TemplateHolder(engine, fragment);
    }
    change() {
        this.processLogs.push('--- Change triggered ---');
        this.onChangeCallbacks.forEach(cb => cb());
    }
    onChange(funct) {
        this.onChangeCallbacks.push(funct);
    }
    fullProcess(root, scope) {
        this.processLogs = [];
        this.ref_component.globalScope = scope;
        const walker = new Walker(root, {
            nodeFilter: NodeFilter.SHOW_DOCUMENT_FRAGMENT | NodeFilter.SHOW_ELEMENT,
            walkerFunction: (walker, node, data) => {
                if (node.nodeType !== Node.ELEMENT_NODE) {
                    node.childNodes.forEach(child => {
                        walker.walk(child, data);
                    });
                    return;
                }
                for (const component of this.components)
                    if (component.walkthrough?.call(component, walker, node, data))
                        return;
                node.childNodes.forEach(child => {
                    walker.walk(child, data);
                });
            }
        });
        let i = 0;
        walker.onEnterNode((node, data) => {
            this.processLogs.push((" ").repeat(i) + "layer " + i + " Entering: " + node.nodeName + " - Vars: " + Object.keys(data.getVariables()).join(", "));
            i++;
        });
        walker.onLeaveNode((node, data) => {
            i--;
            this.processLogs.push((" ").repeat(i) + "layer " + i + " Leaving: " + node.nodeName + " - Vars: " + Object.keys(data.getVariables()).join(", "));
        });
        walker.walk(null, scope);
    }
    fullCleanup(root) {
        const walker = new Walker(root, {
            nodeFilter: NodeFilter.SHOW_DOCUMENT_FRAGMENT | NodeFilter.SHOW_ELEMENT
        });
        let i = 0;
        walker.onEnterNode((node, data) => {
            const element = node;
            const binding = this.bindings.get(element);
            if (binding)
                binding();
            this.processLogs.push((" ").repeat(i) + "layer " + i + " Cleaning up Starting: " + node.nodeName);
            i++;
        });
        walker.onLeaveNode((node, data) => {
            const element = node;
            element.innerHTML = "";
            i--;
            this.processLogs.push((" ").repeat(i) + "layer " + i + " Cleaning up Ending: " + node.nodeName);
        });
        walker.walk(root);
    }
    static transContentToShadow(root) {
        const template = document.createElement("template");
        while (root.firstChild) {
            template.content.appendChild(root.firstChild);
        }
        return template;
    }
}
export class TemplateHolder {
    engine;
    documentFragment;
    constructor(engine, documentFragment) {
        this.engine = engine;
        this.documentFragment = documentFragment;
    }
    pushTo(element) {
        element.appendChild(this.documentFragment);
        this.documentFragment = element;
    }
}
export class Walker {
    onEnterNodeCallbacks = [];
    onLeaveNodeCallbacks = [];
    root;
    filter;
    walkerFunction;
    nodeFilter;
    constructor(root, settings) {
        this.root = root;
        this.filter = settings?.filter;
        this.nodeFilter = settings?.nodeFilter || NodeFilter.SHOW_ALL;
        this.walkerFunction = settings?.walkerFunction;
    }
    walk(node, data, walkerFunction) {
        if (!node)
            node = this.root;
        if (!walkerFunction)
            walkerFunction = this.walkerFunction;
        if (!this.matchesMask(node, this.nodeFilter))
            return;
        this.onEnterNodeCallbacks.forEach(cb => cb(node, data));
        if (walkerFunction) {
            walkerFunction(this, node, data);
        }
        else {
            node.childNodes.forEach(child => {
                if (this.filter && this.filter(child) !== NodeFilter.FILTER_ACCEPT)
                    return;
                this.walk(child, data);
            });
        }
        this.onLeaveNodeCallbacks.forEach(cb => cb(node, data));
    }
    matchesMask(node, mask) {
        return (mask & (1 << (node.nodeType - 1))) !== 0;
    }
    onEnterNode(callback) {
        this.onEnterNodeCallbacks.push(callback);
    }
    onLeaveNode(callback) {
        this.onLeaveNodeCallbacks.push(callback);
    }
}
//# sourceMappingURL=TemplateEngine.js.map
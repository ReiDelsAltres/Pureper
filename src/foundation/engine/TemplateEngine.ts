import Observable from "../api/Observer.js";
import Expression from "./Expression.js";
import Scope from "./Scope.js";

export default class TemplateEngine { 

    private readonly ref_component: TemplateComponent = new class implements TemplateComponent {
        public globalScope?: Scope;
        public constructor(private engine: TemplateEngine) { }
        public acceptNode(node: Element): boolean {
            return node.hasAttribute("ref");
        }
        public walkthrough(walker: Walker<Scope>, node: Node, data?: Scope): boolean {
            const element = node as Element;
            const bool = this.acceptNode(element);
            if (bool) {
                const refAtt = element.getAttribute("ref")!;
                const refName: string = new Expression(refAtt).eval(data!);

                this.doWork({ element, refName, data });
            }
            return false;
        }
        public doWork(context?: { element: Element, refName: string, data?: Scope }): void {
            context!.data!.set(context!.refName, context!.element);
            this.globalScope!.set(context!.refName, context!.element);

            this.engine.bindings.set(context!.element, () => {
                context!.data!.delete(context!.refName);
                this.globalScope!.delete(context!.refName);
            });
        }
    }(this);
    private readonly set_component: TemplateComponent = new class implements TemplateComponent {
        public constructor(private engine: TemplateEngine) { }
        public acceptNode(node: Element): boolean {
            return Array.from(node.attributes).some(attr => /^set\[[^\]]+\]$/i.test(attr.name));
        }
        public walkthrough(walker: Walker<Scope>, node: Node, data?: Scope): boolean {
            const element = node as Element;
            const bool = this.acceptNode(element);
            if (!bool) return false;
            for (const attr of Array.from(element.attributes).filter(attr => /^set\[[^\]]+\]$/i.test(attr.name))) {
                const attributeName = attr!.name.substring(4, attr!.name.length - 1);
                const valueExpression = new Expression(attr.value);
                const of = valueExpression.eval(data!);
                const value = of instanceof Observable ? of.getObject() : of;
                if (value === null || value === undefined) continue;
                if (of instanceof Observable) {
                    of.subscribe((newValue: any) => {
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
        doWork(context?: { element: Element, name: string, value: string }): void {
            const { element, name, value } = context!;
            element.setAttribute(name, value);
        }
    }(this);
    private readonly on_component: TemplateComponent = new class implements TemplateComponent {
        public constructor(private engine: TemplateEngine) { }
        public acceptNode(node: Element): boolean {
            return Array.from(node.attributes).some(attr => /^on\[[^\]]+\]$/i.test(attr.name));
        }
        public walkthrough(walker: Walker<Scope>, node: Node, data?: Scope): boolean {
            const element = node as Element;
            const bool = this.acceptNode(element);
            if (!bool) return false;
            for (const attr of Array.from(element.attributes).filter(attr => /^on\[[^\]]+\]$/i.test(attr.name))) {
                const eventName = attr!.name.substring(3, attr!.name.length - 1);
                const handler = new Expression(attr.value);
                const listener = (event: Event) => {
                    handler.eval(data!, { event });
                };

                element.addEventListener(eventName, listener);
                this.engine.bindings.set(element, () => {
                    element.removeEventListener(eventName, listener);
                });
            }
            return false;
        }
    }(this);
    private readonly injection_component: TemplateComponent = new class implements TemplateComponent {
        public constructor(private engine: TemplateEngine) { }
        public acceptNode(node: Element): boolean {
            return node.tagName === "INJECTION";
        }
        public walkthrough(walker: Walker<Scope>, node: Node, data?: Scope): boolean {
            const element = node as Element;
            const bool = this.acceptNode(element);

            if (bool) {
                function insideWork() {
                    const targetAtt = element.getAttribute("target")!;
                    const targetName: string = new Expression(targetAtt).eval(data!);
                    const at: string = element.getAttribute("at")!;

                    element.remove();

                    const targetElement = data!.get(targetName) as Element;
                    if (!targetElement) {
                        this.engine.processLogs.push(`Injection target '${targetName}' not found.`);
                        return true;
                    };
                    this.doWork({ element, target: targetElement, at: at as "head" | "tail" });
                }
                insideWork.call(this);
                this.engine.onChange(() => insideWork.call(this));
            }
            return bool;
        }
        public doWork(context?: { element: Element, target: Element, at: "head" | "tail" }): void {
            const { element, target, at } = context!;
            if (at === "head") {
                target.prepend(...element.childNodes);
            } else {
                target.append(...element.childNodes);
            }
        }
    }(this);
    private readonly exp_component: TemplateComponent = new class implements TemplateComponent {
        public constructor(private engine: TemplateEngine) { }
        public acceptNode(node: Element): boolean {
            return node.tagName === "EXP";
        }
        public walkthrough(walker: Walker<Scope>, node: Node, data?: Scope): boolean {
            const element = node as Element;
            const bool = this.acceptNode(element);
            if (bool) {
                const vvv = element.getAttribute("of")!;
                const allowHtmlInjection = element.hasAttribute("html-injection") || 
                    element.getAttribute("html-injection") === "true";
                const of: string | any = new Expression(vvv).eval(data!);

                const value = of instanceof Observable ? of.getObject() : of;
                if (of instanceof Observable) {
                    of.subscribe((newValue: any[]) => {
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
        public doWork(context?: { element: Element, value: any, allowHtmlInjection?: boolean }): void {
            if (context!.allowHtmlInjection) {
                context!.element.innerHTML = context.value;
                return;
            }
            context.element.textContent = context.value;
        }
    }(this);
    private readonly for_component: TemplateComponent = new class implements TemplateComponent {
        public constructor(private engine: TemplateEngine) { }
        public acceptNode(element: Element): boolean {
            return element.tagName === "FOR";
        }
        public walkthrough(walker: Walker<Scope>, node: Node, data?: Scope): boolean {
            const element = node as Element;
            const bool = this.acceptNode(element);
            if (bool) {
                const shadow = TemplateEngine.transContentToShadow(element);

                const index: string = element.getAttribute("index")!;
                const value: string = element.getAttribute("value")!;
                const vvv = element.getAttribute("of")!;
                const of: string | any = new Expression(vvv).eval(data!);

                const iterable = of instanceof Observable ? of.getObject() : of;
                if (of instanceof Observable) {
                    of.subscribe((newValue: any[]) => {
                        this.engine.change();
                        this.doWork({ element, iterable: newValue, index, value, walker, shadow, data });
                    });
                }
                this.doWork({ element, iterable: iterable, index, value, walker, shadow, data });
            }
            return bool;
        }
        public doWork(context?: {
            element: Element, iterable: any, index?: string,
            value: string, walker: Walker<Scope>,
            shadow: HTMLTemplateElement, data: Scope
        }): void {
            const conseg = [];

            const element = context!.element;
            const iterable = context!.iterable;
            const index = context!.index;
            const value = context!.value;
            const walker = context!.walker;
            const shadow = context!.shadow;
            const data = context!.data;

            element.childNodes.forEach(n => this.engine.fullCleanup(n));

            const lenght = typeof iterable === "number" ? iterable : iterable.length;

            for (let i = 0; i < lenght; i++) {
                const z = i;
                const nestedScope = data.createChild();

                const setToScope = typeof iterable === "number" ? z : (iterable as any)[z];

                if (index) nestedScope.set(index, z);
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
    private readonly if_component: TemplateComponent = new class implements TemplateComponent {
        public constructor(private engine: TemplateEngine) { }
        public acceptNode(node: Element): boolean {
            return node.tagName === "IF"
                || node.tagName === "ELSEIF"
                || node.tagName === "ELSE";
        }
        public walkthrough(walker: Walker<Scope>, node: Node, data?: Scope): boolean {
            const element = node as Element;
            const bool = element.tagName === "IF";
            if (bool) {
                const allParts: { element: Element, shadow: HTMLTemplateElement }[] = [];
                allParts.push({ element, shadow: TemplateEngine.transContentToShadow(element) });

                let point: Node = element;
                while (true) {
                    if (!point.nextSibling) break;
                    point = point.nextSibling;
                    if (!point || point.nodeType !== Node.ELEMENT_NODE) continue;
                    if (!point || !this.acceptNode(point as Element)) break;
                    allParts.push({ element: point as Element, shadow: TemplateEngine.transContentToShadow(point as Element) });
                }

                for (const part of allParts) {
                    const conditionAtt = part.element.getAttribute('condition');
                    if (!conditionAtt) continue;
                    const condition = new Expression(conditionAtt).eval(data!);

                    if (condition instanceof Observable) {
                        condition.subscribe((newValue: boolean) => {
                            this.engine.change();
                            this.doWork({ walker, data, allParts: allParts });
                        });
                    }
                }

                this.doWork({ walker, data, allParts: allParts });

            }
            return bool;
        }
        public doWork(context?: {
            walker: Walker<Scope>,
            data: Scope,
            allParts: { element: Element, shadow: HTMLTemplateElement, condition?: string }[]
        }): void {
            const { walker, data, allParts } = context!;

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
                };

                const condition = new Expression(conditionAtt).eval(data!);
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
    private readonly components: TemplateComponent[] = [
        this.ref_component, this.on_component, this.set_component,
        this.injection_component, this.exp_component, this.for_component,
        this.if_component
    ];

    public readonly bindings: Map<Element, () => void> = new Map();
    private readonly onChangeCallbacks: (() => void)[] = [];
    public processLogs: string[] = [];
    public static fullProcess(root: Node, scope: Scope): string[] {
        const engine = new TemplateEngine();
        engine.fullProcess(root, scope);
        return engine.processLogs;
    }
    public static createHolder(markup: string, scope: Scope): TemplateHolder {
        const engine = new TemplateEngine();
        const fragment = document.createRange().createContextualFragment(markup);
        engine.fullProcess(fragment, scope);
        return new TemplateHolder(engine, fragment);
    }
    private change() {
        this.processLogs.push('--- Change triggered ---');
        this.onChangeCallbacks.forEach(cb => cb());
    }

    public onChange(funct: () => void) {
        this.onChangeCallbacks.push(funct);
    }
    public fullProcess(root: Node, scope: Scope) {
        this.processLogs = [];
        (this.ref_component as any).globalScope = scope;

        const walker = new Walker<Scope>(root, {
            nodeFilter: NodeFilter.SHOW_DOCUMENT_FRAGMENT | NodeFilter.SHOW_ELEMENT,
            walkerFunction: (walker: Walker<Scope>, node: Node, data?: Scope) => {
                if (node.nodeType !== Node.ELEMENT_NODE) {
                    node.childNodes.forEach(child => {
                        walker.walk(child, data);
                    });
                    return;
                }

                for (const component of this.components)
                    if (component.walkthrough?.call(component, walker, node, data)) return;

                node.childNodes.forEach(child => {
                    walker.walk(child, data);
                });
            }
        });
        let i = 0;

        walker.onEnterNode((node: Node, data?: Scope) => {
            this.processLogs.push((" ").repeat(i) + "layer " + i + " Entering: " + node.nodeName + " - Vars: " + Object.keys(data.getVariables()).join(", "));
            i++;
        });
        walker.onLeaveNode((node: Node, data?: Scope) => {
            i--;
            this.processLogs.push((" ").repeat(i) + "layer " + i + " Leaving: " + node.nodeName + " - Vars: " + Object.keys(data.getVariables()).join(", "));
        });
        walker.walk(null, scope);
    }
    public fullCleanup(root: Node): void {
        const walker = new Walker<Scope>(root, {
            nodeFilter: NodeFilter.SHOW_DOCUMENT_FRAGMENT | NodeFilter.SHOW_ELEMENT
        });
        let i = 0;
        walker.onEnterNode((node: Node, data?: Scope) => {
            const element = node as Element;
            const binding = this.bindings.get(element);
            if (binding) binding();

            this.processLogs.push((" ").repeat(i) + "layer " + i + " Cleaning up Starting: " + node.nodeName);
            i++;
        });
        walker.onLeaveNode((node: Node, data?: Scope) => {
            const element = node as Element;
            element.innerHTML = "";

            i--;
            this.processLogs.push((" ").repeat(i) + "layer " + i + " Cleaning up Ending: " + node.nodeName);
        });
        walker.walk(root);
    }
    private static transContentToShadow(root: Element): HTMLTemplateElement {
        const template = document.createElement("template");
        while (root.firstChild) {
            template.content.appendChild(root.firstChild);
        }
        return template;
    }
}
export class TemplateHolder {
    public readonly engine: TemplateEngine;
    public documentFragment: HTMLElement | DocumentFragment;

    public constructor(engine: TemplateEngine, documentFragment: DocumentFragment) {
        this.engine = engine;
        this.documentFragment = documentFragment;
    }

    public pushTo(element: HTMLElement | DocumentFragment): void {
        element.appendChild(this.documentFragment);
        this.documentFragment = element;
    }
}
export class Walker<D> {
    private onEnterNodeCallbacks: ((node: Node, data?: D) => void)[] = [];
    private onLeaveNodeCallbacks: ((node: Node, data?: D) => void)[] = [];

    private root?: Node;
    public filter?: (node: Node) => number;
    private walkerFunction?: (walker: Walker<D>, node: Node, data?: D) => void;
    private nodeFilter: number;

    public constructor(root: Node, settings?: {
        nodeFilter?: number,
        filter?: (node: Node) => number,
        walkerFunction?: (walker: Walker<D>, node: Node, data?: D) => void
    }) {

        this.root = root;
        this.filter = settings?.filter;
        this.nodeFilter = settings?.nodeFilter || NodeFilter.SHOW_ALL;
        this.walkerFunction = settings?.walkerFunction;
    }

    public walk(node?: Node, data?: D, walkerFunction?: (walker: Walker<D>, node: Node, data?: D) => void): void {
        if (!node) node = this.root!;
        if (!walkerFunction) walkerFunction = this.walkerFunction;
        if (!this.matchesMask(node, this.nodeFilter)) return;

        this.onEnterNodeCallbacks.forEach(cb => cb(node, data));

        if (walkerFunction) {
            walkerFunction(this, node, data);
        } else {
            node.childNodes.forEach(child => {
                if (this.filter && this.filter(child) !== NodeFilter.FILTER_ACCEPT) return;
                this.walk(child, data);
            });
        }
        this.onLeaveNodeCallbacks.forEach(cb => cb(node, data));
    }
    private matchesMask(node: Node, mask: number): boolean {
        return (mask & (1 << (node.nodeType - 1))) !== 0;
    }

    public onEnterNode(callback: (node: Node, data?: D) => void) {
        this.onEnterNodeCallbacks.push(callback);
    }
    public onLeaveNode(callback: (node: Node, data?: D) => void) {
        this.onLeaveNodeCallbacks.push(callback);
    }
}
export interface TemplateComponent {
    acceptNode(element: Element): boolean;
    walkthrough?(walker: Walker<Scope>, node: Node, data?: Scope): boolean;
    doWork?(context?: any): void;
}

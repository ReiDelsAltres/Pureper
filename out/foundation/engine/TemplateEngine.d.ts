import Scope from "./Scope.js";
export default class TemplateEngine {
    private readonly ref_component;
    private readonly set_component;
    private readonly on_component;
    private readonly injection_component;
    private readonly exp_component;
    private readonly for_component;
    private readonly if_component;
    private readonly components;
    readonly bindings: Map<Element, () => void>;
    private readonly onChangeCallbacks;
    processLogs: string[];
    static fullProcess(root: Node, scope: Scope): string[];
    static createHolder(markup: string, scope: Scope): TemplateHolder;
    private change;
    onChange(funct: () => void): void;
    fullProcess(root: Node, scope: Scope): void;
    fullCleanup(root: Node): void;
    private static transContentToShadow;
}
export declare class TemplateHolder {
    readonly engine: TemplateEngine;
    documentFragment: HTMLElement | DocumentFragment;
    constructor(engine: TemplateEngine, documentFragment: DocumentFragment);
    pushTo(element: HTMLElement | DocumentFragment): void;
}
export declare class Walker<D> {
    private onEnterNodeCallbacks;
    private onLeaveNodeCallbacks;
    private root?;
    filter?: (node: Node) => number;
    private walkerFunction?;
    private nodeFilter;
    constructor(root: Node, settings?: {
        nodeFilter?: number;
        filter?: (node: Node) => number;
        walkerFunction?: (walker: Walker<D>, node: Node, data?: D) => void;
    });
    walk(node?: Node, data?: D, walkerFunction?: (walker: Walker<D>, node: Node, data?: D) => void): void;
    private matchesMask;
    onEnterNode(callback: (node: Node, data?: D) => void): void;
    onLeaveNode(callback: (node: Node, data?: D) => void): void;
}
export interface TemplateComponent {
    acceptNode(element: Element): boolean;
    walkthrough?(walker: Walker<Scope>, node: Node, data?: Scope): boolean;
    doWork?(context?: any): void;
}
//# sourceMappingURL=TemplateEngine.d.ts.map
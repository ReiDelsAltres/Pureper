import Scope from "./Scope.js";
export default class TemplateEngine {
    static process(root: Node, onlyRoot?: boolean): Node[];
    static processFors(root: Node, scope: Scope): Scope;
    static processAttributes(root: Node, scope: Scope): Scope;
}
//# sourceMappingURL=TemplateEngine.d.ts.map
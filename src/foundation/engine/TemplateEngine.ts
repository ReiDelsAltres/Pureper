import Expression from "./Expression.js";
import Scope from "./Scope.js";

export default class TemplateEngine {
    public static process(root: Node, onlyRoot: boolean = false): Node[] {
        let elements: Node[] = [];
        const walker = document.createTreeWalker(
            root,
            NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT,
        );
        if (onlyRoot) {
            walker.nextNode();
            while (walker.nextSibling()) {
                const node = walker.currentNode;
                elements.push(node);
            }
        } else {
            while (walker.nextNode()) {
                const node = walker.currentNode;
                elements.push(node);
            }
        }
        return elements;
    }
    public static processFors(root: Node, scope: Scope): Scope {
        const walker = document.createTreeWalker(
            root,
            NodeFilter.SHOW_TEXT,
        );


        let leftCircleBracketCount = 0;
        let rightCircleBracketCount = 0;
        while (walker.nextNode()) {
            const node = walker.currentNode;
            if (node.textContent?.includes("@for(")) {
                leftCircleBracketCount = 1;
                rightCircleBracketCount = 0;
            }
            if (node.textContent?.includes("(")) leftCircleBracketCount++;
            if (node.textContent?.includes(")")) rightCircleBracketCount++;
            if (leftCircleBracketCount > 0 && leftCircleBracketCount === rightCircleBracketCount) {

            }
        }
        return scope;
    }
    public static processAttributes(root: Node, scope: Scope): Scope {
        const walker = document.createTreeWalker(
            root,
            NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT,
        );

        while (walker.nextNode()) {
            const node = walker.currentNode;
            if (node.nodeType === Node.ELEMENT_NODE) {
                const element = node as Element;
                if (element.hasAttribute("ref")) scope.set(element.getAttribute("ref")!, element);
                [...element.attributes].filter(a => /^on/.test(a.name)).forEach(attr => {
                    const eventName = attr.name.substring(2);
                    const expr = new Expression(attr.value);
                    element.addEventListener(eventName, (e) => {});
                });5
            }
        }
        return scope;
    }
}
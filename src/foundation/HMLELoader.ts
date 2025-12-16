interface AttributeRule {
    pattern: RegExp;
}
class Scope {
}
export default class HMLELoader {
    public providedScope?: Scope | {};

    public HMLELoader(scope: Scope | {}) {
        this.providedScope = scope;
    }

    public async loadFromString(hmle: string): Promise<DocumentFragment> {
        const template = document.createElement('template');
        template.innerHTML = hmle;
        return template.content;
    }
}
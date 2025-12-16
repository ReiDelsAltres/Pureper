class Scope {
}
export default class HMLELoader {
    providedScope;
    HMLELoader(scope) {
        this.providedScope = scope;
    }
    async loadFromString(hmle) {
        const template = document.createElement('template');
        template.innerHTML = hmle;
        return template.content;
    }
}
//# sourceMappingURL=HMLELoader.js.map
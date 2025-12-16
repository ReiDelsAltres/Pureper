declare class Scope {
}
export default class HMLELoader {
    providedScope?: Scope | {};
    HMLELoader(scope: Scope | {}): void;
    loadFromString(hmle: string): Promise<DocumentFragment>;
}
export {};
//# sourceMappingURL=HMLELoader.d.ts.map
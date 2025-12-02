import UniHtml from "./component_api/UniHtml.js";
import { AnyConstructor } from "./component_api/mixin/Proto.js";
export default class Triplet<T extends UniHtml> implements ITriplet {
    private uni?;
    private readonly access;
    readonly markup?: string;
    readonly css?: string;
    readonly js?: string;
    readonly additionalFiles: Map<string, string>;
    constructor(builder: TripletBuilder<T>);
    init(): Promise<boolean>;
    cache(): Promise<void>;
    private createLink;
    register(type: "router" | "markup", name: string): Promise<boolean>;
    private createInjectedClass;
}
interface ITriplet {
    readonly markup?: string;
    readonly css?: string;
    readonly js?: string;
}
export declare enum AccessType {
    NONE = 0,
    OFFLINE = 1,
    ONLINE = 2,
    BOTH = 3
}
export declare class TripletBuilder<T extends UniHtml> implements ITriplet {
    readonly markup?: string;
    readonly css?: string;
    readonly js?: string;
    uni?: AnyConstructor<UniHtml>;
    access: AccessType;
    readonly additionalFiles: Map<string, string>;
    private constructor();
    static create<T extends UniHtml>(markup?: string, css?: string, js?: string): TripletBuilder<T>;
    withUni(cls: AnyConstructor<UniHtml>): TripletBuilder<T>;
    withAccess(access: AccessType): TripletBuilder<T>;
    withLightDOMCss(css: string): TripletBuilder<T>;
    build(): Triplet<T>;
}
export {};
//# sourceMappingURL=Triplet.d.ts.map
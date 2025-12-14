import UniHtml from "./component_api/UniHtml.js";
import { AnyConstructor } from "./component_api/mixin/Proto.js";
export declare enum AccessType {
    NONE = 0,
    OFFLINE = 1,
    ONLINE = 2,
    BOTH = 3
}
export type TripletStruct = {
    markupURL?: string;
    markup?: string;
    cssURL?: string;
    css?: string;
    ltCssURL?: string;
    ltCss?: string;
    jsURL?: string;
    access?: AccessType;
    class?: AnyConstructor<UniHtml>;
};
export default class Triplet {
    readonly markup?: Promise<string>;
    readonly css?: Promise<string>;
    readonly lightCss?: Promise<string>;
    readonly js?: Promise<string>;
    private readonly markupURL?;
    private readonly cssURL?;
    private readonly ltCssURL?;
    private readonly jsURL?;
    private readonly access;
    private uni?;
    constructor(struct: TripletStruct);
    init(): Promise<boolean>;
    cache(): Promise<void>;
    register(type: "router" | "markup", name: string): Promise<boolean>;
    private createInjectedClass;
}
//# sourceMappingURL=Triplet.d.ts.map
import Triplet, { AccessType } from "./Triplet.js";
import UniHtml from "./component_api/UniHtml.js";
export declare function getRegisteredTriplets(): Array<{
    triplet: Triplet<UniHtml>;
    type: "router" | "markup";
    name: string;
}>;
export declare function initializeAllTriplets(): Promise<void>;
export declare function ReComponent(html?: string, css?: string, js?: string, access?: AccessType, name?: string): (ctor: Function) => void;
export declare function RePage(html?: string, css?: string, js?: string, access?: AccessType, path?: string): (ctor: Function) => void;
//# sourceMappingURL=TripletDecorator.d.ts.map
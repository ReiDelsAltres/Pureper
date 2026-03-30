import { TripletStruct } from "./Triplet.js";
export declare function ReComponent(settings: TripletStruct, tag: string): (ctor: Function) => void;
export declare function RePage(settings: TripletStruct, route: string): (ctor: Function) => void;
/**
 * Register an alternative implementation for an existing placeholder.
 *
 * ```ts
 * @ReImplementation({ markupURL: './Fancy.hmle', cssURL: './Fancy.css' }, "re-button")
 * class FancyButton extends Component { ... }
 *
 * // Then switch: Placeholder.switchTo("re-button", "FancyButton");
 * ```
 */
export declare function ReImplementation(settings: TripletStruct, target: string): (ctor: Function) => void;
//# sourceMappingURL=TripletDecorator.d.ts.map
import IElementHolder from "../api/ElementHolder.js";
import UniHtml from "../component_api/UniHtml.js";
import { Mixined } from "./mixin/Proto.js";
export default interface Component extends Mixined, HTMLElement, UniHtml {
}
declare const Component_base: {
    new (...args: any[]): {};
} & {
    new (): HTMLElement;
    prototype: HTMLElement;
};
export default class Component extends Component_base implements IUniHtmlComponent {
    private _attributeChangedCallbacks?;
    constructor();
    onConnected(): void;
    onDisconnected(): void;
    onMoved(): void;
    onAdopted(): void;
    onAttributeChanged(name: string, oldValue: any, newValue: any): void;
    onAttributeChangedCallback(callback: (name: string, oldValue: any, newValue: any) => void): void;
    /**
     * @deprecated Use onConnected instead.
     */
    private connectedCallback;
    protected render(element: IElementHolder, renderTarget: HTMLElement | ShadowRoot): Promise<void>;
    /**
     * @deprecated Use onDisconnected instead.
     */
    private disconnectedCallback;
    /**
     * @deprecated Use onMoved instead.
     */
    private connectedMoveCallback;
    /**
     * @deprecated Use onAdopted instead.
     */
    private adoptedCallback;
    /**
     * @deprecated Use onAttributeChanged instead.
     */
    private attributeChangedCallback;
}
export interface IUniHtmlComponent {
    onConnected(): void;
    onDisconnected(): void;
    onMoved(): void;
    onAdopted(): void;
    onAttributeChanged(name: string, oldValue: any, newValue: any): void;
}
export interface IUniHtmlVanillaComponent {
    connectedCallback(): void;
    disconnectedCallback(): void;
    connectedMoveCallback(): void;
    adoptedCallback(): void;
    attributeChangedCallback(name: string, oldValue: any, newValue: any): void;
}
export {};
//# sourceMappingURL=Component.d.ts.map
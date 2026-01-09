import IElementHolder from "../api/ElementHolder.js";
import UniHtml from "../component_api/UniHtml.js";
import Attribute from "./Attribute.js";
import { Class, Mixined } from "./mixin/Proto.js";

export default interface Component extends Mixined, HTMLElement, UniHtml { }
export default class Component extends Class(HTMLElement).extend(UniHtml).build() implements IUniHtmlComponent {
    private _attributes: Attribute[] = [];

    private _attributeChangedCallbacks?: ((name: string, oldValue: any, newValue: any) => void)[];
    constructor() {
        super();
    }

    onConnected(): void {
    }

    onDisconnected(): void {
    }

    onMoved(): void {
    }

    onAdopted(): void {
    }


    onAttributeChanged(name: string, oldValue: any, newValue: any): void {
    }

    onAttributeChangedCallback(callback: (name: string, oldValue: any, newValue: any) => void): void {
        this._attributeChangedCallbacks = this._attributeChangedCallbacks ?? [];
        this._attributeChangedCallbacks.push(callback);
    }

    /**
     * @deprecated Use onConnected instead.
     */
    private connectedCallback(): void {
        this.attachShadow({ mode: 'open' });

        for (const attr of this._attributes) {
            const vv = this.getAttribute(attr.name);
            if (vv === null || vv === "") {
                if (this.hasAttribute(attr.name)) {
                    (attr as any).initialize(true);
                } else {
                    (attr as any).initialize(null);
                }
                continue;
            }
            (attr as any).initialize(vv as any);
        }

        this.onConnected();

        this.load(this.shadowRoot);
    }
    protected render(element: IElementHolder, renderTarget: HTMLElement | ShadowRoot): Promise<void> {
        (this.getMixin(UniHtml)?.instance.get() as any).render(element, renderTarget);
        //super.render(element, renderTarget);
        //this.shadowRoot!.appendChild(renderTarget);
        return Promise.resolve();
    }
    /**
     * @deprecated Use onDisconnected instead.
     */
    private disconnectedCallback(): void {
        this.onDisconnected();
    }
    /**
     * @deprecated Use onMoved instead.
     */
    private connectedMoveCallback(): void {
        this.onMoved();
    }
    /**
     * @deprecated Use onAdopted instead.
     */
    private adoptedCallback(): void {
        this.onAdopted();
    }
    /**
     * @deprecated Use onAttributeChanged instead.
     */
    private attributeChangedCallback(name: string, oldValue: any, newValue: any): void {
        this.onAttributeChanged(name, oldValue, newValue);
        this._attributeChangedCallbacks?.forEach(cb => cb(name, oldValue, newValue));
    }
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
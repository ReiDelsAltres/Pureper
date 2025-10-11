
/**
 * Abstract base class for HTML components in Pureper SPA.
 * Provides a unified lifecycle: init → preLoadJS → render → postLoadJS.
 * Use static factory methods to create instances from an HTML file or string.
 * Designed to replace legacy Page and Component base classes.
 */
import IElementHolder from "../api/ElementHolder.js";
import { EmptyConstructor } from "../api/EmptyConstructor.js";
import Fetcher from "../Fetcher.js";


/**
 * Universal SPA component base for pages and elements.
 * Use static factory methods for instantiation.
 */
export default class UniHtml extends HTMLElement {
    /**
     * Protected constructor. Use static factory methods to instantiate.
     */
    public constructor() {
        super();
    }

    /**
     * Unified component lifecycle entrypoint.
     * Loads HTML, then calls preLoadJS, render, and postLoadJS hooks in order.
     * @param element Target container (usually shadowRoot.host)
     */
    public async load(element: HTMLElement) {
        const preHtml: string = await this.init();
        const html: string = await this._postInit(preHtml);

        const localRoot = document.createElement('div');
        localRoot.innerHTML = html;

        const holder : IElementHolder = { element: localRoot };

        // ВАЖНО: preLoad() вызывается ДО монтирования в DOM/Shadow DOM.
        // Для компонентов (UniHtmlComponent) на этом этапе ещё нельзя полагаться на this.shadowRoot —
        // используйте переданный localRoot для подготовки DOM, данных и навешивания обработчиков.
        // Это предпочтительный этап инициализации для компонентов.
        await this.preLoad(holder);
        // render() отвечает за помещение содержимого из localRoot в конечную цель (renderTarget).
        // В UniHtmlComponent.render() после вызова базового render() происходит добавление wrapper в shadowRoot.
        await this.render(holder, element);
        // postLoad() вызывается ПОСЛЕ render(). Для компонентов к этому моменту содержимое уже добавлено
        // внутрь shadowRoot, и можно безопасно работать с this.shadowRoot, измерениями layout и т.п.
        await this.postLoad(holder);
    }

    private async _postInit(html: string): Promise<string> {
        return Promise.resolve(html);
    }

    /**
     * Component initialization (HTML loading).
     * Overridden by factory methods or subclasses.
     * @returns HTML content for rendering
     * @throws Error if not implemented
     */
    private async init(): Promise<string> {
        throw new Error("Method not implemented.");
    }
    /**
     * Hook before rendering (e.g., data preparation).
     * Для компонентов вызывается до появления содержимого в Shadow DOM, this.shadowRoot может быть недоступен.
     * РЕКОМЕНДАЦИЯ: предпочитайте выполнять основную подготовку, поиск элементов, навешивание обработчиков
     * на узлы из localRoot именно здесь; затем render() вставит их в целевой контейнер/теневой DOM.
     */
    protected async preLoad(holder : IElementHolder) { }
    /**
     * Hook after rendering (e.g., event binding).
     * Для компонентов вызывается после того, как содержимое вставлено в shadowRoot (см. UniHtmlComponent.render()).
     * Используйте этот этап только когда необходим доступ к реально смонтированному DOM (layout/measurements,
     * интеграции, требующие присутствия в документе). В остальных случаях предпочитайте preLoad().
     */
    protected async postLoad(holder: IElementHolder) { }
    /**
     * Main rendering step. By default, simply inserts HTML into the container.
     * Override in subclasses for custom rendering logic.
     * @param element Target container
     * @param html HTML content
     */
    protected async render(holder: IElementHolder, renderTarget: HTMLElement): Promise<void> {
        renderTarget.innerHTML = holder.element.innerHTML;
        (holder as any).element = this;
        return Promise.resolve();
    }
}
export abstract class UniHtmlComponent extends UniHtml implements IUniHtmlComponent {
    private _attributeChangedCallbacks?: ((name: string, oldValue: any, newValue: any) => void)[];

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
        const wrapper = document.createElement('div');

        this.onConnected();
        
        this.load(wrapper);
    }
    protected render(element: IElementHolder, renderTarget: HTMLElement): Promise<void> {
        super.render(element, renderTarget);
        this.shadowRoot!.appendChild(renderTarget);
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


export type UniHtmlCompleted<T extends UniHtml> = T & IUniHtmlHolder;

interface IUniHtmlHolder {
    filePath: string;
    html: string;
}

interface IUniHtmlComponent {
    onConnected(): void;
    onDisconnected(): void;
    onMoved(): void;
    onAdopted(): void;

    onAttributeChanged(name: string, oldValue: any, newValue: any): void;
}

interface IUniHtmlVanillaComponent {
    connectedCallback(): void;
    disconnectedCallback(): void;
    connectedMoveCallback(): void;
    adoptedCallback(): void;

    attributeChangedCallback(name: string, oldValue: any, newValue: any): void;
}

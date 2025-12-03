
/**
 * Abstract base class for HTML components in Pureper SPA.
 * Provides a unified lifecycle: init → preLoadJS → render → postLoadJS.
 * Use static factory methods to create instances from an HTML file or string.
 * Designed to replace legacy Page and Component base classes.
 */
import IElementHolder from "../api/ElementHolder.js";


/**
 * Universal SPA component base for pages and elements.
 * Use static factory methods for instantiation.
 */
export default class UniHtml {
    /**
     * Unified component lifecycle entrypoint.
     * Loads HTML, then calls preLoadJS, render, and postLoadJS hooks in order.
     * @param element Target container (usually shadowRoot.host)
     */
    public async load(element: HTMLElement | ShadowRoot): Promise<void> {;
        await this.preInit();
        const preHtml: string = await this._init();
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
        throw new Error("Method not implemented.");
    }
    private async _init(): Promise<string> {
        throw new Error("Method not implemented.");
    }

    protected async preInit(): Promise<void> {}
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
    protected async render(holder: IElementHolder, renderTarget: HTMLElement | ShadowRoot): Promise<void> {
        while (renderTarget.firstChild) {
            renderTarget.removeChild(renderTarget.firstChild);
        }

        const children = Array.from(holder.element.childNodes);
        for (const child of children) {
            renderTarget.appendChild(child);
        }
        
        (holder as any).element = this;
        return Promise.resolve();
    }
}

import Observable from "../api/Observer.js";
import { TemplateHolder } from "../engine/TemplateEngine.js";


/**
 * Universal SPA component base for pages and elements.
 * Use static factory methods for instantiation.
 */
export default class UniHtml {
    public _status: Observable<"constructed" | "loading" | "ready"> = new Observable("constructed");

    /**
     * Unified component lifecycle entrypoint.
     * Loads HTML, then calls preLoadJS, render, and postLoadJS hooks in order.
     * @param element Target container (usually shadowRoot.host)
     */
    public async load(element: HTMLElement | ShadowRoot): Promise<void> {
        this._status.setObject("loading");
        await this.preInit();

        const preHtml: TemplateHolder = await this._init();
        const html: TemplateHolder = await this._postInit(preHtml);

        // ВАЖНО: preLoad() вызывается ДО монтирования в DOM/Shadow DOM.
        // Для компонентов (UniHtmlComponent) на этом этапе ещё нельзя полагаться на this.shadowRoot —
        // используйте переданный localRoot для подготовки DOM, данных и навешивания обработчиков.
        // Это предпочтительный этап инициализации для компонентов.
        await this.preLoad(html);
        // render() отвечает за помещение содержимого из localRoot в конечную цель (renderTarget).
        // В UniHtmlComponent.render() после вызова базового render() происходит добавление wrapper в shadowRoot.
        await this.render(html, element);
        // postLoad() вызывается ПОСЛЕ render(). Для компонентов к этому моменту содержимое уже добавлено
        // внутрь shadowRoot, и можно безопасно работать с this.shadowRoot, измерениями layout и т.п.
        await this.postLoad(html);
        this._status.setObject("ready");
    }

    private async _postInit(html: TemplateHolder): Promise<TemplateHolder> {
        throw new Error("Method not implemented.");
    }
    private async _init(): Promise<TemplateHolder> {
        throw new Error("Method not implemented.");
    }

    protected async preInit(): Promise<void> { }
    /**
     * Hook before rendering (e.g., data preparation).
     * Для компонентов вызывается до появления содержимого в Shadow DOM, this.shadowRoot может быть недоступен.
     * РЕКОМЕНДАЦИЯ: предпочитайте выполнять основную подготовку, поиск элементов, навешивание обработчиков
     * на узлы из localRoot именно здесь; затем render() вставит их в целевой контейнер/теневой DOM.
     */
    protected async preLoad(holder: TemplateHolder) { }
    /**
     * Hook after rendering (e.g., event binding).
     * Для компонентов вызывается после того, как содержимое вставлено в shadowRoot (см. UniHtmlComponent.render()).
     * Используйте этот этап только когда необходим доступ к реально смонтированному DOM (layout/measurements,
     * интеграции, требующие присутствия в документе). В остальных случаях предпочитайте preLoad().
     */
    protected async postLoad(holder: TemplateHolder) { }
    /**
     * Main rendering step. By default, simply inserts HTML into the container.
     * Override in subclasses for custom rendering logic.
     * @param element Target container
     * @param html HTML content
     */
    protected async render(holder: TemplateHolder, renderTarget: HTMLElement | DocumentFragment): Promise<void> {
        while (renderTarget.firstChild) {
            renderTarget.removeChild(renderTarget.firstChild);
        }

        const promises: Promise<void>[] = [];
        const childrens = holder.documentFragment.childNodes;
        for (const child of childrens) {
            const promise = new Promise<void>((resolve) => {
                if ((child instanceof UniHtml) && child._status.getObject() === "ready")
                    return resolve();

                const handler = (e) => {
                    if (e.detail.status === "ready") {
                        child.removeEventListener("status-change", handler);
                        resolve();
                    }
                };
                child.addEventListener("status-change", (e) => handler(e));
            });
            promises.push(promise);
        }

        holder.pushTo(renderTarget);

        return Promise.all(promises).then(() => { return; });
    }

    public async dispose(): Promise<void> { }
}

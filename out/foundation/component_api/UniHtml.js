import Observable from "../api/Observer.js";
/**
 * Universal SPA component base for pages and elements.
 * Use static factory methods for instantiation.
 */
export default class UniHtml {
    _status = new Observable("constructed");
    /**
     * Unified component lifecycle entrypoint.
     * Loads HTML, then calls preLoadJS, render, and postLoadJS hooks in order.
     * @param element Target container (usually shadowRoot.host)
     */
    async load(element) {
        this._status.setObject("loading");
        await this.preInit();
        const preHtml = await this._init();
        const html = await this._postInit(preHtml);
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
    async _postInit(html) {
        throw new Error("Method not implemented.");
    }
    async _init() {
        throw new Error("Method not implemented.");
    }
    async preInit() { }
    /**
     * Hook before rendering (e.g., data preparation).
     * Для компонентов вызывается до появления содержимого в Shadow DOM, this.shadowRoot может быть недоступен.
     * РЕКОМЕНДАЦИЯ: предпочитайте выполнять основную подготовку, поиск элементов, навешивание обработчиков
     * на узлы из localRoot именно здесь; затем render() вставит их в целевой контейнер/теневой DOM.
     */
    async preLoad(holder) { }
    /**
     * Hook after rendering (e.g., event binding).
     * Для компонентов вызывается после того, как содержимое вставлено в shadowRoot (см. UniHtmlComponent.render()).
     * Используйте этот этап только когда необходим доступ к реально смонтированному DOM (layout/measurements,
     * интеграции, требующие присутствия в документе). В остальных случаях предпочитайте preLoad().
     */
    async postLoad(holder) { }
    /**
     * Main rendering step. By default, simply inserts HTML into the container.
     * Override in subclasses for custom rendering logic.
     * @param element Target container
     * @param html HTML content
     */
    async render(holder, renderTarget) {
        while (renderTarget.firstChild) {
            renderTarget.removeChild(renderTarget.firstChild);
        }
        const promises = [];
        const childrens = holder.documentFragment.childNodes;
        for (const child of childrens) {
            const promise = new Promise((resolve) => {
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
    async dispose() { }
}
//# sourceMappingURL=UniHtml.js.map
import Observable from "../api/Observer.js";
import { TemplateHolder } from "../engine/TemplateEngine.js";
/**
 * Universal SPA component base for pages and elements.
 * Use static factory methods for instantiation.
 */
export default class UniHtml {
    _status: Observable<"constructed" | "loading" | "ready">;
    /**
     * Unified component lifecycle entrypoint.
     * Loads HTML, then calls preLoadJS, render, and postLoadJS hooks in order.
     * @param element Target container (usually shadowRoot.host)
     */
    load(element: HTMLElement | ShadowRoot): Promise<void>;
    private _postInit;
    private _init;
    protected preInit(): Promise<void>;
    /**
     * Hook before rendering (e.g., data preparation).
     * Для компонентов вызывается до появления содержимого в Shadow DOM, this.shadowRoot может быть недоступен.
     * РЕКОМЕНДАЦИЯ: предпочитайте выполнять основную подготовку, поиск элементов, навешивание обработчиков
     * на узлы из localRoot именно здесь; затем render() вставит их в целевой контейнер/теневой DOM.
     */
    protected preLoad(holder: TemplateHolder): Promise<void>;
    /**
     * Hook after rendering (e.g., event binding).
     * Для компонентов вызывается после того, как содержимое вставлено в shadowRoot (см. UniHtmlComponent.render()).
     * Используйте этот этап только когда необходим доступ к реально смонтированному DOM (layout/measurements,
     * интеграции, требующие присутствия в документе). В остальных случаях предпочитайте preLoad().
     */
    protected postLoad(holder: TemplateHolder): Promise<void>;
    /**
     * Main rendering step. By default, simply inserts HTML into the container.
     * Override in subclasses for custom rendering logic.
     * @param element Target container
     * @param html HTML content
     */
    protected render(holder: TemplateHolder, renderTarget: HTMLElement | DocumentFragment): Promise<void>;
    dispose(): Promise<void>;
}
//# sourceMappingURL=UniHtml.d.ts.map
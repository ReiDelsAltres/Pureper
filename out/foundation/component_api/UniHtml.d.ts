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
    protected preLoad(holder: IElementHolder): Promise<void>;
    /**
     * Hook after rendering (e.g., event binding).
     * Для компонентов вызывается после того, как содержимое вставлено в shadowRoot (см. UniHtmlComponent.render()).
     * Используйте этот этап только когда необходим доступ к реально смонтированному DOM (layout/measurements,
     * интеграции, требующие присутствия в документе). В остальных случаях предпочитайте preLoad().
     */
    protected postLoad(holder: IElementHolder): Promise<void>;
    /**
     * Main rendering step. By default, simply inserts HTML into the container.
     * Override in subclasses for custom rendering logic.
     * @param element Target container
     * @param html HTML content
     */
    protected render(holder: IElementHolder, renderTarget: HTMLElement | ShadowRoot): Promise<void>;
}
//# sourceMappingURL=UniHtml.d.ts.map
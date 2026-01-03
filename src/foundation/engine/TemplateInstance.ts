import Scope from './Scope.js';
import Observable, { MutationObserver } from '../api/Observer.js';
import Rule, { RuleMatch, RuleResult } from './Rule.js';
import Expression from './Expression.js';

/**
 * FragmentChangeEvent - событие изменения конкретного фрагмента
 */
export interface FragmentChangeEvent {
    fragmentId: string;
    oldNodes: Node[];
    newNodes: Node[];
    affectedObservables: Observable<any>[];
}

/**
 * TemplateSection - секция шаблона, связанная с Rule
 */
export interface TemplateSection {
    /** Rule который создал эту секцию */
    rule: Rule;
    /** Оригинальный match */
    match: RuleMatch;
    /** Текущий результат */
    result: RuleResult;
    /** Исходный шаблон секции (для пересоздания) */
    sourceTemplate: string;
    /** Дочерние секции */
    children: TemplateSection[];
    /** Observable подписки для отслеживания */
    subscriptions: Array<{ observable: Observable<any>; unsubscribe: () => void }>;
    /** ID фрагмента, к которому принадлежит секция */
    fragmentId?: string;
}

/**
 * FragmentBinding - привязка фрагмента
 */
export interface FragmentBinding {
    /** Уникальный ID фрагмента */
    id: string;
    /** Текущий HTML контент фрагмента (с placeholder-ами для дочерних) */
    html: string;
    /** Исходный шаблон (до обработки) */
    sourceTemplate: string;
    /** Секции, входящие в этот фрагмент */
    sections: TemplateSection[];
    /** Observable, от которых зависит фрагмент */
    observables: Set<Observable<any>>;
    /** ID родительского фрагмента (null для корневого) */
    parentId: string | null;
    /** ID дочерних фрагментов (placeholder-ы) */
    childIds: string[];
}

/**
 * ContainerBinding - привязка к DOM-контейнеру
 */
export interface ContainerBinding {
    /** DOM-контейнер */
    container: Element;
    /** Маркеры фрагментов в этом контейнере: fragmentId -> { start, end, nodes } */
    markers: Map<string, {
        startMarker: Comment;
        endMarker: Comment;
        nodes: Node[];
    }>;
    /** Функции отписки событий для этого контейнера */
    eventUnbinders: Array<() => void>;
}

/**
 * ObservableTracking - отслеживание Observable и связанных секций
 */
interface ObservableTracking {
    observable: Observable<any>;
    sections: Array<{
        section: TemplateSection;
        rebuild: (section: TemplateSection) => RuleResult;
    }>;
    /** ID фрагментов, зависящих от этого Observable */
    fragmentIds: Set<string>;
    unsubscribe: () => void;
}

/**
 * TemplateInstance - динамический шаблон страницы.
 * 
 * Поддерживает:
 * - Множество мелких фрагментов, каждый обновляется независимо
 * - Множество container bindings
 * - Автоматическое обновление DOM при изменении Observable
 * - bind/unbind для refs и events
 */
export default class TemplateInstance {
    private scope: Scope;
    private sections: TemplateSection[] = [];
    
    /** Все фрагменты шаблона */
    private fragments = new Map<string, FragmentBinding>();
    
    /** ID корневого фрагмента */
    private rootFragmentId: string | null = null;
    
    /** Счётчик для генерации ID фрагментов */
    private fragmentIdCounter = 0;
    
    /** Observers for fragment changes */
    private fragmentChangeObserver = new MutationObserver<FragmentChangeEvent>();
    
    /** Группировка секций по Observable */
    private observableTrackings = new Map<Observable<any>, ObservableTracking>();
    
    /** Привязки к контейнерам */
    private containerBindings = new Map<Element, ContainerBinding>();

    constructor(scope: Scope) {
        this.scope = scope;
    }

    // ========================================
    // Public API - Getters
    // ========================================

    /**
     * Получить Scope
     */
    public getScope(): Scope {
        return this.scope;
    }

    /**
     * Получить все секции
     */
    public getSections(): TemplateSection[] {
        return this.sections;
    }

    /**
     * Получить все фрагменты
     */
    public getAllFragments(): Map<string, FragmentBinding> {
        return this.fragments;
    }

    /**
     * Получить фрагмент по ID
     */
    public getFragmentBinding(id: string): FragmentBinding | undefined {
        return this.fragments.get(id);
    }

    /**
     * Получить финальный HTML (собранный из всех фрагментов)
     */
    public getTemplate(): string {
        if (!this.rootFragmentId) return '';
        return this.buildHtmlFromFragment(this.rootFragmentId);
    }

    // ========================================
    // Public API - Fragment Management
    // ========================================

    /**
     * Создать новый фрагмент и вернуть его ID
     */
    public createFragment(
        html: string,
        sourceTemplate: string,
        sections: TemplateSection[] = [],
        parentId: string | null = null
    ): string {
        const id = `f${this.fragmentIdCounter++}`;
        
        const binding: FragmentBinding = {
            id,
            html,
            sourceTemplate,
            sections,
            observables: new Set(),
            parentId,
            childIds: []
        };
        
        // Привязываем секции к фрагменту
        for (const section of sections) {
            section.fragmentId = id;
        }
        
        this.fragments.set(id, binding);
        
        // Если нет корневого фрагмента, это первый
        if (this.rootFragmentId === null) {
            this.rootFragmentId = id;
        }
        
        // Добавляем в дочерние родителя
        if (parentId) {
            const parent = this.fragments.get(parentId);
            if (parent) {
                parent.childIds.push(id);
            }
        }
        
        return id;
    }

    /**
     * Установить корневой фрагмент
     */
    public setRootFragment(id: string): void {
        this.rootFragmentId = id;
    }

    /**
     * Добавить секцию шаблона
     */
    public addSection(section: TemplateSection): void {
        this.sections.push(section);
    }

    /**
     * Вставить добавленный фрагмент во все привязанные контейнеры.
     * Вызывается после appendTemplate.
     */
    public insertAppendedFragment(fragmentId: string): void {
        const fragment = this.fragments.get(fragmentId);
        if (!fragment) return;
        
        for (const [container, binding] of this.containerBindings) {
            // Вставляем фрагмент в конец контейнера
            this.insertFragmentRecursive(fragmentId, container, binding);
            
            // Привязываем refs, events и injections для новых элементов
            this.bindRefsForContainer(container);
            this.processInjectionsForContainer(container);
            this.bindEventsForNewFragment(fragmentId, binding);
        }
    }

    /**
     * Привязать события только для нового фрагмента
     */
    private bindEventsForNewFragment(fragmentId: string, binding: ContainerBinding): void {
        const markerInfo = binding.markers.get(fragmentId);
        if (!markerInfo) return;
        
        for (const node of markerInfo.nodes) {
            if (node instanceof Element) {
                const unbinders = this.bindEventsToElement(node);
                binding.eventUnbinders.push(...unbinders);
                
                const children = node.querySelectorAll('*');
                for (const child of Array.from(children)) {
                    const childUnbinders = this.bindEventsToElement(child);
                    binding.eventUnbinders.push(...childUnbinders);
                }
            }
        }
    }

    // ========================================
    // Public API - Events
    // ========================================

    /**
     * Подписаться на изменения фрагментов
     */
    public onFragmentChange(listener: (event: FragmentChangeEvent) => void): () => void {
        const wrapper = (_oldEvent: FragmentChangeEvent, newEvent: FragmentChangeEvent) => {
            listener(newEvent);
        };
        this.fragmentChangeObserver.subscribe(wrapper);
        return () => this.fragmentChangeObserver.unsubscribe(wrapper);
    }

    // ========================================
    // Public API - Observable Tracking
    // ========================================

    /**
     * Подписаться на Observable и автоматически пересоздавать секцию
     */
    public trackObservable(
        observable: Observable<any>,
        section: TemplateSection,
        rebuild: (section: TemplateSection) => RuleResult
    ): () => void {
        let tracking = this.observableTrackings.get(observable);
        
        if (!tracking) {
            const listener = (_newValue: any) => {
                this.rebuildFragmentsForObservable(observable);
            };
            
            observable.subscribe(listener);
            
            tracking = {
                observable,
                sections: [],
                fragmentIds: new Set(),
                unsubscribe: () => observable.unsubscribe(listener)
            };
            
            this.observableTrackings.set(observable, tracking);
        }
        
        tracking.sections.push({ section, rebuild });
        
        if (section.fragmentId) {
            tracking.fragmentIds.add(section.fragmentId);
            const binding = this.fragments.get(section.fragmentId);
            if (binding) {
                binding.observables.add(observable);
            }
        }
        
        return () => {
            if (tracking) {
                tracking.sections = tracking.sections.filter(s => s.section !== section);
                if (tracking.sections.length === 0) {
                    tracking.unsubscribe();
                    this.observableTrackings.delete(observable);
                }
            }
        };
    }

    // ========================================
    // Public API - Container Binding
    // ========================================

    /**
     * Привязать к контейнеру.
     * Вставляет DOM, вызывает bindRefs, processInjections и bindEvents.
     */
    public bind(container: Element): void {
        if (this.containerBindings.has(container)) {
            console.warn('[TemplateInstance] Container already bound');
            return;
        }
        
        const binding: ContainerBinding = {
            container,
            markers: new Map(),
            eventUnbinders: []
        };
        
        this.containerBindings.set(container, binding);
        
        // Вставляем DOM с маркерами
        this.insertFragmentsIntoContainer(container, binding);
        
        // Привязываем refs, обрабатываем injections, привязываем events
        this.bindRefsForContainer(container);
        this.processInjectionsForContainer(container);
        this.bindEventsForContainer(container, binding);
    }

    /**
     * Отвязать от контейнера.
     * Отвязывает refs и events, но оставляет DOM.
     */
    public unbind(container: Element): void {
        const binding = this.containerBindings.get(container);
        if (!binding) {
            console.warn('[TemplateInstance] Container not bound');
            return;
        }
        
        // Отвязываем события для этого контейнера
        for (const unbind of binding.eventUnbinders) {
            unbind();
        }
        binding.eventUnbinders = [];
        
        // Отвязываем refs
        this.unbindRefsForContainer(container);
        
        // Удаляем binding
        this.containerBindings.delete(container);
    }

    /**
     * Привязать refs к элементам.
     * Если есть контейнеры - привязывает для них.
     * Если нет - создаёт временный DocumentFragment и привязывает refs из него.
     */
    public bindRefs(): void {
        if (this.containerBindings.size > 0) {
            for (const [container] of this.containerBindings) {
                this.bindRefsForContainer(container);
            }
        } else {
            // Нет контейнеров - создаём временный fragment
            const fragment = this.createDOMFragment();
            this.bindRefsForFragment(fragment);
        }
    }
    
    /**
     * Привязать refs из DocumentFragment (без контейнера)
     */
    private bindRefsForFragment(fragment: DocumentFragment): void {
        const refElements = fragment.querySelectorAll('[data-ref]');
        
        for (const element of Array.from(refElements)) {
            const refName = element.getAttribute('data-ref');
            if (refName) {
                this.scope.set(refName, element);
            }
        }
    }

    /**
     * Отвязать refs (для всех контейнеров)
     */
    public unbindRefs(): void {
        for (const section of this.sections) {
            if (section.rule.name === 'ref' && section.result.data?.refName) {
                const refName = section.result.data.refName;
                if (this.scope.has(refName)) {
                    this.scope.set(refName, null);
                }
            }
        }
    }

    /**
     * Привязать события (для всех контейнеров)
     */
    public bindEvents(): void {
        for (const [container, binding] of this.containerBindings) {
            this.bindEventsForContainer(container, binding);
        }
    }

    /**
     * Отвязать события (для всех контейнеров)
     */
    public unbindEvents(): void {
        for (const [_, binding] of this.containerBindings) {
            for (const unbind of binding.eventUnbinders) {
                unbind();
            }
            binding.eventUnbinders = [];
        }
    }

    /**
     * Очистить все подписки и bindings
     */
    public dispose(): void {
        // Отвязываем все контейнеры
        for (const [container] of this.containerBindings) {
            this.unbind(container);
        }
        
        // Отписываемся от всех Observable
        for (const tracking of this.observableTrackings.values()) {
            tracking.unsubscribe();
        }
        this.observableTrackings.clear();
        
        // Очищаем секции
        for (const section of this.sections) {
            this.unsubscribeSection(section);
        }
        this.sections = [];
        
        // Очищаем фрагменты
        this.fragments.clear();
        this.rootFragmentId = null;
    }

    // ========================================
    // Private - DOM Operations
    // ========================================

    /**
     * Вставить все фрагменты в контейнер с маркерами
     */
    private insertFragmentsIntoContainer(container: Element, binding: ContainerBinding): void {
        if (!this.rootFragmentId) return;
        
        // Рекурсивно вставляем фрагменты
        this.insertFragmentRecursive(this.rootFragmentId, container, binding);
    }

    /**
     * Рекурсивно вставить фрагмент и его дочерние
     */
    private insertFragmentRecursive(
        fragmentId: string,
        parent: Element | DocumentFragment,
        containerBinding: ContainerBinding
    ): void {
        const fragment = this.fragments.get(fragmentId);
        if (!fragment) return;
        
        // Создаём маркеры
        const startMarker = document.createComment(`fragment:${fragmentId}`);
        const endMarker = document.createComment(`/fragment:${fragmentId}`);
        
        parent.appendChild(startMarker);
        
        // Парсим HTML и вставляем, заменяя placeholder-ы на дочерние фрагменты
        const nodes = this.createNodesFromHtml(fragment.html);
        const insertedNodes: Node[] = [];
        
        // Node.COMMENT_NODE = 8
        const COMMENT_NODE = 8;
        
        for (const node of nodes) {
            // Проверяем на placeholder комментарии
            if (node.nodeType === COMMENT_NODE) {
                const comment = node as Comment;
                const match = comment.data.match(/^placeholder:(.+)$/);
                if (match) {
                    const childId = match[1];
                    // Рекурсивно вставляем дочерний фрагмент
                    this.insertFragmentRecursive(childId, parent as Element, containerBinding);
                    continue;
                }
            }
            
            parent.appendChild(node);
            insertedNodes.push(node);
        }
        
        parent.appendChild(endMarker);
        
        // Сохраняем маркеры
        containerBinding.markers.set(fragmentId, {
            startMarker,
            endMarker,
            nodes: insertedNodes
        });
    }

    /**
     * Создать ноды из HTML строки
     */
    private createNodesFromHtml(html: string): Node[] {
        const template = document.createElement('template');
        template.innerHTML = html;
        return Array.from(template.content.childNodes);
    }

    /**
     * Собрать HTML из фрагмента (рекурсивно заменяя placeholder-ы)
     */
    private buildHtmlFromFragment(fragmentId: string): string {
        const fragment = this.fragments.get(fragmentId);
        if (!fragment) return '';
        
        let html = fragment.html;
        
        // Заменяем placeholder-ы на контент дочерних фрагментов
        for (const childId of fragment.childIds) {
            const placeholder = `<!--placeholder:${childId}-->`;
            const childHtml = this.buildHtmlFromFragment(childId);
            html = html.replace(placeholder, childHtml);
        }
        
        return html;
    }

    /**
     * Привязать refs для конкретного контейнера
     */
    private bindRefsForContainer(container: Element): void {
        const refElements = container.querySelectorAll('[data-ref]');
        
        for (const element of Array.from(refElements)) {
            const refName = element.getAttribute('data-ref');
            if (refName) {
                this.scope.set(refName, element);
            }
        }
    }

    /**
     * Обработать инжекции для конкретного контейнера.
     * Находит элементы с data-injection-* атрибутами и перемещает их в целевые элементы.
     */
    private processInjectionsForContainer(container: Element): void {
        const injectElements = container.querySelectorAll('[data-injection-type][data-injection-target]');

        for (const element of Array.from(injectElements)) {
            const type = element.getAttribute('data-injection-type') as 'head' | 'tail';
            const targetRefName = decodeURIComponent(element.getAttribute('data-injection-target') || '');

            if (!targetRefName) {
                // Нет target - удаляем элемент из DOM
                element.remove();
                continue;
            }

            // Получаем целевой элемент из scope
            const targetElement = this.scope.get(targetRefName);

            if (!targetElement || !(targetElement instanceof Element)) {
                // Target не найден - удаляем элемент из DOM
                element.remove();
                continue;
            }

            // Удаляем атрибуты инжекции
            element.removeAttribute('data-injection-type');
            element.removeAttribute('data-injection-target');

            // Выполняем инжекцию
            if (type === 'head') {
                targetElement.prepend(element);
            } else {
                targetElement.append(element);
            }
        }
    }

    /**
     * Отвязать refs для конкретного контейнера
     */
    private unbindRefsForContainer(_container: Element): void {
        // Устанавливаем все refs в null
        for (const section of this.sections) {
            if (section.rule.name === 'ref' && section.result.data?.refName) {
                const refName = section.result.data.refName;
                if (this.scope.has(refName)) {
                    this.scope.set(refName, null);
                }
            }
        }
    }

    /**
     * Привязать события для конкретного контейнера
     */
    private bindEventsForContainer(container: Element, binding: ContainerBinding): void {
        const allElements = container.querySelectorAll('*');
        
        for (const element of Array.from(allElements)) {
            const unbinders = this.bindEventsToElement(element);
            binding.eventUnbinders.push(...unbinders);
        }
    }

    /**
     * Привязать события к одному элементу
     */
    private bindEventsToElement(element: Element): Array<() => void> {
        const unbinders: Array<() => void> = [];
        const attributes = Array.from(element.attributes);
        
        for (const attr of attributes) {
            if (attr.name.startsWith('data-event-')) {
                const eventName = attr.name.slice('data-event-'.length);
                const exprCode = decodeURIComponent(attr.value);
                
                const handler = (event: Event) => {
                    const localScope = this.scope.createChild({ event });
                    const expr = new Expression(exprCode);
                    
                    try {
                        expr.execute(localScope);
                    } catch (error) {
                        console.error(`[TemplateInstance] Error executing handler for ${eventName}:`, error);
                    }
                };
                
                element.addEventListener(eventName, handler);
                unbinders.push(() => element.removeEventListener(eventName, handler));
            }
        }
        
        return unbinders;
    }

    // ========================================
    // Private - Observable Rebuild
    // ========================================

    /**
     * Перестроить фрагменты при изменении Observable
     */
    private rebuildFragmentsForObservable(observable: Observable<any>): void {
        const tracking = this.observableTrackings.get(observable);
        if (!tracking || tracking.sections.length === 0) return;

        // Собираем затронутые фрагменты
        const affectedFragmentIds = new Set<string>();
        
        // Перестраиваем секции и обновляем результаты
        for (const { section, rebuild } of tracking.sections) {
            this.unsubscribeSectionNested(section);
            
            const newResult = rebuild(section);
            section.result = newResult;
            
            if (section.fragmentId) {
                affectedFragmentIds.add(section.fragmentId);
            }
        }

        // Перестраиваем HTML затронутых фрагментов
        for (const fragmentId of affectedFragmentIds) {
            const fragment = this.fragments.get(fragmentId);
            if (!fragment) continue;
            
            // Собираем новый HTML из результатов всех секций фрагмента
            let newHtml = fragment.sourceTemplate;
            for (const section of fragment.sections) {
                // Заменяем исходный match на новый output
                newHtml = newHtml.replace(section.match.fullMatch, section.result.output);
            }
            fragment.html = newHtml;
        }

        // Обновляем DOM во всех контейнерах
        for (const fragmentId of affectedFragmentIds) {
            this.updateFragmentInAllContainers(fragmentId, observable);
        }
    }

    /**
     * Обновить фрагмент во всех контейнерах
     */
    private updateFragmentInAllContainers(fragmentId: string, observable: Observable<any>): void {
        const fragment = this.fragments.get(fragmentId);
        if (!fragment) return;

        for (const [container, binding] of this.containerBindings) {
            const markerInfo = binding.markers.get(fragmentId);
            if (!markerInfo) continue;

            const { startMarker, endMarker, nodes: oldNodes } = markerInfo;
            const parent = startMarker.parentNode;
            if (!parent) continue;

            // Отвязываем события от старых элементов
            this.unbindEventsFromNodes(oldNodes, binding);

            // Удаляем старые ноды (проверяем что node всё ещё child, т.к. injection мог переместить)
            for (const node of oldNodes) {
                if (node.parentNode === parent) {
                    parent.removeChild(node);
                }
            }

            // Создаём новые ноды
            const newNodes = this.createNodesFromHtml(fragment.html);
            const insertedNodes: Node[] = [];
            
            for (const node of newNodes) {
                parent.insertBefore(node, endMarker);
                insertedNodes.push(node);
            }

            // Сохраняем новые ноды
            markerInfo.nodes = insertedNodes;

            // Привязываем refs, обрабатываем injections и events к новым элементам
            this.bindRefsForContainer(container);
            this.processInjectionsForContainer(container);
            for (const node of insertedNodes) {
                if (node instanceof Element) {
                    const unbinders = this.bindEventsToElement(node);
                    binding.eventUnbinders.push(...unbinders);
                    
                    // И для всех дочерних
                    const children = node.querySelectorAll('*');
                    for (const child of Array.from(children)) {
                        const childUnbinders = this.bindEventsToElement(child);
                        binding.eventUnbinders.push(...childUnbinders);
                    }
                }
            }

            // Уведомляем об изменении
            this.fragmentChangeObserver.notify(
                { fragmentId, oldNodes, newNodes: insertedNodes, affectedObservables: [observable] },
                { fragmentId, oldNodes, newNodes: insertedNodes, affectedObservables: [observable] }
            );
        }
    }

    /**
     * Отвязать события от нод
     */
    private unbindEventsFromNodes(nodes: Node[], binding: ContainerBinding): void {
        // Простая реализация: очищаем все unbinders
        // В идеале нужно отслеживать какие unbinders к каким элементам относятся
        // Но для простоты пока так
        for (const unbind of binding.eventUnbinders) {
            unbind();
        }
        binding.eventUnbinders = [];
    }

    /**
     * Отписаться от вложенных Observable в секции
     */
    private unsubscribeSectionNested(section: TemplateSection): void {
        for (const sub of section.subscriptions) {
            sub.unsubscribe();
        }
        section.subscriptions = [];

        for (const child of section.children) {
            this.unsubscribeSectionNested(child);
        }
    }

    /**
     * Отписаться от всех Observable в секции
     */
    private unsubscribeSection(section: TemplateSection): void {
        for (const sub of section.subscriptions) {
            sub.unsubscribe();
        }
        section.subscriptions = [];

        for (const child of section.children) {
            this.unsubscribeSection(child);
        }
    }

    // ========================================
    // Legacy API (для обратной совместимости)
    // ========================================

    /**
     * @deprecated Используйте bind(container)
     */
    public createDOMFragment(): DocumentFragment {
        const html = this.getTemplate();
        const template = document.createElement('template');
        template.innerHTML = html;
        return template.content;
    }
}

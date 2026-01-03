import Scope from './Scope.js';
import Observable, { MutationObserver } from '../api/Observer.js';
import Rule, { RuleMatch, RuleResult } from './Rule.js';
import Expression from './Expression.js';

/**
 * TemplateChangeEvent - событие изменения шаблона
 */
export interface TemplateChangeEvent {
    oldValue: any;
    newValue: any;
    oldTemplate: string;
    newTemplate: string;
}

/**
 * FragmentChangeEvent - событие изменения конкретного фрагмента
 */
export interface FragmentChangeEvent {
    fragmentId: string;
    oldFragment: DocumentFragment | null;
    newFragment: DocumentFragment;
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
 * FragmentBinding - привязка фрагмента к DOM
 */
export interface FragmentBinding {
    /** Уникальный ID фрагмента */
    id: string;
    /** Текущий HTML контент фрагмента */
    html: string;
    /** Кэшированный DocumentFragment */
    fragment: DocumentFragment | null;
    /** Секции, входящие в этот фрагмент */
    sections: TemplateSection[];
    /** Observable, от которых зависит фрагмент */
    observables: Set<Observable<any>>;
    /** Начальный маркер в DOM (комментарий) */
    startMarker?: Comment;
    /** Конечный маркер в DOM (комментарий) */
    endMarker?: Comment;
    /** Текущие DOM ноды между маркерами */
    nodes: Node[];
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
 * PageTemplate - динамический шаблон страницы.
 * Хранит обработанные Rule и поддерживает реактивное обновление.
 * 
 * При изменении Observable обновляются только те фрагменты,
 * которые зависят от изменённого Observable.
 */
export default class TemplateInstance {
    private template: string;
    private scope: Scope;
    private sections: TemplateSection[] = [];
    
    /** Фрагменты шаблона (каждый обновляется независимо) */
    private fragments = new Map<string, FragmentBinding>();
    
    /** Счётчик для генерации ID фрагментов */
    private fragmentIdCounter = 0;
    
    /** Observers for template changes */
    private changeObserver = new MutationObserver<TemplateChangeEvent>();
    
    /** Observers for fragment changes */
    private fragmentChangeObserver = new MutationObserver<FragmentChangeEvent>();
    
    /** Группировка секций по Observable */
    private observableTrackings = new Map<Observable<any>, ObservableTracking>();
    
    /** Функции отписки от событий */
    private eventUnbinders: Array<() => void> = [];
    
    /** Кэшированный главный фрагмент */
    private cachedFragment: DocumentFragment | null = null;

    constructor(template: string, scope: Scope) {
        this.template = template;
        this.scope = scope;
    }

    /**
     * Получить текущий шаблон
     */
    public getTemplate(): string {
        return this.template;
    }

    /**
     * Установить новый шаблон (вызывает событие изменения)
     */
    public setTemplate(newTemplate: string): void {
        const oldTemplate = this.template;
        this.template = newTemplate;
        
        this.changeObserver.notify(
            { oldValue: null, newValue: null, oldTemplate, newTemplate },
            { oldValue: null, newValue: null, oldTemplate, newTemplate }
        );
    }

    /**
     * Получить Scope
     */
    public getScope(): Scope {
        return this.scope;
    }

    /**
     * Подписаться на изменения шаблона
     */
    public onTemplateChange(
        listener: (oldValue: any, newValue: any, oldTemplate: string, newTemplate: string) => void
    ): () => void {
        const wrapper = (oldEvent: TemplateChangeEvent, newEvent: TemplateChangeEvent) => {
            listener(newEvent.oldValue, newEvent.newValue, newEvent.oldTemplate, newEvent.newTemplate);
        };
        this.changeObserver.subscribe(wrapper);
        return () => this.changeObserver.unsubscribe(wrapper);
    }

    /**
     * Подписаться на изменения фрагментов
     */
    public onFragmentChange(
        listener: (event: FragmentChangeEvent) => void
    ): () => void {
        const wrapper = (_oldEvent: FragmentChangeEvent, newEvent: FragmentChangeEvent) => {
            listener(newEvent);
        };
        this.fragmentChangeObserver.subscribe(wrapper);
        return () => this.fragmentChangeObserver.unsubscribe(wrapper);
    }

    /**
     * Добавить секцию шаблона
     */
    public addSection(section: TemplateSection): void {
        this.sections.push(section);
    }

    /**
     * Получить все секции
     */
    public getSections(): TemplateSection[] {
        return this.sections;
    }

    /**
     * Создать новый фрагмент и вернуть его ID
     */
    public createFragmentBinding(html: string, sections: TemplateSection[] = []): string {
        const id = `fragment-${this.fragmentIdCounter++}`;
        
        const binding: FragmentBinding = {
            id,
            html,
            fragment: null,
            sections,
            observables: new Set(),
            nodes: []
        };
        
        // Привязываем секции к фрагменту
        for (const section of sections) {
            section.fragmentId = id;
        }
        
        this.fragments.set(id, binding);
        return id;
    }

    /**
     * Получить привязку фрагмента по ID
     */
    public getFragmentBinding(id: string): FragmentBinding | undefined {
        return this.fragments.get(id);
    }

    /**
     * Получить все фрагменты
     */
    public getAllFragments(): Map<string, FragmentBinding> {
        return this.fragments;
    }

    /**
     * Подписаться на Observable и автоматически пересоздавать секцию.
     * Обновляются только фрагменты, зависящие от изменённого Observable.
     */
    public trackObservable(
        observable: Observable<any>,
        section: TemplateSection,
        rebuild: (section: TemplateSection) => RuleResult
    ): () => void {
        // Проверяем, есть ли уже отслеживание для этого Observable
        let tracking = this.observableTrackings.get(observable);
        
        if (!tracking) {
            // Создаём новое отслеживание
            const listener = (newValue: any) => {
                this.rebuildFragmentsForObservable(observable, newValue);
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
        
        // Добавляем секцию в отслеживание
        tracking.sections.push({ section, rebuild });
        
        // Связываем Observable с фрагментом секции
        if (section.fragmentId) {
            tracking.fragmentIds.add(section.fragmentId);
            const binding = this.fragments.get(section.fragmentId);
            if (binding) {
                binding.observables.add(observable);
            }
        }
        
        // Возвращаем функцию отписки для этой конкретной секции
        return () => {
            if (tracking) {
                tracking.sections = tracking.sections.filter(s => s.section !== section);
                
                // Если больше нет секций, отписываемся от Observable
                if (tracking.sections.length === 0) {
                    tracking.unsubscribe();
                    this.observableTrackings.delete(observable);
                }
            }
        };
    }

    /**
     * Перестроить только те фрагменты, которые зависят от Observable
     */
    private rebuildFragmentsForObservable(observable: Observable<any>, newValue: any): void {
        const tracking = this.observableTrackings.get(observable);
        if (!tracking || tracking.sections.length === 0) return;

        const oldTemplate = this.template;
        let currentTemplate = this.template;

        // Собираем все замены: старый output -> новый output
        const replacements: Array<{ oldOutput: string; newOutput: string; section: TemplateSection }> = [];

        for (const { section, rebuild } of tracking.sections) {
            // Unsubscribe old nested observables
            this.unsubscribeSectionNested(section);
            
            // Rebuild section
            const newResult = rebuild(section);
            const oldOutput = section.result.output;
            
            replacements.push({
                oldOutput,
                newOutput: newResult.output,
                section
            });
            
            section.result = newResult;
        }

        // Применяем все замены к шаблону
        for (const { oldOutput, newOutput } of replacements) {
            currentTemplate = currentTemplate.replace(oldOutput, newOutput);
        }

        this.template = currentTemplate;

        // Обновляем только затронутые фрагменты
        const affectedFragmentIds = new Set<string>();
        for (const { section } of tracking.sections) {
            if (section.fragmentId) {
                affectedFragmentIds.add(section.fragmentId);
            }
        }

        // Пересоздаём только затронутые фрагменты
        for (const fragmentId of affectedFragmentIds) {
            const binding = this.fragments.get(fragmentId);
            if (!binding) continue;

            // Обновляем HTML фрагмента на основе секций
            let newHtml = binding.html;
            for (const { oldOutput, newOutput, section } of replacements) {
                if (section.fragmentId === fragmentId) {
                    newHtml = newHtml.replace(oldOutput, newOutput);
                }
            }
            
            const oldFragment = binding.fragment;
            binding.html = newHtml;
            binding.fragment = null; // Инвалидируем кэш
            
            // Создаём новый фрагмент
            const newFragment = this.createFragmentFromHtml(newHtml);
            binding.fragment = newFragment;

            // Обновляем DOM если фрагмент вставлен
            if (binding.startMarker && binding.endMarker) {
                this.replaceFragmentInDOM(binding, newFragment);
            }

            // Уведомляем об изменении фрагмента
            this.fragmentChangeObserver.notify(
                { fragmentId, oldFragment, newFragment, affectedObservables: [observable] },
                { fragmentId, oldFragment, newFragment, affectedObservables: [observable] }
            );
        }

        // Одно событие для всех изменений шаблона
        this.changeObserver.notify(
            { oldValue: null, newValue, oldTemplate, newTemplate: this.template },
            { oldValue: null, newValue, oldTemplate, newTemplate: this.template }
        );
    }

    /**
     * Заменить фрагмент в DOM между маркерами
     */
    private replaceFragmentInDOM(binding: FragmentBinding, newFragment: DocumentFragment): void {
        if (!binding.startMarker || !binding.endMarker) return;

        const parent = binding.startMarker.parentNode;
        if (!parent) return;

        // Удаляем старые ноды между маркерами
        for (const node of binding.nodes) {
            parent.removeChild(node);
        }

        // Вставляем новые ноды
        const newNodes: Node[] = [];
        const childNodes = Array.from(newFragment.childNodes);
        
        for (const node of childNodes) {
            newNodes.push(node);
            parent.insertBefore(node, binding.endMarker);
        }

        binding.nodes = newNodes;
    }

    /**
     * Создать DocumentFragment из HTML строки
     */
    private createFragmentFromHtml(html: string): DocumentFragment {
        if (typeof document === 'undefined') {
            throw new Error('createFragmentFromHtml requires DOM environment');
        }

        const template = document.createElement('template');
        template.innerHTML = html;
        return template.content.cloneNode(true) as DocumentFragment;
    }

    /**
     * Отписаться от вложенных Observable в секции (но не от главного)
     */
    private unsubscribeSectionNested(section: TemplateSection): void {
        // Отписываемся только от подписок, сохранённых непосредственно в секции
        for (const sub of section.subscriptions) {
            sub.unsubscribe();
        }
        section.subscriptions = [];

        // Recursively unsubscribe children
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

        // Recursively unsubscribe children
        for (const child of section.children) {
            this.unsubscribeSection(child);
        }
    }

    /**
     * Создать DocumentFragment из текущего шаблона (весь шаблон).
     * Кэширует фрагмент - повторные вызовы возвращают тот же фрагмент.
     * После appendChild фрагмент будет пустым, но ссылки на элементы остаются валидными.
     */
    public createFragment(): DocumentFragment {
        if (!this.cachedFragment) {
            this.cachedFragment = this.createFragmentFromHtml(this.template);
        }
        return this.cachedFragment;
    }
    
    /**
     * Инвалидировать кэш фрагмента (для пересоздания)
     */
    public invalidateFragment(): void {
        this.cachedFragment = null;
    }

    /**
     * Создать и вставить все фрагменты в контейнер с маркерами
     */
    public createAllFragmentsWithMarkers(container: Element): void {
        for (const [id, binding] of this.fragments) {
            const startMarker = document.createComment(`fragment-start:${id}`);
            const endMarker = document.createComment(`fragment-end:${id}`);
            
            container.appendChild(startMarker);
            
            const fragment = this.createFragmentFromHtml(binding.html);
            binding.fragment = fragment;
            
            // Сохраняем ноды
            const nodes: Node[] = [];
            const childNodes = Array.from(fragment.childNodes);
            for (const node of childNodes) {
                nodes.push(node);
                container.appendChild(node);
            }
            
            container.appendChild(endMarker);
            
            binding.startMarker = startMarker;
            binding.endMarker = endMarker;
            binding.nodes = nodes;
        }
    }

    /**
     * Получить DocumentFragment для конкретного фрагмента
     */
    public getFragmentById(id: string): DocumentFragment | null {
        const binding = this.fragments.get(id);
        if (!binding) return null;
        
        if (!binding.fragment) {
            binding.fragment = this.createFragmentFromHtml(binding.html);
        }
        
        return binding.fragment;
    }

    /**
     * Получить кэшированный DocumentFragment (deprecated)
     * @deprecated Используйте getFragmentById
     */
    public getFragment(): DocumentFragment | null {
        // Возвращаем первый фрагмент для обратной совместимости
        const firstBinding = this.fragments.values().next().value;
        return firstBinding?.fragment || null;
    }

    /**
     * Пересоздать все фрагменты
     */
    public rebuildAllFragments(): void {
        for (const [_id, binding] of this.fragments) {
            binding.fragment = null;
            binding.fragment = this.createFragmentFromHtml(binding.html);
        }
    }

    /**
     * Пересоздать fragment (deprecated)
     * @deprecated Используйте rebuildAllFragments или конкретный фрагмент
     */
    public rebuildFragment(): DocumentFragment {
        this.rebuildAllFragments();
        return this.createFragment();
    }

    /**
     * Очистить все подписки
     */
    public dispose(): void {
        // Отписываемся от всех Observable
        for (const tracking of this.observableTrackings.values()) {
            tracking.unsubscribe();
        }
        this.observableTrackings.clear();
        
        // Отвязываем события
        this.unbindEvents();
        
        // Очищаем секции
        for (const section of this.sections) {
            this.unsubscribeSection(section);
        }
        this.sections = [];
        
        // Очищаем фрагменты
        this.fragments.clear();
    }

    /**
     * Привязать refs к элементам
     * @param root - DOM элемент для поиска refs. Если не указан, создаётся фрагмент из шаблона
     */
    public bindRefs(): void {
        // Если root не передан, создаём фрагмент из шаблона
        const targetRoot = this.createFragment();
        
        const refElements = targetRoot.querySelectorAll('[data-ref]');
        
        for (const element of Array.from(refElements)) {
            const refName = element.getAttribute('data-ref');
            if (refName) {
                this.scope.set(refName, element);
            }
        }
    }

    /**
     * Обработать инжекции (@injection[head/tail])
     * Должен вызываться после bindRefs
     */
    public processInjections(root: Element | DocumentFragment): void {
        // Find all elements with injection attributes
        const injectElements = root.querySelectorAll('[data-injection-type][data-injection-target]');

        for (const element of Array.from(injectElements)) {
            const type = element.getAttribute('data-injection-type') as 'head' | 'tail';
            const targetRefName = decodeURIComponent(element.getAttribute('data-injection-target') || '');

            if (!targetRefName) continue;

            // Get target element from scope
            const targetElement = this.scope.get(targetRefName);

            if (!targetElement || !(targetElement instanceof Element)) {
                console.warn(`[PageTemplate] Injection target "${targetRefName}" not found in scope or is not an Element`);
                continue;
            }

            // Remove injection attributes
            element.removeAttribute('data-injection-type');
            element.removeAttribute('data-injection-target');

            // Perform injection
            if (type === 'head') {
                targetElement.prepend(element);
            } else {
                targetElement.append(element);
            }
        }
    }

    /**
     * Привязать события к элементам из кэшированного фрагмента
     */
    public bindEvents(): void {
        // Используем кэшированный фрагмент (тот же что и для bindRefs)
        const fragment = this.createFragment();
        
        // Собираем все элементы из фрагмента
        const allElements = fragment.querySelectorAll('*');
        
        for (const element of Array.from(allElements)) {
            const unbinders = this.bindEventsToElement(element);
            this.eventUnbinders.push(...unbinders);
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
    
    /**
     * Отвязать все события
     */
    public unbindEvents(): void {
        for (const unbind of this.eventUnbinders) {
            unbind();
        }
        this.eventUnbinders = [];
    }

    /**
     * Отвязать refs (установить null)
     */
    public unbindRefs(): void {
        for (const section of this.sections) {
            if (section.rule.name === 'ref' && section.match.data?.expression) {
                const refName = section.match.data.expression;
                if (this.scope.has(refName)) {
                    this.scope.set(refName, null);
                }
            }
        }
    }
}

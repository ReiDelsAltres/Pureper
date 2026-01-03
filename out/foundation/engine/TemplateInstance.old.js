import { MutationObserver } from '../api/Observer.js';
import Expression from './Expression.js';
/**
 * PageTemplate - динамический шаблон страницы.
 * Хранит обработанные Rule и поддерживает реактивное обновление.
 *
 * При изменении Observable обновляются только те фрагменты,
 * которые зависят от изменённого Observable.
 */
export default class TemplateInstance {
    template;
    scope;
    sections = [];
    /** Фрагменты шаблона (каждый обновляется независимо) */
    fragments = new Map();
    /** Счётчик для генерации ID фрагментов */
    fragmentIdCounter = 0;
    /** Observers for template changes */
    changeObserver = new MutationObserver();
    /** Observers for fragment changes */
    fragmentChangeObserver = new MutationObserver();
    /** Группировка секций по Observable */
    observableTrackings = new Map();
    /** Функции отписки от событий */
    eventUnbinders = [];
    /** Кэшированный главный фрагмент */
    cachedFragment = null;
    constructor(template, scope) {
        this.template = template;
        this.scope = scope;
    }
    /**
     * Получить текущий шаблон
     */
    getTemplate() {
        return this.template;
    }
    /**
     * Установить новый шаблон (вызывает событие изменения)
     */
    setTemplate(newTemplate) {
        const oldTemplate = this.template;
        this.template = newTemplate;
        this.changeObserver.notify({ oldValue: null, newValue: null, oldTemplate, newTemplate }, { oldValue: null, newValue: null, oldTemplate, newTemplate });
    }
    /**
     * Получить Scope
     */
    getScope() {
        return this.scope;
    }
    /**
     * Подписаться на изменения шаблона
     */
    onTemplateChange(listener) {
        const wrapper = (oldEvent, newEvent) => {
            listener(newEvent.oldValue, newEvent.newValue, newEvent.oldTemplate, newEvent.newTemplate);
        };
        this.changeObserver.subscribe(wrapper);
        return () => this.changeObserver.unsubscribe(wrapper);
    }
    /**
     * Подписаться на изменения фрагментов
     */
    onFragmentChange(listener) {
        const wrapper = (_oldEvent, newEvent) => {
            listener(newEvent);
        };
        this.fragmentChangeObserver.subscribe(wrapper);
        return () => this.fragmentChangeObserver.unsubscribe(wrapper);
    }
    /**
     * Добавить секцию шаблона
     */
    addSection(section) {
        this.sections.push(section);
    }
    /**
     * Получить все секции
     */
    getSections() {
        return this.sections;
    }
    /**
     * Создать новый фрагмент и вернуть его ID
     */
    createFragmentBinding(html, sections = []) {
        const id = `fragment-${this.fragmentIdCounter++}`;
        const binding = {
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
    getFragmentBinding(id) {
        return this.fragments.get(id);
    }
    /**
     * Получить все фрагменты
     */
    getAllFragments() {
        return this.fragments;
    }
    /**
     * Подписаться на Observable и автоматически пересоздавать секцию.
     * Обновляются только фрагменты, зависящие от изменённого Observable.
     */
    trackObservable(observable, section, rebuild) {
        // Проверяем, есть ли уже отслеживание для этого Observable
        let tracking = this.observableTrackings.get(observable);
        if (!tracking) {
            // Создаём новое отслеживание
            const listener = (newValue) => {
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
    rebuildFragmentsForObservable(observable, newValue) {
        const tracking = this.observableTrackings.get(observable);
        if (!tracking || tracking.sections.length === 0)
            return;
        const oldTemplate = this.template;
        let currentTemplate = this.template;
        // Собираем все замены: старый output -> новый output
        const replacements = [];
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
        const affectedFragmentIds = new Set();
        for (const { section } of tracking.sections) {
            if (section.fragmentId) {
                affectedFragmentIds.add(section.fragmentId);
            }
        }
        // Пересоздаём только затронутые фрагменты
        for (const fragmentId of affectedFragmentIds) {
            const binding = this.fragments.get(fragmentId);
            if (!binding)
                continue;
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
            this.fragmentChangeObserver.notify({ fragmentId, oldFragment, newFragment, affectedObservables: [observable] }, { fragmentId, oldFragment, newFragment, affectedObservables: [observable] });
        }
        // Одно событие для всех изменений шаблона
        this.changeObserver.notify({ oldValue: null, newValue, oldTemplate, newTemplate: this.template }, { oldValue: null, newValue, oldTemplate, newTemplate: this.template });
    }
    /**
     * Заменить фрагмент в DOM между маркерами
     */
    replaceFragmentInDOM(binding, newFragment) {
        if (!binding.startMarker || !binding.endMarker)
            return;
        const parent = binding.startMarker.parentNode;
        if (!parent)
            return;
        // Удаляем старые ноды между маркерами
        for (const node of binding.nodes) {
            parent.removeChild(node);
        }
        // Вставляем новые ноды
        const newNodes = [];
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
    createFragmentFromHtml(html) {
        if (typeof document === 'undefined') {
            throw new Error('createFragmentFromHtml requires DOM environment');
        }
        const template = document.createElement('template');
        template.innerHTML = html;
        return template.content.cloneNode(true);
    }
    /**
     * Отписаться от вложенных Observable в секции (но не от главного)
     */
    unsubscribeSectionNested(section) {
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
    unsubscribeSection(section) {
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
    createFragment() {
        if (!this.cachedFragment) {
            this.cachedFragment = this.createFragmentFromHtml(this.template);
        }
        return this.cachedFragment;
    }
    /**
     * Инвалидировать кэш фрагмента (для пересоздания)
     */
    invalidateFragment() {
        this.cachedFragment = null;
    }
    /**
     * Создать и вставить все фрагменты в контейнер с маркерами
     */
    createAllFragmentsWithMarkers(container) {
        for (const [id, binding] of this.fragments) {
            const startMarker = document.createComment(`fragment-start:${id}`);
            const endMarker = document.createComment(`fragment-end:${id}`);
            container.appendChild(startMarker);
            const fragment = this.createFragmentFromHtml(binding.html);
            binding.fragment = fragment;
            // Сохраняем ноды
            const nodes = [];
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
    getFragmentById(id) {
        const binding = this.fragments.get(id);
        if (!binding)
            return null;
        if (!binding.fragment) {
            binding.fragment = this.createFragmentFromHtml(binding.html);
        }
        return binding.fragment;
    }
    /**
     * Получить кэшированный DocumentFragment (deprecated)
     * @deprecated Используйте getFragmentById
     */
    getFragment() {
        // Возвращаем первый фрагмент для обратной совместимости
        const firstBinding = this.fragments.values().next().value;
        return firstBinding?.fragment || null;
    }
    /**
     * Пересоздать все фрагменты
     */
    rebuildAllFragments() {
        for (const [_id, binding] of this.fragments) {
            binding.fragment = null;
            binding.fragment = this.createFragmentFromHtml(binding.html);
        }
    }
    /**
     * Пересоздать fragment (deprecated)
     * @deprecated Используйте rebuildAllFragments или конкретный фрагмент
     */
    rebuildFragment() {
        this.rebuildAllFragments();
        return this.createFragment();
    }
    /**
     * Очистить все подписки
     */
    dispose() {
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
    bindRefs() {
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
    processInjections(root) {
        // Find all elements with injection attributes
        const injectElements = root.querySelectorAll('[data-injection-type][data-injection-target]');
        for (const element of Array.from(injectElements)) {
            const type = element.getAttribute('data-injection-type');
            const targetRefName = decodeURIComponent(element.getAttribute('data-injection-target') || '');
            if (!targetRefName)
                continue;
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
            }
            else {
                targetElement.append(element);
            }
        }
    }
    /**
     * Привязать события к элементам из кэшированного фрагмента
     */
    bindEvents() {
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
    bindEventsToElement(element) {
        const unbinders = [];
        const attributes = Array.from(element.attributes);
        for (const attr of attributes) {
            if (attr.name.startsWith('data-event-')) {
                const eventName = attr.name.slice('data-event-'.length);
                const exprCode = decodeURIComponent(attr.value);
                const handler = (event) => {
                    const localScope = this.scope.createChild({ event });
                    const expr = new Expression(exprCode);
                    try {
                        expr.execute(localScope);
                    }
                    catch (error) {
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
    unbindEvents() {
        for (const unbind of this.eventUnbinders) {
            unbind();
        }
        this.eventUnbinders = [];
    }
    /**
     * Отвязать refs (установить null)
     */
    unbindRefs() {
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
//# sourceMappingURL=TemplateInstance.old.js.map
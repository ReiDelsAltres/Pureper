import { MutationObserver } from '../api/Observer.js';
/**
 * PageTemplate - динамический шаблон страницы.
 * Хранит обработанные Rule и поддерживает реактивное обновление.
 *
 * При изменении Observable все зависимые секции обновляются
 * одновременно в одном событии onTemplateChange.
 */
export default class TemplateInstance {
    template;
    scope;
    sections = [];
    fragment = null;
    /** Observers for template changes */
    changeObserver = new MutationObserver();
    /** Группировка секций по Observable */
    observableTrackings = new Map();
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
     * Подписаться на Observable и автоматически пересоздавать секцию.
     * Все секции, зависящие от одного Observable, обновляются разом.
     */
    trackObservable(observable, section, rebuild) {
        // Проверяем, есть ли уже отслеживание для этого Observable
        let tracking = this.observableTrackings.get(observable);
        if (!tracking) {
            // Создаём новое отслеживание
            const listener = (newValue) => {
                this.rebuildAllSectionsForObservable(observable, newValue);
            };
            observable.subscribe(listener);
            tracking = {
                observable,
                sections: [],
                unsubscribe: () => observable.unsubscribe(listener)
            };
            this.observableTrackings.set(observable, tracking);
        }
        // Добавляем секцию в отслеживание
        tracking.sections.push({ section, rebuild });
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
     * Перестроить все секции, зависящие от Observable, за один раз
     */
    rebuildAllSectionsForObservable(observable, newValue) {
        const tracking = this.observableTrackings.get(observable);
        if (!tracking || tracking.sections.length === 0)
            return;
        const oldTemplate = this.template;
        let currentTemplate = this.template;
        // Собираем все замены: старый output -> новый output
        // Сортируем по позиции в шаблоне (с конца), чтобы замены не сбивали индексы
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
        // Применяем все замены
        for (const { oldOutput, newOutput } of replacements) {
            currentTemplate = currentTemplate.replace(oldOutput, newOutput);
        }
        this.template = currentTemplate;
        // Одно событие для всех изменений
        this.changeObserver.notify({ oldValue: null, newValue, oldTemplate, newTemplate: this.template }, { oldValue: null, newValue, oldTemplate, newTemplate: this.template });
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
     * Создать DocumentFragment из текущего шаблона
     */
    createFragment() {
        if (typeof document === 'undefined') {
            throw new Error('PageTemplate.createFragment() requires DOM environment');
        }
        const template = document.createElement('template');
        template.innerHTML = this.template;
        this.fragment = template.content.cloneNode(true);
        return this.fragment;
    }
    /**
     * Получить кэшированный DocumentFragment
     */
    getFragment() {
        return this.fragment;
    }
    /**
     * Пересоздать fragment
     */
    rebuildFragment() {
        this.fragment = null;
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
        // Очищаем секции
        for (const section of this.sections) {
            this.unsubscribeSection(section);
        }
        this.sections = [];
        this.fragment = null;
    }
    /**
     * Привязать refs после вставки в DOM
     */
    bindRefs(root) {
        const refElements = root.querySelectorAll('[data-ref]');
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
//# sourceMappingURL=TemplateInstance.js.map
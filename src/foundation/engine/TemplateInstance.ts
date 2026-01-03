import Scope from './Scope.js';
import Observable, { MutationObserver } from '../api/Observer.js';
import Rule, { RuleMatch, RuleResult } from './Rule.js';

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
    unsubscribe: () => void;
}

/**
 * PageTemplate - динамический шаблон страницы.
 * Хранит обработанные Rule и поддерживает реактивное обновление.
 * 
 * При изменении Observable все зависимые секции обновляются
 * одновременно в одном событии onTemplateChange.
 */
export default class TemplateInstance {
    private template: string;
    private scope: Scope;
    private sections: TemplateSection[] = [];
    private fragment: DocumentFragment | null = null;
    
    /** Observers for template changes */
    private changeObserver = new MutationObserver<TemplateChangeEvent>();
    
    /** Группировка секций по Observable */
    private observableTrackings = new Map<Observable<any>, ObservableTracking>();

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
     * Подписаться на Observable и автоматически пересоздавать секцию.
     * Все секции, зависящие от одного Observable, обновляются разом.
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
    private rebuildAllSectionsForObservable(observable: Observable<any>, newValue: any): void {
        const tracking = this.observableTrackings.get(observable);
        if (!tracking || tracking.sections.length === 0) return;

        const oldTemplate = this.template;
        let currentTemplate = this.template;

        // Собираем все замены: старый output -> новый output
        // Сортируем по позиции в шаблоне (с конца), чтобы замены не сбивали индексы
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

        // Применяем все замены
        for (const { oldOutput, newOutput } of replacements) {
            currentTemplate = currentTemplate.replace(oldOutput, newOutput);
        }

        this.template = currentTemplate;

        // Одно событие для всех изменений
        this.changeObserver.notify(
            { oldValue: null, newValue, oldTemplate, newTemplate: this.template },
            { oldValue: null, newValue, oldTemplate, newTemplate: this.template }
        );
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
     * Создать DocumentFragment из текущего шаблона
     */
    public createFragment(): DocumentFragment {
        if (typeof document === 'undefined') {
            throw new Error('PageTemplate.createFragment() requires DOM environment');
        }

        const template = document.createElement('template');
        template.innerHTML = this.template;
        this.fragment = template.content.cloneNode(true) as DocumentFragment;
        
        return this.fragment;
    }

    /**
     * Получить кэшированный DocumentFragment
     */
    public getFragment(): DocumentFragment | null {
        return this.fragment;
    }

    /**
     * Пересоздать fragment
     */
    public rebuildFragment(): DocumentFragment {
        this.fragment = null;
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
    public bindRefs(root: Element | DocumentFragment): void {
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

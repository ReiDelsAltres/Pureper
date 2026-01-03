import Scope from './Scope.js';
import Observable from '../api/Observer.js';
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
    subscriptions: Array<{
        observable: Observable<any>;
        unsubscribe: () => void;
    }>;
}
/**
 * PageTemplate - динамический шаблон страницы.
 * Хранит обработанные Rule и поддерживает реактивное обновление.
 *
 * При изменении Observable все зависимые секции обновляются
 * одновременно в одном событии onTemplateChange.
 */
export default class TemplateInstance {
    private template;
    private scope;
    private sections;
    private fragment;
    /** Observers for template changes */
    private changeObserver;
    /** Группировка секций по Observable */
    private observableTrackings;
    constructor(template: string, scope: Scope);
    /**
     * Получить текущий шаблон
     */
    getTemplate(): string;
    /**
     * Установить новый шаблон (вызывает событие изменения)
     */
    setTemplate(newTemplate: string): void;
    /**
     * Получить Scope
     */
    getScope(): Scope;
    /**
     * Подписаться на изменения шаблона
     */
    onTemplateChange(listener: (oldValue: any, newValue: any, oldTemplate: string, newTemplate: string) => void): () => void;
    /**
     * Добавить секцию шаблона
     */
    addSection(section: TemplateSection): void;
    /**
     * Получить все секции
     */
    getSections(): TemplateSection[];
    /**
     * Подписаться на Observable и автоматически пересоздавать секцию.
     * Все секции, зависящие от одного Observable, обновляются разом.
     */
    trackObservable(observable: Observable<any>, section: TemplateSection, rebuild: (section: TemplateSection) => RuleResult): () => void;
    /**
     * Перестроить все секции, зависящие от Observable, за один раз
     */
    private rebuildAllSectionsForObservable;
    /**
     * Отписаться от вложенных Observable в секции (но не от главного)
     */
    private unsubscribeSectionNested;
    /**
     * Отписаться от всех Observable в секции
     */
    private unsubscribeSection;
    /**
     * Создать DocumentFragment из текущего шаблона
     */
    createFragment(): DocumentFragment;
    /**
     * Получить кэшированный DocumentFragment
     */
    getFragment(): DocumentFragment | null;
    /**
     * Пересоздать fragment
     */
    rebuildFragment(): DocumentFragment;
    /**
     * Очистить все подписки
     */
    dispose(): void;
    /**
     * Привязать refs после вставки в DOM
     */
    bindRefs(root: Element | DocumentFragment): void;
    /**
     * Обработать инжекции (@injection[head/tail])
     * Должен вызываться после bindRefs
     */
    processInjections(root: Element | DocumentFragment): void;
    /**
     * Отвязать refs (установить null)
     */
    unbindRefs(): void;
}
//# sourceMappingURL=TemplateInstance.d.ts.map
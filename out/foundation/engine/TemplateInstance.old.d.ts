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
    subscriptions: Array<{
        observable: Observable<any>;
        unsubscribe: () => void;
    }>;
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
 * PageTemplate - динамический шаблон страницы.
 * Хранит обработанные Rule и поддерживает реактивное обновление.
 *
 * При изменении Observable обновляются только те фрагменты,
 * которые зависят от изменённого Observable.
 */
export default class TemplateInstance {
    private template;
    private scope;
    private sections;
    /** Фрагменты шаблона (каждый обновляется независимо) */
    private fragments;
    /** Счётчик для генерации ID фрагментов */
    private fragmentIdCounter;
    /** Observers for template changes */
    private changeObserver;
    /** Observers for fragment changes */
    private fragmentChangeObserver;
    /** Группировка секций по Observable */
    private observableTrackings;
    /** Функции отписки от событий */
    private eventUnbinders;
    /** Кэшированный главный фрагмент */
    private cachedFragment;
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
     * Подписаться на изменения фрагментов
     */
    onFragmentChange(listener: (event: FragmentChangeEvent) => void): () => void;
    /**
     * Добавить секцию шаблона
     */
    addSection(section: TemplateSection): void;
    /**
     * Получить все секции
     */
    getSections(): TemplateSection[];
    /**
     * Создать новый фрагмент и вернуть его ID
     */
    createFragmentBinding(html: string, sections?: TemplateSection[]): string;
    /**
     * Получить привязку фрагмента по ID
     */
    getFragmentBinding(id: string): FragmentBinding | undefined;
    /**
     * Получить все фрагменты
     */
    getAllFragments(): Map<string, FragmentBinding>;
    /**
     * Подписаться на Observable и автоматически пересоздавать секцию.
     * Обновляются только фрагменты, зависящие от изменённого Observable.
     */
    trackObservable(observable: Observable<any>, section: TemplateSection, rebuild: (section: TemplateSection) => RuleResult): () => void;
    /**
     * Перестроить только те фрагменты, которые зависят от Observable
     */
    private rebuildFragmentsForObservable;
    /**
     * Заменить фрагмент в DOM между маркерами
     */
    private replaceFragmentInDOM;
    /**
     * Создать DocumentFragment из HTML строки
     */
    private createFragmentFromHtml;
    /**
     * Отписаться от вложенных Observable в секции (но не от главного)
     */
    private unsubscribeSectionNested;
    /**
     * Отписаться от всех Observable в секции
     */
    private unsubscribeSection;
    /**
     * Создать DocumentFragment из текущего шаблона (весь шаблон).
     * Кэширует фрагмент - повторные вызовы возвращают тот же фрагмент.
     * После appendChild фрагмент будет пустым, но ссылки на элементы остаются валидными.
     */
    createFragment(): DocumentFragment;
    /**
     * Инвалидировать кэш фрагмента (для пересоздания)
     */
    invalidateFragment(): void;
    /**
     * Создать и вставить все фрагменты в контейнер с маркерами
     */
    createAllFragmentsWithMarkers(container: Element): void;
    /**
     * Получить DocumentFragment для конкретного фрагмента
     */
    getFragmentById(id: string): DocumentFragment | null;
    /**
     * Получить кэшированный DocumentFragment (deprecated)
     * @deprecated Используйте getFragmentById
     */
    getFragment(): DocumentFragment | null;
    /**
     * Пересоздать все фрагменты
     */
    rebuildAllFragments(): void;
    /**
     * Пересоздать fragment (deprecated)
     * @deprecated Используйте rebuildAllFragments или конкретный фрагмент
     */
    rebuildFragment(): DocumentFragment;
    /**
     * Очистить все подписки
     */
    dispose(): void;
    /**
     * Привязать refs к элементам
     * @param root - DOM элемент для поиска refs. Если не указан, создаётся фрагмент из шаблона
     */
    bindRefs(): void;
    /**
     * Обработать инжекции (@injection[head/tail])
     * Должен вызываться после bindRefs
     */
    processInjections(root: Element | DocumentFragment): void;
    /**
     * Привязать события к элементам из кэшированного фрагмента
     */
    bindEvents(): void;
    /**
     * Привязать события к одному элементу
     */
    private bindEventsToElement;
    /**
     * Отвязать все события
     */
    unbindEvents(): void;
    /**
     * Отвязать refs (установить null)
     */
    unbindRefs(): void;
}
//# sourceMappingURL=TemplateInstance.old.d.ts.map
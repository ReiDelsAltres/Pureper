import Scope from './Scope.js';
import Observable from '../api/Observer.js';
import Rule, { RuleMatch, RuleResult } from './Rule.js';
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
    subscriptions: Array<{
        observable: Observable<any>;
        unsubscribe: () => void;
    }>;
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
 * TemplateInstance - динамический шаблон страницы.
 *
 * Поддерживает:
 * - Множество мелких фрагментов, каждый обновляется независимо
 * - Множество container bindings
 * - Автоматическое обновление DOM при изменении Observable
 * - bind/unbind для refs и events
 */
export default class TemplateInstance {
    private scope;
    private sections;
    /** Все фрагменты шаблона */
    private fragments;
    /** ID корневого фрагмента */
    private rootFragmentId;
    /** Счётчик для генерации ID фрагментов */
    private fragmentIdCounter;
    /** Observers for fragment changes */
    private fragmentChangeObserver;
    /** Группировка секций по Observable */
    private observableTrackings;
    /** Привязки к контейнерам */
    private containerBindings;
    constructor(scope: Scope);
    /**
     * Получить Scope
     */
    getScope(): Scope;
    /**
     * Получить все секции
     */
    getSections(): TemplateSection[];
    /**
     * Получить все фрагменты
     */
    getAllFragments(): Map<string, FragmentBinding>;
    /**
     * Получить фрагмент по ID
     */
    getFragmentBinding(id: string): FragmentBinding | undefined;
    /**
     * Получить финальный HTML (собранный из всех фрагментов)
     */
    getTemplate(): string;
    /**
     * Создать новый фрагмент и вернуть его ID
     */
    createFragment(html: string, sourceTemplate: string, sections?: TemplateSection[], parentId?: string | null): string;
    /**
     * Установить корневой фрагмент
     */
    setRootFragment(id: string): void;
    /**
     * Добавить секцию шаблона
     */
    addSection(section: TemplateSection): void;
    /**
     * Вставить добавленный фрагмент во все привязанные контейнеры.
     * Вызывается после appendTemplate.
     */
    insertAppendedFragment(fragmentId: string): void;
    /**
     * Привязать события только для нового фрагмента
     */
    private bindEventsForNewFragment;
    /**
     * Подписаться на изменения фрагментов
     */
    onFragmentChange(listener: (event: FragmentChangeEvent) => void): () => void;
    /**
     * Подписаться на Observable и автоматически пересоздавать секцию
     */
    trackObservable(observable: Observable<any>, section: TemplateSection, rebuild: (section: TemplateSection) => RuleResult): () => void;
    /**
     * Привязать к контейнеру.
     * Вставляет DOM, вызывает bindRefs, processInjections и bindEvents.
     */
    bind(container: Element): void;
    /**
     * Отвязать от контейнера.
     * Отвязывает refs и events, но оставляет DOM.
     */
    unbind(container: Element): void;
    /**
     * Привязать refs к элементам.
     * Если есть контейнеры - привязывает для них.
     * Если нет - создаёт временный DocumentFragment и привязывает refs из него.
     */
    bindRefs(): void;
    /**
     * Привязать refs из DocumentFragment (без контейнера)
     */
    private bindRefsForFragment;
    /**
     * Отвязать refs (для всех контейнеров)
     */
    unbindRefs(): void;
    /**
     * Привязать события (для всех контейнеров)
     */
    bindEvents(): void;
    /**
     * Отвязать события (для всех контейнеров)
     */
    unbindEvents(): void;
    /**
     * Очистить все подписки и bindings
     */
    dispose(): void;
    /**
     * Вставить все фрагменты в контейнер с маркерами
     */
    private insertFragmentsIntoContainer;
    /**
     * Рекурсивно вставить фрагмент и его дочерние
     */
    private insertFragmentRecursive;
    /**
     * Создать ноды из HTML строки
     */
    private createNodesFromHtml;
    /**
     * Собрать HTML из фрагмента (рекурсивно заменяя placeholder-ы)
     */
    private buildHtmlFromFragment;
    /**
     * Привязать refs для конкретного контейнера
     */
    private bindRefsForContainer;
    /**
     * Обработать инжекции для конкретного контейнера.
     * Находит элементы с data-injection-* атрибутами и перемещает их в целевые элементы.
     */
    private processInjectionsForContainer;
    /**
     * Отвязать refs для конкретного контейнера
     */
    private unbindRefsForContainer;
    /**
     * Привязать события для конкретного контейнера
     */
    private bindEventsForContainer;
    /**
     * Привязать события к одному элементу
     */
    private bindEventsToElement;
    /**
     * Перестроить фрагменты при изменении Observable
     */
    private rebuildFragmentsForObservable;
    /**
     * Обновить фрагмент во всех контейнерах
     */
    private updateFragmentInAllContainers;
    /**
     * Отвязать события от нод
     */
    private unbindEventsFromNodes;
    /**
     * Отписаться от вложенных Observable в секции
     */
    private unsubscribeSectionNested;
    /**
     * Отписаться от всех Observable в секции
     */
    private unsubscribeSection;
    /**
     * @deprecated Используйте bind(container)
     */
    createDOMFragment(): DocumentFragment;
}
//# sourceMappingURL=TemplateInstance.d.ts.map
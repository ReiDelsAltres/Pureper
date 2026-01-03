/**
 * Scope - класс для работы с контекстом переменных и функций.
 * Поддерживает объединение нескольких Scope, извлечение полей из объектов и классов.
 */
export default class Scope {
    private variables;
    private readonly debugWarnings;
    /** Оригинальный объект для синхронизации refs */
    private originalSource;
    constructor(options?: {
        debugWarnings?: boolean;
    });
    /**
     * Получить все переменные Scope как Record
     */
    getVariables(): Record<string, any>;
    /**
     * Установить переменную в Scope
     * @param syncToOriginal - синхронизировать с оригинальным объектом (по умолчанию true)
     */
    set(key: string, value: any, syncToOriginal?: boolean): void;
    /**
     * Получить переменную из Scope
     */
    get(key: string): any;
    /**
     * Проверить наличие переменной
     */
    has(key: string): boolean;
    /**
     * Удалить переменную из Scope
     */
    delete(key: string): boolean;
    /**
     * Объединить другой Scope или объект в текущий Scope.
     * При конфликте имён выводится предупреждение, последнее значение имеет приоритет.
     */
    merge(source: Scope | Record<string, any> | object): Scope;
    /**
     * Создать дочерний (локальный) Scope на основе текущего.
     * Изменения в дочернем Scope не влияют на родительский.
     */
    createChild(localVariables?: Record<string, any>): Scope;
    /**
     * Извлечь поля и методы из объекта или экземпляра класса.
     * Пропускает нативные DOM/браузерные прототипы.
     */
    extractFromObject(obj: object): Record<string, any>;
    /**
     * Статический метод для создания Scope из объекта
     * Сохраняет ссылку на оригинальный объект для синхронизации refs
     */
    static from(source: object | Record<string, any>, options?: {
        debugWarnings?: boolean;
    }): Scope;
    /**
     * Статический метод для объединения нескольких Scope/объектов
     */
    static combine(...sources: (Scope | Record<string, any> | object)[]): Scope;
}
//# sourceMappingURL=Scope.d.ts.map
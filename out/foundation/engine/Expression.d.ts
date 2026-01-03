import Scope from './Scope.js';
import Observable from '../api/Observer.js';
/**
 * Expression - класс для выполнения JS-кода в контексте Scope.
 * Поддерживает:
 * - Простые выражения: value, user.name
 * - Вызовы функций: doSomething()
 * - Сложный JS-код: encodeURIComponent(JSON.stringify(subject))
 * - Код с return: const f = ""; return f;
 * - Async/await: await fetchData()
 *
 * Для Observable автоматически разворачивает значения:
 *   user.name -> user.getObject().name (если user - Observable)
 */
export default class Expression {
    private readonly code;
    private readonly isAsync;
    private readonly hasReturn;
    constructor(code: string);
    /**
     * Определить, содержит ли код await
     */
    private detectAsync;
    /**
     * Определить, содержит ли код return
     */
    private detectReturn;
    /**
     * Получить исходный код выражения
     */
    getCode(): string;
    /**
     * Найти все Observable, используемые в выражении.
     * Например, для "user.name + user.age" вернёт [Observable(user)]
     */
    findObservables(scope: Scope): Observable<any>[];
    /**
     * Извлечь идентификаторы верхнего уровня из выражения.
     * "user.name + count" -> ["user", "count"]
     */
    private extractIdentifiers;
    /**
     * Трансформировать код, разворачивая Observable.
     * "user.name" -> "user.getObject().name" (если user - Observable)
     */
    transformCode(scope: Scope): string;
    /**
     * Выполнить выражение в контексте Scope.
     * @param scope - Scope с переменными и функциями
     * @param extraVars - дополнительные переменные (например, event для @on)
     * @returns результат выполнения
     */
    execute(scope: Scope, extraVars?: Record<string, any>): any;
    /**
     * Выполнить выражение асинхронно
     */
    executeAsync(scope: Scope, extraVars?: Record<string, any>): Promise<any>;
    /**
     * Выполнить в контексте (синхронно)
     */
    private executeInContext;
    /**
     * Выполнить в контексте (асинхронно)
     */
    private executeInContextAsync;
    /**
     * Проверить, является ли выражение асинхронным
     */
    isAsyncExpression(): boolean;
    /**
     * Выполнить выражение (авто-выбор sync/async)
     */
    eval(scope: Scope, extraVars?: Record<string, any>): any | Promise<any>;
    /**
     * Статический метод для быстрого выполнения
     */
    static evaluate(code: string, scope: Scope, extraVars?: Record<string, any>): any;
    /**
     * Статический метод для асинхронного выполнения
     */
    static evaluateAsync(code: string, scope: Scope, extraVars?: Record<string, any>): Promise<any>;
}
//# sourceMappingURL=Expression.d.ts.map
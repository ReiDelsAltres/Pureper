import Scope from './Scope.js';
import Observable, { isObservable } from '../api/Observer.js';

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
    private readonly code: string;
    private readonly isAsync: boolean;
    private readonly hasReturn: boolean;

    constructor(code: string) {
        this.code = code.trim();
        this.isAsync = this.detectAsync(this.code);
        this.hasReturn = this.detectReturn(this.code);
    }

    /**
     * Определить, содержит ли код await
     */
    private detectAsync(code: string): boolean {
        // Simple check for await keyword (not in string)
        return /\bawait\s+/.test(code);
    }

    /**
     * Определить, содержит ли код return
     */
    private detectReturn(code: string): boolean {
        // Check for return keyword followed by space, semicolon, or end
        return /\breturn\s+/.test(code) || /\breturn;/.test(code) || /\breturn$/.test(code);
    }

    /**
     * Получить исходный код выражения
     */
    public getCode(): string {
        return this.code;
    }

    /**
     * Найти все Observable, используемые в выражении.
     * Например, для "user.name + user.age" вернёт [Observable(user)]
     */
    public findObservables(scope: Scope): Observable<any>[] {
        const context = scope.getVariables();
        const observables: Observable<any>[] = [];
        const seen = new Set<Observable<any>>();

        // Извлекаем идентификаторы из выражения
        const identifiers = this.extractIdentifiers(this.code);

        for (const id of identifiers) {
            const value = context[id];
            if (isObservable(value) && !seen.has(value)) {
                seen.add(value);
                observables.push(value);
            }
        }

        return observables;
    }

    /**
     * Извлечь идентификаторы верхнего уровня из выражения.
     * "user.name + count" -> ["user", "count"]
     */
    private extractIdentifiers(code: string): string[] {
        const identifiers: string[] = [];
        // Regex для идентификаторов (не после точки)
        const regex = /(?<![.\w])([a-zA-Z_$][a-zA-Z0-9_$]*)/g;
        
        // Список встроенных глобальных объектов, которые нужно игнорировать
        const builtins = new Set([
            'true', 'false', 'null', 'undefined', 'NaN', 'Infinity',
            'Math', 'Date', 'JSON', 'Array', 'Object', 'String', 'Number', 'Boolean',
            'parseInt', 'parseFloat', 'isNaN', 'isFinite',
            'encodeURIComponent', 'decodeURIComponent', 'encodeURI', 'decodeURI',
            'console', 'window', 'document', 'this',
            'if', 'else', 'for', 'while', 'do', 'switch', 'case', 'break', 'continue',
            'return', 'function', 'const', 'let', 'var', 'new', 'typeof', 'instanceof',
            'in', 'of', 'async', 'await', 'try', 'catch', 'finally', 'throw'
        ]);

        let match;
        while ((match = regex.exec(code)) !== null) {
            const id = match[1];
            if (!builtins.has(id) && !identifiers.includes(id)) {
                identifiers.push(id);
            }
        }

        return identifiers;
    }

    /**
     * Трансформировать код, разворачивая Observable.
     * "user.name" -> "user.getObject().name" (если user - Observable)
     */
    public transformCode(scope: Scope): string {
        const context = scope.getVariables();
        let transformedCode = this.code;
        
        // Находим Observable переменные
        const observableVars = new Set<string>();
        for (const [key, value] of Object.entries(context)) {
            if (isObservable(value)) {
                observableVars.add(key);
            }
        }

        if (observableVars.size === 0) {
            return transformedCode;
        }

        // Трансформируем: user.name -> user.getObject().name
        // и user (само по себе) -> user.getObject()
        for (const varName of observableVars) {
            // user.property -> user.getObject().property
            const propRegex = new RegExp(`\\b${varName}\\.(?!getObject|setObject|subscribe|unsubscribe|getObserver|getMutationObserver|subscribeMutation|unsubscribeMutation)`, 'g');
            transformedCode = transformedCode.replace(propRegex, `${varName}.getObject().`);
            
            // Если просто user без вызова метода, не трансформируем (может быть намеренно)
        }

        return transformedCode;
    }

    /**
     * Выполнить выражение в контексте Scope.
     * @param scope - Scope с переменными и функциями
     * @param extraVars - дополнительные переменные (например, event для @on)
     * @returns результат выполнения
     */
    public execute(scope: Scope, extraVars?: Record<string, any>): any {
        const context = scope.getVariables();
        
        if (extraVars) {
            Object.assign(context, extraVars);
        }

        try {
            // Трансформируем код для автоматического разворачивания Observable
            const transformedCode = this.transformCode(scope);
            return this.executeInContext(context, transformedCode);
        } catch (error) {
            console.error(`[Expression] Error executing: ${this.code}`);
            console.error(error);
            return undefined;
        }
    }

    /**
     * Выполнить выражение асинхронно
     */
    public async executeAsync(scope: Scope, extraVars?: Record<string, any>): Promise<any> {
        const context = scope.getVariables();
        
        if (extraVars) {
            Object.assign(context, extraVars);
        }

        try {
            const transformedCode = this.transformCode(scope);
            return await this.executeInContextAsync(context, transformedCode);
        } catch (error) {
            console.error(`[Expression] Error executing async: ${this.code}`);
            console.error(error);
            return undefined;
        }
    }

    /**
     * Выполнить в контексте (синхронно)
     */
    private executeInContext(context: Record<string, any>, codeOverride?: string): any {
        const keys = Object.keys(context);
        const values = Object.values(context);
        const codeToExecute = codeOverride ?? this.code;

        let functionBody: string;

        if (this.hasReturn) {
            // Code contains return, wrap in function directly
            functionBody = codeToExecute;
        } else {
            // No return, add implicit return
            functionBody = `return (${codeToExecute})`;
        }

        try {
            // Create function with context variables as parameters
            const fn = new Function(...keys, functionBody);
            return fn.apply(null, values);
        } catch (syntaxError) {
            // If implicit return fails, try without it (for statements)
            if (!this.hasReturn) {
                try {
                    const fn = new Function(...keys, codeToExecute);
                    return fn.apply(null, values);
                } catch {
                    throw syntaxError;
                }
            }
            throw syntaxError;
        }
    }

    /**
     * Выполнить в контексте (асинхронно)
     */
    private async executeInContextAsync(context: Record<string, any>, codeOverride?: string): Promise<any> {
        const keys = Object.keys(context);
        const values = Object.values(context);
        const codeToExecute = codeOverride ?? this.code;

        let functionBody: string;

        if (this.hasReturn) {
            functionBody = codeToExecute;
        } else {
            functionBody = `return (${codeToExecute})`;
        }

        try {
            // Create async function
            const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;
            const fn = new AsyncFunction(...keys, functionBody);
            return await fn.apply(null, values);
        } catch (syntaxError) {
            if (!this.hasReturn) {
                try {
                    const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;
                    const fn = new AsyncFunction(...keys, codeToExecute);
                    return await fn.apply(null, values);
                } catch {
                    throw syntaxError;
                }
            }
            throw syntaxError;
        }
    }

    /**
     * Проверить, является ли выражение асинхронным
     */
    public isAsyncExpression(): boolean {
        return this.isAsync;
    }

    /**
     * Выполнить выражение (авто-выбор sync/async)
     */
    public eval(scope: Scope, extraVars?: Record<string, any>): any | Promise<any> {
        if (this.isAsync) {
            return this.executeAsync(scope, extraVars);
        }
        return this.execute(scope, extraVars);
    }

    /**
     * Статический метод для быстрого выполнения
     */
    public static evaluate(code: string, scope: Scope, extraVars?: Record<string, any>): any {
        const expr = new Expression(code);
        return expr.eval(scope, extraVars);
    }

    /**
     * Статический метод для асинхронного выполнения
     */
    public static async evaluateAsync(code: string, scope: Scope, extraVars?: Record<string, any>): Promise<any> {
        const expr = new Expression(code);
        return await expr.executeAsync(scope, extraVars);
    }
}

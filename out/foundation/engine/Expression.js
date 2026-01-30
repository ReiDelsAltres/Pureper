import { isObservable } from '../api/Observer.js';
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
    code;
    isAsync;
    hasReturn;
    constructor(code) {
        this.code = code.trim();
        this.isAsync = this.detectAsync(this.code);
        this.hasReturn = this.detectReturn(this.code);
    }
    /**
     * Определить, содержит ли код await
     */
    detectAsync(code) {
        // Simple check for await keyword (not in string)
        return /\bawait\s+/.test(code);
    }
    /**
     * Определить, содержит ли код return
     */
    detectReturn(code) {
        // Check for return keyword followed by space, semicolon, or end
        return /\breturn\s+/.test(code) || /\breturn;/.test(code) || /\breturn$/.test(code);
    }
    /**
     * Получить исходный код выражения
     */
    getCode() {
        return this.code;
    }
    /**
     * Найти все Observable, используемые в выражении.
     * Например, для "user.name + user.age" вернёт [Observable(user)]
     */
    findObservables(scope) {
        const context = scope.getVariables();
        const observables = [];
        const seen = new Set();
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
    extractIdentifiers(code) {
        const identifiers = [];
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
    transformCode(scope) {
        const context = scope.getVariables();
        let transformedCode = this.code;
        // Находим Observable переменные
        const observableVars = new Set();
        for (const [key, value] of Object.entries(context)) {
            if (isObservable(value)) {
                observableVars.add(key);
            }
        }
        // Трансформируем Observable: user.name -> user.getObject().name
        for (const varName of observableVars) {
            const propRegex = new RegExp(`\\b${varName}\\.(?!getObject|setObject|subscribe|unsubscribe|getObserver|getMutationObserver|subscribeMutation|unsubscribeMutation)`, 'g');
            transformedCode = transformedCode.replace(propRegex, `${varName}.getObject().`);
        }
        return transformedCode;
    }
    /**
     * Выполнить выражение в контексте Scope.
     * @param scope - Scope с переменными и функциями
     * @param extraVars - дополнительные переменные (например, event для @on)
     * @returns результат выполнения
     */
    execute(scope, extraVars) {
        const context = scope.getVariables();
        if (extraVars) {
            Object.assign(context, extraVars);
        }
        try {
            // Трансформируем код для автоматического разворачивания Observable
            const transformedCode = this.transformCode(scope);
            return this.executeInContext(context, transformedCode);
        }
        catch (error) {
            console.error(`[Expression] Error executing: ${this.code}`);
            console.error(error);
            return undefined;
        }
    }
    /**
     * Выполнить выражение асинхронно
     */
    async executeAsync(scope, extraVars) {
        const context = scope.getVariables();
        if (extraVars) {
            Object.assign(context, extraVars);
        }
        try {
            const transformedCode = this.transformCode(scope);
            return await this.executeInContextAsync(context, transformedCode);
        }
        catch (error) {
            console.error(`[Expression] Error executing async: ${this.code}`);
            console.error(error);
            return undefined;
        }
    }
    /**
     * Выполнить в контексте (синхронно)
     */
    executeInContext(context, codeOverride) {
        // Handle reserved keywords used as variable names (e.g., "super")
        const reservedKeywords = ['super', 'this', 'arguments'];
        const keyMapping = {};
        const keys = Object.keys(context).map(key => {
            if (reservedKeywords.includes(key)) {
                const safeKey = `__${key}__`;
                keyMapping[key] = safeKey;
                return safeKey;
            }
            return key;
        });
        const values = Object.values(context);
        let codeToExecute = codeOverride ?? this.code;
        // Replace reserved keywords in code with safe alternatives
        for (const [original, safe] of Object.entries(keyMapping)) {
            const regex = new RegExp(`\\b${original}\\b`, 'g');
            codeToExecute = codeToExecute.replace(regex, safe);
        }
        let functionBody;
        if (this.hasReturn) {
            // Code contains return, wrap in function directly
            functionBody = codeToExecute;
        }
        else {
            // No return, add implicit return
            functionBody = `return (${codeToExecute})`;
        }
        try {
            // Create function with context variables as parameters
            const fn = new Function(...keys, functionBody);
            return fn.apply(null, values);
        }
        catch (syntaxError) {
            // If implicit return fails, try without it (for statements)
            if (!this.hasReturn) {
                try {
                    const fn = new Function(...keys, codeToExecute);
                    return fn.apply(null, values);
                }
                catch {
                    throw syntaxError;
                }
            }
            throw syntaxError;
        }
    }
    /**
     * Выполнить в контексте (асинхронно)
     */
    async executeInContextAsync(context, codeOverride) {
        // Handle reserved keywords used as variable names (e.g., "super")
        const reservedKeywords = ['super', 'this', 'arguments'];
        const keyMapping = {};
        const keys = Object.keys(context).map(key => {
            if (reservedKeywords.includes(key)) {
                const safeKey = `__${key}__`;
                keyMapping[key] = safeKey;
                return safeKey;
            }
            return key;
        });
        const values = Object.values(context);
        let codeToExecute = codeOverride ?? this.code;
        // Replace reserved keywords in code with safe alternatives
        for (const [original, safe] of Object.entries(keyMapping)) {
            const regex = new RegExp(`\\b${original}\\b`, 'g');
            codeToExecute = codeToExecute.replace(regex, safe);
        }
        let functionBody;
        if (this.hasReturn) {
            functionBody = codeToExecute;
        }
        else {
            functionBody = `return (${codeToExecute})`;
        }
        try {
            // Create async function
            const AsyncFunction = Object.getPrototypeOf(async function () { }).constructor;
            const fn = new AsyncFunction(...keys, functionBody);
            return await fn.apply(null, values);
        }
        catch (syntaxError) {
            if (!this.hasReturn) {
                try {
                    const AsyncFunction = Object.getPrototypeOf(async function () { }).constructor;
                    const fn = new AsyncFunction(...keys, codeToExecute);
                    return await fn.apply(null, values);
                }
                catch {
                    throw syntaxError;
                }
            }
            throw syntaxError;
        }
    }
    /**
     * Проверить, является ли выражение асинхронным
     */
    isAsyncExpression() {
        return this.isAsync;
    }
    /**
     * Выполнить выражение (авто-выбор sync/async)
     */
    eval(scope, extraVars) {
        if (this.isAsync) {
            return this.executeAsync(scope, extraVars);
        }
        return this.execute(scope, extraVars);
    }
    /**
     * Статический метод для быстрого выполнения
     */
    static evaluate(code, scope, extraVars) {
        const expr = new Expression(code);
        return expr.eval(scope, extraVars);
    }
    /**
     * Статический метод для асинхронного выполнения
     */
    static async evaluateAsync(code, scope, extraVars) {
        const expr = new Expression(code);
        return await expr.executeAsync(scope, extraVars);
    }
}
//# sourceMappingURL=Expression.js.map
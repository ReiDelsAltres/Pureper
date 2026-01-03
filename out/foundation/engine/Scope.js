/**
 * Scope - класс для работы с контекстом переменных и функций.
 * Поддерживает объединение нескольких Scope, извлечение полей из объектов и классов.
 */
export default class Scope {
    variables = {};
    debugWarnings;
    /** Оригинальный объект для синхронизации refs */
    originalSource = null;
    constructor(options) {
        this.debugWarnings = options?.debugWarnings ?? true;
    }
    /**
     * Получить все переменные Scope как Record
     */
    getVariables() {
        return { ...this.variables };
    }
    /**
     * Установить переменную в Scope
     * @param syncToOriginal - синхронизировать с оригинальным объектом (по умолчанию true)
     */
    set(key, value, syncToOriginal = true) {
        if (this.debugWarnings && key in this.variables && this.variables[key] !== undefined) {
            // Не предупреждаем при установке ref (значение было undefined)
        }
        this.variables[key] = value;
        // Синхронизируем с оригинальным объектом если он есть
        if (syncToOriginal && this.originalSource) {
            this.originalSource[key] = value;
        }
    }
    /**
     * Получить переменную из Scope
     */
    get(key) {
        return this.variables[key];
    }
    /**
     * Проверить наличие переменной
     */
    has(key) {
        return key in this.variables;
    }
    /**
     * Удалить переменную из Scope
     */
    delete(key) {
        if (key in this.variables) {
            delete this.variables[key];
            return true;
        }
        return false;
    }
    /**
     * Объединить другой Scope или объект в текущий Scope.
     * При конфликте имён выводится предупреждение, последнее значение имеет приоритет.
     */
    merge(source) {
        const sourceVars = source instanceof Scope
            ? source.getVariables()
            : this.extractFromObject(source);
        for (const [key, value] of Object.entries(sourceVars)) {
            if (this.debugWarnings && key in this.variables) {
                console.warn(`[Scope] Warning: Variable "${key}" conflict during merge, using new value`);
            }
            this.variables[key] = value;
        }
        return this;
    }
    /**
     * Создать дочерний (локальный) Scope на основе текущего.
     * Изменения в дочернем Scope не влияют на родительский.
     */
    createChild(localVariables) {
        const child = new Scope({ debugWarnings: this.debugWarnings });
        child.variables = { ...this.variables };
        if (localVariables) {
            for (const [key, value] of Object.entries(localVariables)) {
                child.variables[key] = value;
            }
        }
        return child;
    }
    /**
     * Извлечь поля и методы из объекта или экземпляра класса.
     * Пропускает нативные DOM/браузерные прототипы.
     */
    extractFromObject(obj) {
        const ctx = {};
        if (!obj || typeof obj !== 'object') {
            return ctx;
        }
        // Copy own properties
        for (const key of Object.keys(obj)) {
            ctx[key] = obj[key];
        }
        // Copy prototype methods (for class instances)
        let proto = Object.getPrototypeOf(obj);
        while (proto && proto !== Object.prototype) {
            // Avoid copying host (DOM/native) prototype methods which may throw
            const ctorName = proto?.constructor
                ? String(proto.constructor.name ?? '')
                : '';
            if (/HTMLElement|Element|Node|EventTarget|Window|GlobalThis/i.test(ctorName)) {
                proto = Object.getPrototypeOf(proto);
                continue;
            }
            for (const key of Object.getOwnPropertyNames(proto)) {
                if (key === 'constructor' || key in ctx)
                    continue;
                let desc;
                try {
                    desc = Object.getOwnPropertyDescriptor(proto, key);
                }
                catch {
                    continue;
                }
                if (!desc)
                    continue;
                // Only bind plain function values — don't copy getters/setters
                if (typeof desc.value === 'function') {
                    try {
                        ctx[key] = desc.value.bind(obj);
                    }
                    catch {
                        continue;
                    }
                }
            }
            proto = Object.getPrototypeOf(proto);
        }
        return ctx;
    }
    /**
     * Статический метод для создания Scope из объекта
     * Сохраняет ссылку на оригинальный объект для синхронизации refs
     */
    static from(source, options) {
        const scope = new Scope(options);
        scope.originalSource = source;
        scope.merge(source);
        return scope;
    }
    /**
     * Статический метод для объединения нескольких Scope/объектов
     */
    static combine(...sources) {
        const scope = new Scope();
        for (const source of sources) {
            scope.merge(source);
        }
        return scope;
    }
}
//# sourceMappingURL=Scope.js.map
export interface IObserver<T> {
    subscribe(listener: (data: T) => void): void;
    unsubscribe(listener: (data: T) => void): void;
    notify(data: T): void;
}
export interface IMutationObserver<T> {
    subscribe(listener: (oldValue: T, newValue: T) => void): void;
    unsubscribe(listener: (oldValue: T, newValue: T) => void): void;
    notify(oldValue: T, newValue: T): void;
}
export interface IKeyMutationObserver<K, V> {
    subscribe(listener: (key: K, oldValue: V, newValue: V) => void): void;
    unsubscribe(listener: (key: K, oldValue: V, newValue: V) => void): void;
    notify(key: K, oldValue: V, newValue: V): void;
}
export declare class Observer<T> {
    private listeners;
    subscribe(listener: (data: T) => void): void;
    unsubscribe(listener: (data: T) => void): void;
    notify(data: T): void;
}
export declare class MutationObserver<T> implements IMutationObserver<T> {
    private listeners;
    subscribe(listener: (oldValue: T, newValue: T) => void): void;
    unsubscribe(listener: (oldValue: T, newValue: T) => void): void;
    notify(oldValue: T, newValue: T): void;
}
export declare const OBSERVABLE_SYMBOL: unique symbol;
/**
 * Check if a value is an Observable
 */
export declare function isObservable<T = any>(value: any): value is Observable<T>;
/**
 * Observable - простой реактивный контейнер без Proxy.
 *
 * Для доступа к значению используйте getObject():
 *   const user = new Observable({ name: 'Alice', age: 25 });
 *   user.getObject().name  // 'Alice'
 *   user.setObject({ name: 'Bob', age: 30 }); // triggers subscribers
 *
 * В шаблонах синтаксис прозрачный:
 *   @(user.name) - автоматически распознаётся как user.getObject().name
 */
export default class Observable<T> {
    private object;
    private observer;
    private mutationObserver;
    readonly [OBSERVABLE_SYMBOL] = true;
    constructor(object: T);
    getObject(): T;
    getObserver(): Observer<T>;
    getMutationObserver(): MutationObserver<T>;
    subscribe(listener: (data: T) => void): void;
    unsubscribe(listener: (data: T) => void): void;
    /**
     * Subscribe to mutation events (oldValue, newValue)
     */
    subscribeMutation(listener: (oldValue: T, newValue: T) => void): void;
    unsubscribeMutation(listener: (oldValue: T, newValue: T) => void): void;
    setObject(object: T): void;
}
//# sourceMappingURL=Observer.d.ts.map
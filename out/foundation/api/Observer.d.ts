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
export default class Observable<T> {
    private object;
    private observer;
    constructor(object: T);
    getObject(): T;
    getObserver(): Observer<T>;
    subscribe(listener: (data: T) => void): void;
    unsubscribe(listener: (data: T) => void): void;
    setObject(object: T): void;
}
//# sourceMappingURL=Observer.d.ts.map
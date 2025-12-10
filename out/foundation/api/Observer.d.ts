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
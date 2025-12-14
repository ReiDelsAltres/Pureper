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

export class Observer<T> {
    private listeners: Array<(data: T) => void> = [];

    public subscribe(listener: (data: T) => void): void {
        this.listeners.push(listener);
    }
    public unsubscribe(listener: (data: T) => void): void {
        this.listeners = this.listeners.filter(l => l !== listener);
    }

    public notify(data: T): void {
        this.listeners.forEach(listener => listener(data));
    }
}
export default class Observable<T> {
    private object: T;
    private observer: Observer<T> = new Observer<T>();

    constructor(object: T) {
        this.object = object;
    }

    public getObject(): T {
        return this.object;
    }
    public getObserver(): Observer<T> {
        return this.observer;
    }

    public subscribe(listener: (data: T) => void): void {
        this.observer.subscribe(listener);
    }
    public unsubscribe(listener: (data: T) => void): void {
        this.observer.unsubscribe(listener);
    }

    public setObject(object: T): void {
        this.object = object;
        this.observer.notify(this.object);
    }
}
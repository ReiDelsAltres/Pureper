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

export class MutationObserver<T> implements IMutationObserver<T> {
    private listeners: Array<(oldValue: T, newValue: T) => void> = [];

    public subscribe(listener: (oldValue: T, newValue: T) => void): void {
        this.listeners.push(listener);
    }
    public unsubscribe(listener: (oldValue: T, newValue: T) => void): void {
        this.listeners = this.listeners.filter(l => l !== listener);
    }

    public notify(oldValue: T, newValue: T): void {
        this.listeners.forEach(listener => listener(oldValue, newValue));
    }
}

// Symbol to identify Observable instances
export const OBSERVABLE_SYMBOL = Symbol.for('Observable');

/**
 * Check if a value is an Observable
 */
export function isObservable<T = any>(value: any): value is Observable<T> {
    return value && value[OBSERVABLE_SYMBOL] === true;
}

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
    protected object: T;
    protected observer: Observer<T> = new Observer<T>();
    protected mutationObserver: MutationObserver<T> = new MutationObserver<T>();

    // Mark as Observable
    public readonly [OBSERVABLE_SYMBOL] = true;

    constructor(object: T) {
        this.object = object;
    }
    public createDependent<U>(mapper: () => U): Observable<U>;
    public createDependent<U>(mapper: (obj: T) => U): Observable<U>;
    public createDependent<U>(mapper: (obj?: T) => U): Observable<U> {
        const dependent = new Observable<U>(mapper(this.object));
        this.subscribe((newValue) => {
            dependent.setObject(mapper(newValue));
        });
        return dependent;
    }

    public static createDependent<U>(mapper: () => U, source: Observable<any>): Observable<U>;
    public static createDependent<T, U>(mapper: (obj: T) => U, source: Observable<T>): Observable<U>;
    public static createDependent<T, U>(mapper: (obj?: T) => U, source: Observable<T>): Observable<U> {
        const dependent = new Observable<U>(mapper(source.getObject()));
        source.subscribe((newValue) => {
            dependent.setObject(mapper(newValue));
        });
        return dependent;
    }


    public getObject(): T {
        return this.object;
    }

    public getObserver(): Observer<T> {
        return this.observer;
    }

    public getMutationObserver(): MutationObserver<T> {
        return this.mutationObserver;
    }

    public subscribe(listener: (data: T) => void): void {
        this.observer.subscribe(listener);
    }

    public unsubscribe(listener: (data: T) => void): void {
        this.observer.unsubscribe(listener);
    }

    /**
     * Subscribe to mutation events (oldValue, newValue)
     */
    public subscribeMutation(listener: (oldValue: T, newValue: T) => void): void {
        this.mutationObserver.subscribe(listener);
    }

    public unsubscribeMutation(listener: (oldValue: T, newValue: T) => void): void {
        this.mutationObserver.unsubscribe(listener);
    }

    public setObject(object: T, silent: boolean = false): void {
        const oldObject = this.object;
        this.object = object;
        if (!silent) {
            this.observer.notify(this.object);
            this.mutationObserver.notify(oldObject, this.object);
        }
    }
    public updateObject(updater: (obj: T) => T, silent: boolean = false): void {
        const oldObject = this.object;
        this.object = updater(this.object);
        if (!silent) {
            this.observer.notify(this.object);
            this.mutationObserver.notify(oldObject, this.object);
        }
    }

    public transaction(): Transaction<T> {
        return new Transaction<T>(this);
    }
}
export class Transaction<T> {
    private observable: Observable<T>;
    private originalValue: T;
    private transactionValue: T;
    private operations: Array<(obj: T) => T> = [];
    constructor(observable: Observable<T>) {
        this.observable = observable;
        this.originalValue = observable.getObject();
        this.transactionValue = this.originalValue;
    }
    public setObject(object: T, delayed: boolean = false): void {
        this.transactionValue = object;

        if (!delayed) this.operations.push(() => object);
    }
    public updateObject(updater: (obj: T) => T, delayed: boolean = false): void {
        this.transactionValue = updater(this.transactionValue);
        if (!delayed) this.operations.push(updater);
    }
    public commit(): void {
        let newValue = this.transactionValue
        this.operations.forEach(op => {
            newValue = op(newValue);
        });
        this.observable.setObject(newValue);

        this.transactionValue = newValue;
        this.operations = [];

    }
}
export class Observer {
    listeners = [];
    subscribe(listener) {
        this.listeners.push(listener);
    }
    unsubscribe(listener) {
        this.listeners = this.listeners.filter(l => l !== listener);
    }
    notify(data) {
        this.listeners.forEach(listener => listener(data));
    }
}
export class MutationObserver {
    listeners = [];
    subscribe(listener) {
        this.listeners.push(listener);
    }
    unsubscribe(listener) {
        this.listeners = this.listeners.filter(l => l !== listener);
    }
    notify(oldValue, newValue) {
        this.listeners.forEach(listener => listener(oldValue, newValue));
    }
}
// Symbol to identify Observable instances
export const OBSERVABLE_SYMBOL = Symbol.for('Observable');
/**
 * Check if a value is an Observable
 */
export function isObservable(value) {
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
export default class Observable {
    object;
    _mutationObserver = new MutationObserver();
    _wraps = new Map();
    // Mark as Observable
    [OBSERVABLE_SYMBOL] = true;
    constructor(object) {
        this.object = object;
    }
    createDependent(mapper) {
        const dependent = new Observable(mapper(this.object));
        this.subscribe((newValue) => {
            dependent.setObject(mapper(newValue));
        });
        return dependent;
    }
    static createDependent(mapper, source) {
        const dependent = new Observable(mapper(source.getObject()));
        source.subscribe((newValue) => {
            dependent.setObject(mapper(newValue));
        });
        return dependent;
    }
    getObject() {
        return this.object ?? null;
    }
    subscribe(listener) {
        const w = (_o, n) => listener(n);
        this._wraps.set(listener, w);
        this._mutationObserver.subscribe(w);
    }
    unsubscribe(listener) {
        const w = this._wraps.get(listener);
        if (w) {
            this._mutationObserver.unsubscribe(w);
            this._wraps.delete(listener);
        }
    }
    subscribeMutation(listener) {
        this._mutationObserver.subscribe(listener);
    }
    unsubscribeMutation(listener) {
        this._mutationObserver.unsubscribe(listener);
    }
    notifyAll(oldValue, newValue) {
        this._mutationObserver.notify(oldValue, newValue);
    }
    setObject(object, silent = false) {
        const oldObject = this.object;
        this.object = object;
        if (!silent) {
            this.notifyAll(oldObject, this.object);
        }
    }
    updateObject(updater, silent = false) {
        const oldObject = this.object;
        this.object = updater(this.object);
        if (!silent) {
            this.notifyAll(oldObject, this.object);
        }
    }
    transaction() {
        return new Transaction(this);
    }
}
export class Transaction {
    observable;
    originalValue;
    transactionValue;
    operations = [];
    constructor(observable) {
        this.observable = observable;
        this.originalValue = observable.getObject();
        this.transactionValue = this.originalValue;
    }
    setObject(object, delayed = false) {
        this.transactionValue = object;
        if (!delayed)
            this.operations.push(() => object);
    }
    updateObject(updater, delayed = false) {
        this.transactionValue = updater(this.transactionValue);
        if (!delayed)
            this.operations.push(updater);
    }
    commit() {
        let newValue = this.transactionValue;
        this.operations.forEach(op => {
            newValue = op(newValue);
        });
        this.observable.setObject(newValue);
        this.transactionValue = newValue;
        this.operations = [];
    }
}
//# sourceMappingURL=Observer.js.map
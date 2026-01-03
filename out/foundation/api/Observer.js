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
    observer = new Observer();
    mutationObserver = new MutationObserver();
    // Mark as Observable
    [OBSERVABLE_SYMBOL] = true;
    constructor(object) {
        this.object = object;
    }
    getObject() {
        return this.object;
    }
    getObserver() {
        return this.observer;
    }
    getMutationObserver() {
        return this.mutationObserver;
    }
    subscribe(listener) {
        this.observer.subscribe(listener);
    }
    unsubscribe(listener) {
        this.observer.unsubscribe(listener);
    }
    /**
     * Subscribe to mutation events (oldValue, newValue)
     */
    subscribeMutation(listener) {
        this.mutationObserver.subscribe(listener);
    }
    unsubscribeMutation(listener) {
        this.mutationObserver.unsubscribe(listener);
    }
    setObject(object) {
        const oldObject = this.object;
        this.object = object;
        this.observer.notify(this.object);
        this.mutationObserver.notify(oldObject, this.object);
    }
}
//# sourceMappingURL=Observer.js.map
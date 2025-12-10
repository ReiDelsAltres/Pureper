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
export default class Observable {
    object;
    observer = new Observer();
    constructor(object) {
        this.object = object;
    }
    getObject() {
        return this.object;
    }
    getObserver() {
        return this.observer;
    }
    subscribe(listener) {
        this.observer.subscribe(listener);
    }
    unsubscribe(listener) {
        this.observer.unsubscribe(listener);
    }
    setObject(object) {
        this.object = object;
        this.observer.notify(this.object);
    }
}
//# sourceMappingURL=Observer.js.map
import Observable from "../api/Observer.js";
export default class Attribute extends Observable {
    component;
    _name;
    _defaultValue;
    constructor(component, name, value) {
        super(value);
        this.component = component;
        this.component["_attributes"].push(this);
        this._name = name;
        this._defaultValue = value;
    }
    notify(oldValue, newValue) {
        this.notifyAll(oldValue, newValue);
    }
    initialize(initValue) {
        this.value = initValue ?? this._defaultValue;
        if (this.component.observedAttributes === undefined)
            this.component.observedAttributes = [];
        this.component.observedAttributes.push(this._name);
    }
    /*--------------------------------------------------------------------------|
    |---------------------------------PUBLIC-API--------------------------------|
    |--------------------------------------------------------------------------*/
    get name() {
        return this._name;
    }
    get value() {
        return this.getObject();
    }
    set value(val) {
        this.setObject(val);
    }
    getObject() {
        return this.object ?? this._defaultValue;
    }
    setObject(val, silent = false) {
        if (val === this.object)
            return;
        const oldObject = this.object;
        this.object = val;
        if (typeof val === "boolean") {
            if (val)
                this.component.setAttribute(this._name, "");
            else
                this.component.removeAttribute(this._name);
        }
        else if (typeof val === "string") {
            if (this._defaultValue === this.object)
                this.component.removeAttribute(this._name);
            else
                this.component.setAttribute(this._name, val);
        }
        else {
            if (this._defaultValue === this.object)
                this.component.removeAttribute(this._name);
            else if (this.object != null)
                this.component.setAttribute(this._name, this.object.toString());
            else
                this.component.removeAttribute(this._name);
        }
        if (!silent) {
            this.notifyAll(oldObject, this.object);
        }
    }
    updateObject(updater, silent = false) {
        this.setObject(updater(this.value), silent);
    }
    isDefault() {
        return this.value === this._defaultValue;
    }
    isExist() {
        return this.value !== undefined && this.value !== null && this.value !== "";
    }
    subscribe(listener) {
        if (listener.length <= 1) {
            const w = (_o, n) => listener(n);
            this._wraps.set(listener, w);
            this._mutationObserver.subscribe(w);
        }
        else {
            const w = (o, n) => listener(this._name, o, n);
            this._wraps.set(listener, w);
            this._mutationObserver.subscribe(w);
        }
    }
    unsubscribe(listener) {
        const w = this._wraps.get(listener);
        if (w) {
            this._mutationObserver.unsubscribe(w);
            this._wraps.delete(listener);
        }
    }
}
//# sourceMappingURL=Attribute.js.map
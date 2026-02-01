import Observable from "../api/Observer.js";
export default class Attribute extends Observable {
    component;
    listeners = [];
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
        this.listeners.forEach(listener => listener(oldValue, newValue));
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
        if (!silent)
            this.notify(this.value, val);
        this.object = val;
        if (typeof val === "boolean") {
            if (val)
                this.component.setAttribute(this._name, "");
            else
                this.component.removeAttribute(this._name);
            return;
        }
        if (typeof val === "string") {
            if (this._defaultValue === this.value)
                this.component.removeAttribute(this._name);
            else
                this.component.setAttribute(this._name, val);
        }
        if (this._defaultValue === this.value)
            this.component.removeAttribute(this._name);
        else
            this.component.setAttribute(this._name, val.toString());
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
        this.listeners.push((o, n) => listener(this._name, o, n));
    }
    unsubscribe(listener) {
        this.listeners = this.listeners.filter(l => l !== listener);
    }
}
//# sourceMappingURL=Attribute.js.map
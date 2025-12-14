export default class Attribute {
    component;
    listeners = [];
    _name;
    _defaultValue;
    _value;
    constructor(component, name, value) {
        this.component = component;
        this.component["_attributes"].push(this);
        this._name = name;
        this._defaultValue = value;
        this._value = value;
    }
    notify(oldValue, newValue) {
        this.listeners.forEach(listener => listener(oldValue, newValue));
    }
    initialize(initValue) {
        this._value = initValue ?? this._defaultValue;
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
        return this._value ?? this._defaultValue;
    }
    set value(val) {
        if (val === this._value)
            return;
        this.notify(this.value, val);
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
    subscribe(listener) {
        this.listeners.push((o, n) => listener(this._name, o, n));
    }
    unsubscribe(listener) {
        this.listeners = this.listeners.filter(l => l !== listener);
    }
}
//# sourceMappingURL=Attribute.js.map
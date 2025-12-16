import { IKeyMutationObserver } from "../api/Observer.js";
import Component from "./Component.js";

export default class Attribute<T = any> {
    private component!: Component;
    private listeners: Array<(oldValue: string | T, newValue: string | T) => void> = [];

    private _name: string;

    private _defaultValue!: T | string;
    private _value?: T | string;

    constructor(component: Component, name: string, value?: T) {
        this.component = component;
        this.component["_attributes"].push(this);

        this._name = name;

        this._defaultValue = value;
        this._value = value;
    }

        
    private notify(oldValue: string | T, newValue: string | T): void {
        this.listeners.forEach(listener => listener(oldValue, newValue));
    }

    private initialize(initValue: T | string) {
        this._value = initValue ?? this._defaultValue;
        if ((this.component as any).observedAttributes === undefined)
            (this.component as any).observedAttributes = [];
        (this.component as any).observedAttributes.push(this._name);
    }

    /*--------------------------------------------------------------------------|
    |---------------------------------PUBLIC-API--------------------------------|
    |--------------------------------------------------------------------------*/


    public get name() {
        return this._name;
    }

    public get value(): T | string {
        return this._value ?? this._defaultValue;
    }

    public set value(val: T | string) {
        if (val === this._value) return;
        this.notify(this.value, val);

        if (typeof val === "boolean") {
            if (val) this.component.setAttribute(this._name, "");
            else this.component.removeAttribute(this._name);
            return;
        }
        if (typeof val === "string") {
            if (this._defaultValue === this.value) this.component.removeAttribute(this._name);
            else this.component.setAttribute(this._name, val);
        }

        if (this._defaultValue === this.value) this.component.removeAttribute(this._name);
        else this.component.setAttribute(this._name, val.toString());
    }

    public isDefault(): boolean {
        return this.value === this._defaultValue;
    }
    public isExist(): boolean {
        return this.value !== undefined && this.value !== null && this.value !== "";
    }

    public subscribe(listener: (key: string, oldValue: string | T, newValue: string | T) => void): void {
        this.listeners.push((o,n) => listener(this._name, o, n));
    }
    public unsubscribe(listener: (key: string, oldValue: string | T, newValue: string | T) => void): void {
        this.listeners = this.listeners.filter(l => l !== listener);
    }
}
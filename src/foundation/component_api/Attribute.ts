import Observable, { IKeyMutationObserver } from "../api/Observer.js";
import Component from "./Component.js";

export default class Attribute<T = any> extends Observable<T | string> implements IKeyMutationObserver<string, T | string> {
    private component!: Component;

    private _name: string;

    private _defaultValue!: T | string;

    constructor(component: Component, name: string, value?: T) {
        super(value);
        this.component = component;
        this.component["_attributes"].push(this);

        this._name = name;

        this._defaultValue = value;
    }


    public notify(oldValue: string | T, newValue: string | T): void {
        this.notifyAll(oldValue, newValue);
    }

    private initialize(initValue: T | string) {
        this.value = initValue ?? this._defaultValue;
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
        return this.getObject();
    }

    public set value(val: T | string) {
        this.setObject(val);
    }

    public getObject(): string | T {
        return this.object ?? this._defaultValue;
    }

    public setObject(val: string | T, silent: boolean = false): void {
        if (val === this.object) return;
        const oldObject = this.object;
        this.object = val;

        if (typeof val === "boolean") {
            if (val) this.component.setAttribute(this._name, "");
            else this.component.removeAttribute(this._name);
        } else if (typeof val === "string") {
            if (this._defaultValue === this.object) this.component.removeAttribute(this._name);
            else this.component.setAttribute(this._name, val);
        } else {
            if (this._defaultValue === this.object) this.component.removeAttribute(this._name);
            else if (this.object != null) this.component.setAttribute(this._name, (this.object as any).toString());
            else this.component.removeAttribute(this._name);
        }

        if (!silent) {
            this.notifyAll(oldObject, this.object);
        }
    }
    public updateObject(updater: (obj: string | T) => string | T, silent: boolean = false): void {
        this.setObject(updater(this.value), silent);
    }

    public isDefault(): boolean {
        return this.value === this._defaultValue;
    }
    public isExist(): boolean {
        return this.value !== undefined && this.value !== null && this.value !== "";
    }

    public subscribe(listener: (key: string, oldValue: string | T, newValue: string | T) => void): void;
    public subscribe(listener: (newValue: string | T) => void): void;
    public subscribe(listener: Function): void {
        if (listener.length <= 1) {
            const w = (_o: string | T, n: string | T) => (listener as any)(n);
            this._wraps.set(listener, w as any);
            this._mutationObserver.subscribe(w as any);
        } else {
            const w = (o: string | T, n: string | T) => (listener as any)(this._name, o, n);
            this._wraps.set(listener, w as any);
            this._mutationObserver.subscribe(w as any);
        }
    }
    public unsubscribe(listener: (key: string, oldValue: string | T, newValue: string | T) => void): void;
    public unsubscribe(listener: (newValue: string | T) => void): void;
    public unsubscribe(listener: Function): void {
        const w = this._wraps.get(listener);
        if (w) {
            this._mutationObserver.unsubscribe(w as any);
            this._wraps.delete(listener);
        }
    }
}
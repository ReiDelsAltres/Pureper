import Observable, { IKeyMutationObserver } from "../api/Observer.js";
import Component from "./Component.js";
export default class Attribute<T = any> extends Observable<T | string> implements IKeyMutationObserver<string, T | string> {
    private component;
    private listeners;
    private _name;
    private _defaultValue;
    constructor(component: Component, name: string, value?: T);
    notify(oldValue: string | T, newValue: string | T): void;
    private initialize;
    get name(): string;
    get value(): T | string;
    set value(val: T | string);
    getObject(): string | T;
    setObject(val: string | T, silent?: boolean): void;
    updateObject(updater: (obj: string | T) => string | T, silent?: boolean): void;
    isDefault(): boolean;
    isExist(): boolean;
    subscribe(listener: (key: string, oldValue: string | T, newValue: string | T) => void): void;
    unsubscribe(listener: (key: string, oldValue: string | T, newValue: string | T) => void): void;
}
//# sourceMappingURL=Attribute.d.ts.map
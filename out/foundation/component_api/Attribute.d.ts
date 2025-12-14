import Component from "./Component.js";
export default class Attribute<T = any> {
    private component;
    private listeners;
    private _name;
    private _defaultValue;
    private _value?;
    constructor(component: Component, name: string, value?: T);
    private notify;
    private initialize;
    get name(): string;
    get value(): T | string;
    set value(val: T | string);
    subscribe(listener: (key: string, oldValue: string | T, newValue: string | T) => void): void;
    unsubscribe(listener: (key: string, oldValue: string | T, newValue: string | T) => void): void;
}
//# sourceMappingURL=Attribute.d.ts.map
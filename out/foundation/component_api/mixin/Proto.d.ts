import Lazy from "../../../foundation/api/Lazy.js";
declare class ClassBuilder<T extends Constructor> {
    private base;
    constructor(base: T);
    extend<U extends Constructor>(extend: U): ClassBuilder<T>;
    extendAbstract<U extends AbstractConstructor>(extend: U): ClassBuilder<T>;
    build(): {
        new (...args: any[]): {};
    } & T;
}
export type Mixined = {
    super: Super;
    getMixin<T extends Constructor>(ctor: T): ClassHolder<T> | undefined;
};
interface Super {
    [key: string]: ClassHolder;
}
interface ClassHolder<T extends Constructor = any> {
    class: T;
    instance: Lazy<InstanceType<T>>;
}
export type AnyConstructor<T = {}> = Constructor<T> | LazyConstructor<T>;
export type Constructor<T = {}> = (new (...args: any[]) => T);
export type LazyConstructor<T = {}> = (new () => T);
export type ConcreteConstructor<T = any> = {
    new (...args: any[]): T;
} & AbstractConstructor<T>;
export type AbstractConstructor<T = any> = Function & {
    prototype: T;
};
export declare function Class<T extends Constructor>(Base: T): ClassBuilder<T>;
export {};
//# sourceMappingURL=Proto.d.ts.map
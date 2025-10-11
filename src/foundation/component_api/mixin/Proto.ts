import Lazy  from "../../../foundation/api/Lazy.js";
class ClassBuilder<T extends Constructor> {
    constructor(private base: T) { }

    public extend<U extends Constructor>(extend: U): ClassBuilder<T> {
        const proto = this.base.prototype;

        Object.getOwnPropertyNames(extend.prototype).forEach(name => {
            if (name !== 'constructor') {
                Object.defineProperty(proto, name, Object.getOwnPropertyDescriptor(extend.prototype, name) as PropertyDescriptor);
            }
        });


        this.base = class extends this.base {
            constructor(...args: any[]) {
                super(...args);

                var map : Super = {};
                var classHolder : ClassHolder<U> = 
                    { class: extend, instance: new Lazy<any>(() => new extend(...args)) };

                if (!this.hasOwnProperty('super'))
                    (this as any).super = map;
                (this as any).super[extend.name] = classHolder;
                if (!this.hasOwnProperty('getMixin')) {
                    (this as any).getMixin = function <T extends Constructor>(ctor : T): ClassHolder<T> | undefined {
                        return (this as any).super?.[ctor.name];
                    }
                }

                Object.assign(this, classHolder.instance.get());
            }
        };
        return this;
    }
    public extendAbstract<U extends AbstractConstructor>(extend: U): ClassBuilder<T> {
        let concrete = extend as unknown as ConcreteConstructor;
        return this.extend(concrete);
    }

    public build() {
        return class extends this.base {
        };
    }
}
export type Mixined = { 
    super: Super;
    getMixin<T extends Constructor>(ctor : T): ClassHolder<T> | undefined;
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
export type ConcreteConstructor<T = any> = { new(...args: any[]): T } & AbstractConstructor<T>;
export type AbstractConstructor<T = any> = Function & { prototype: T }

export function Class<T extends Constructor>(Base: T) {
    return new ClassBuilder(Base);
}
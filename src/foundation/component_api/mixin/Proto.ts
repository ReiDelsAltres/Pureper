class ClassBuilder<T extends Constructor> {
    constructor(private base: T) {
    }

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
                Object.assign(this, new extend(...args));
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

export type Constructor<T = {}> = new (...args: any[]) => T;
export type ConcreteConstructor<T = any> = { new (...args: any[]) : T } & AbstractConstructor<T>;
export type AbstractConstructor<T = any> = Function & { prototype: T }

export function Class<T extends Constructor>(Base: T) {
    return new ClassBuilder(Base);
}
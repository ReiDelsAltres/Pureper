class ClassBuilder {
    constructor(base) {
        this.base = base;
    }
    extend(extend) {
        const proto = this.base.prototype;
        Object.getOwnPropertyNames(extend.prototype).forEach(name => {
            if (name !== 'constructor') {
                Object.defineProperty(proto, name, Object.getOwnPropertyDescriptor(extend.prototype, name));
            }
        });
        this.base = class extends this.base {
            constructor(...args) {
                super(...args);
                Object.assign(this, new extend(...args));
            }
        };
        return this;
    }
    extendAbstract(extend) {
        let concrete = extend;
        return this.extend(concrete);
    }
    build() {
        return class extends this.base {
        };
    }
}
export function Class(Base) {
    return new ClassBuilder(Base);
}
//# sourceMappingURL=Proto.js.map
import Lazy from "../../../foundation/api/Lazy.js";
class ClassBuilder {
    base;
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
                var map = {};
                var classHolder = { class: extend, instance: new Lazy(() => new extend(...args)) };
                if (!this.hasOwnProperty('super'))
                    this.super = map;
                this.super[extend.name] = classHolder;
                if (!this.hasOwnProperty('getMixin')) {
                    this.getMixin = function (ctor) {
                        return this.super?.[ctor.name];
                    };
                }
                Object.assign(this, classHolder.instance.get());
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
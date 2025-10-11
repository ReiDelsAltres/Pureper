export default class Lazy {
    constructor(factory) {
        this.factory = factory;
    }
    get(...args) {
        if (this._value === undefined) {
            this._value = this.factory(...args);
        }
        return this._value;
    }
}
//# sourceMappingURL=Lazy.js.map
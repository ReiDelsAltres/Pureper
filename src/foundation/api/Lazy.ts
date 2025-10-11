export default class Lazy<T, Args extends any[] = []> {
    private _value?: T;

    constructor(private readonly factory: (...args: Args) => T) { }

    get(...args: Args): T {
        if (this._value === undefined) {
            this._value = this.factory(...args);
        }
        return this._value;
    }
}
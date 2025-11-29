export default class Lazy<T, Args extends any[] = []> {
    private readonly factory;
    private _value?;
    constructor(factory: (...args: Args) => T);
    get(...args: Args): T;
}
//# sourceMappingURL=Lazy.d.ts.map
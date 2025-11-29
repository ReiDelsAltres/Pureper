export default class MixinTest {
    constructor() {
        Object.assign(this, new Super1(), new Super2());
    }
}
export default interface MixinTest extends Super1, Super2 {}

class Super1 {
    super1Prop = "super1";
    super1Method() {
        console.log(this.super1Prop);
    }
}
class Super2 {
    super2Prop = "super2";
    super2Method() {
        console.log(this.super2Prop);
    }
}

function applyMixins(derivedCtor: any, baseCtors: any[]) {
    baseCtors.forEach(baseCtor => {
        Object.getOwnPropertyNames(baseCtor.prototype).forEach(name => {
            derivedCtor.prototype[name] = baseCtor.prototype[name];
        });
    });
}

applyMixins(MixinTest, [Super1, Super2]);

let Mixed: MixinTest = new MixinTest();
Mixed.super1Method();
Mixed.super2Method();

console.log(Mixed);
import { Class } from "../src/foundation/component_api/mixin/Proto";
class Base {
    baseProp = "base";
    baseMethod() {
        console.log(this.baseProp);
}
}
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

abstract class AbstractSuper {
    abstract superAbstractProp: string;
    superAbstractConcreteProp = "concrete";

    abstract superAbstractMethod(): void;
    superAbstractConcreteMethod() {
        console.log(this.superAbstractConcreteProp);
        //console.log(this.superAbstractProp);
        console.log("This is a concrete method in an abstract class.");
    }
}

class MixinTest extends Class(Base)
    .extend(Super1)
    .extend(Super2)
    .extendAbstract(AbstractSuper).build() {
}

interface MixinTest extends Super1, Super2, AbstractSuper {}

let mixinInstance = new MixinTest();
mixinInstance.baseMethod(); // Outputs: base
mixinInstance.super1Method(); // Outputs: super1
mixinInstance.super2Method(); // Outputs: super2

mixinInstance.superAbstractConcreteMethod(); // Outputs: concrete, undefined, This is a concrete method in an abstract class.
mixinInstance.superAbstractMethod = function() {
    this.superAbstractProp = "superAbstract";
    console.log(this.superAbstractProp);
}
mixinInstance.superAbstractMethod(); // Outputs: superAbstract


console.log(mixinInstance);
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import Component from "../foundation/component_api/Component.js";
import { ReComponent } from "../foundation/TripletDecorator.js";
let Test = class Test extends Component {
};
Test = __decorate([
    ReComponent({
        markup: `<slot></slot>`,
        jsURL: "src/components/ContainItSelfTest.ts",
    }, "contain-it-self-test")
], Test);
export default Test;
//# sourceMappingURL=ContainItSelfTest.js.map
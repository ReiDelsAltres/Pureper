var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import Attribute from "../foundation/component_api/Attribute.js";
import Component from "../foundation/component_api/Component.js";
import { ReComponent } from "../foundation/TripletDecorator.js";
let DynamicBlock = class DynamicBlock extends Component {
    ruleFor = new Attribute(this, "for", false);
    ruleForIndex = new Attribute(this, "idx");
    ruleForVariable = new Attribute(this, "var");
    ruleForIterable = new Attribute(this, "in");
    async preLoad(holder) {
        const template = "aaa";
        console.log("DynamicBlock preLoad", this.ruleFor.value, this.ruleForIndex.value, this.ruleForVariable.value, this.ruleForIterable.value);
        this.querySelectorAll("template").forEach(tpl => {
            holder.element.prepend(tpl.cloneNode(true));
            tpl.remove();
        });
    }
};
DynamicBlock = __decorate([
    ReComponent({
        markup: "<slot></slot>",
        jsURL: "src/components/DynamicBlock.js",
        class: DynamicBlock,
    }, "dynamic-block")
], DynamicBlock);
export default DynamicBlock;
//# sourceMappingURL=DynamicBlock.js.map
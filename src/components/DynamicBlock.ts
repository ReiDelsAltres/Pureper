import IElementHolder from "../foundation/api/ElementHolder.js";
import Attribute from "../foundation/component_api/Attribute.js";
import Component from "../foundation/component_api/Component.js";
import { ReComponent } from "../foundation/TripletDecorator.js";

@ReComponent({
    markup: "<slot></slot>",
    jsURL: "src/components/DynamicBlock.js",
    class: DynamicBlock,
}, "dynamic-block")
export default class DynamicBlock extends Component {
    private ruleFor: Attribute<boolean> = new Attribute<boolean>(this, "for", false);
    private ruleForIndex: Attribute<string> = new Attribute<string>(this, "idx");
    private ruleForVariable: Attribute<string> = new Attribute<string>(this, "var");
    private ruleForIterable: Attribute<string> = new Attribute<string>(this, "in");

    protected async preLoad(holder: IElementHolder): Promise<void> {
        const template = "aaa";
        console.log("DynamicBlock preLoad", this.ruleFor.value, this.ruleForIndex.value, this.ruleForVariable.value, this.ruleForIterable.value);
        this.querySelectorAll("template").forEach(tpl => {
            holder.element.prepend(tpl.cloneNode(true));
            tpl.remove();
        });
    }
}
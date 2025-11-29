import IElementHolder from "../foundation/api/ElementHolder.js";
import Page from "../foundation/component_api/Page.js";

export default class TestingSubPage extends Page {
    private search? : string;
    public constructor(one? : string, two?: string) {
        super();
    }
    protected preLoad(holder: IElementHolder): Promise<void> {
        holder.element.querySelector("#hash")!.textContent = this.search || "";
        return Promise.resolve();
    }
}

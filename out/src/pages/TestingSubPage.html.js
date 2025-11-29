import Page from "../foundation/component_api/Page.js";
export default class TestingSubPage extends Page {
    constructor(one, two) {
        super();
    }
    preLoad(holder) {
        holder.element.querySelector("#hash").textContent = this.search || "";
        return Promise.resolve();
    }
}
//# sourceMappingURL=TestingSubPage.html.js.map
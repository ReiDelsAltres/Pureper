import Page from '../foundation/component_api/Page.js';
export default class DebuggerPage extends Page {
    constructor() {
        this.componentRegistry = {};
    }
    async preLoadJS() {
        await super.preLoadJS();
        this.componentRegistry = await Fetcher.fetchJSON('./data/componentRegistry.json');
    }
    async postLoadJS(element) {
        await super.postLoadJS(element);
    }
}
//# sourceMappingURL=DebuggerPage.html.js.map
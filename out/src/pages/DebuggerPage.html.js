import Page from '../foundation/component_api/Page.js';
import Fetcher from '../foundation/Fetcher.js';
export default class DebuggerPage extends Page {
    constructor() {
        super();
        this.componentRegistry = {};
    }
    async preLoad() {
        await super.preLoad();
        this.componentRegistry = await Fetcher.fetchJSON('./data/componentRegistry.json');
    }
    async postLoad(element) {
        await super.postLoad(element);
    }
}
//# sourceMappingURL=DebuggerPage.html.js.map
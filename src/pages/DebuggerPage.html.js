import Page from '../src/foundation/component_api/Page.js';

export default class DebuggerPage extends Page {
    constructor(templatePath) {
        super(templatePath);
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
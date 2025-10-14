import IElementHolder from '../foundation/api/ElementHolder.js';
import Page from '../foundation/component_api/Page.js';

export default class DynamicPage extends Page {
    private id?: string;
    private id2?: string;

    constructor(hash?: string) {
        super();

        const params = new URLSearchParams(hash);
        this.id = params.get("id");
        this.id2 = params.get("id2");
    }
    protected preLoad(holder: IElementHolder): Promise<void> {
        holder.element.querySelector('#id1')!.textContent = this.id ?? 'null';
        holder.element.querySelector('#id2')!.textContent = this.id2 ?? 'null';
        return Promise.resolve();   
    }
}
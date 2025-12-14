import { assert } from 'console';
import HMLEParserReborn from '../src/foundation/HMLEParserReborn.js';
import Observable from '../src/foundation/api/Observer.js';

// Set up DOM environment like other tests
import { JSDOM } from 'jsdom';
const dom = new JSDOM('<!doctype html><html><body></body></html>') as any;
// @ts-ignore
globalThis.window = dom.window;
// @ts-ignore
globalThis.document = dom.window.document;

(async () => {
    const parser = new HMLEParserReborn();

    // Test mutation of ref (should affect DOM element directly)
    const t1 = `<div @[ref]="myEl" id="ref-mutate">Hello</div>`;
    const ctx1: any = {};
    const dom1 = parser.parseToDOM(t1, ctx1);
    parser.hydrate(dom1, ctx1);
    const cont1 = document.createElement('div');
    cont1.appendChild(dom1);
    const el = cont1.querySelector('#ref-mutate') as HTMLElement | null;
    if (!el) throw new Error('Element not found');
    if (!ctx1.myEl) throw new Error('Ref not assigned to scope');
    // Mutation via ref
    (ctx1.myEl as HTMLElement).textContent = 'New text via ref';

    if (!el.textContent?.includes('New text via ref')) {
        throw new Error('Mutation via ref does not update DOM');
    }
    console.log('✓ ref mutation test passed');

    // Test @for with computed unique refs
    const items = [{name: 'a'},{name:'b'}];
    const scope2: any = { items: items };
    const t2 = `@for (idx, it in items) {<div @[ref]="@(\'item_\' + idx)" id="@(\'item_\' + idx)">@(it.name)</div>}`;
    const dom2 = parser.parseToDOM(t2, scope2);
    parser.hydrate(dom2, scope2);
    const container2 = document.createElement('div');
    container2.appendChild(dom2);
    const e0 = container2.querySelector('#item_0') as HTMLElement | null;
    const e1 = container2.querySelector('#item_1') as HTMLElement | null;
    if (!e0 || !e1) throw new Error('Loop items missing');
    if (!(scope2 as any).item_0) throw new Error('item_0 ref missing');
    if (!(scope2 as any).item_1) throw new Error('item_1 ref missing');
    (scope2 as any).item_0.textContent = 'mut0';
    (scope2 as any).item_1.textContent = 'mut1';
    if (!e0.textContent?.includes('mut0') || !e1.textContent?.includes('mut1')) throw new Error('Loop refs mutation failed');
    console.log('✓ for-loop computed refs mutation test passed');

    console.log('All ref mutation tests passed');
})();

/**
 * Debug Test 4: @[ref] Binding
 */
import { JSDOM } from 'jsdom';
import TemplateEngine from '../src/foundation/engine/TemplateEngine.js';
import Scope from '../src/foundation/engine/Scope.js';

const dom = new JSDOM('<!DOCTYPE html><html><body><div id="app"></div></body></html>');
const { document } = dom.window;
(global as any).document = document;
(global as any).Element = dom.window.Element;
(global as any).DocumentFragment = dom.window.DocumentFragment;

const scope = Scope.from({ inputValue: '' });
const template = `<input type="text" @[ref]="'myInput'" placeholder="Type here">`;

console.log('Original template:', template);

const engine = new TemplateEngine(scope);
const pageTemplate = engine.parse(template);

console.log('Parsed template:', pageTemplate.getTemplate());

const fragment = pageTemplate.createFragment();
const app = document.getElementById('app')!;
app.innerHTML = '';
app.appendChild(fragment);

console.log('DOM HTML:', app.innerHTML);

// Check what bindRefs looks for
const refElements = app.querySelectorAll('[data-ref]');
console.log('Elements with data-ref:', refElements.length);

for (const el of Array.from(refElements)) {
    console.log('  - data-ref value:', el.getAttribute('data-ref'));
}

pageTemplate.bindRefs(app);

const inputRef = scope.get('myInput');
console.log('Ref bound:', inputRef ? 'yes' : 'no');
console.log('inputRef:', inputRef);

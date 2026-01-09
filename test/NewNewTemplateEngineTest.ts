import { JSDOM } from 'jsdom';
import TemplateEngine from '../src/foundation/engine/TemplateEngine';
import Scope from '../src/foundation/engine/Scope';
import Expression from '../src/foundation/engine/Expression';

const dom = new JSDOM('<!DOCTYPE html><html><body><div id="app"></div></body></html>');
const { document } = dom.window;
(global as any).document = document;
(global as any).Element = dom.window.Element;
(global as any).DocumentFragment = dom.window.DocumentFragment;

(global as any).NodeFilter = dom.window.NodeFilter;
(global as any).Node = dom.window.Node;

function getApp(): HTMLElement {
    const app = document.getElementById('app')!;
    app.innerHTML = '';
    return app as HTMLElement;
}

const template = `
<div class="counter-component" @[ref]="'counterRoot'">
    <h2>Counter: @(count)</h2>
    <div class="controls">
        <button @[ref]="'btnMinus'" @on[click]="decrement()">-</button>
        <button @[ref]="'btnPlus'" @on[click]="increment()">+</button>
    </div>
    @for(index, item in observableCollection) {
        <div class="item">Item @(index): @(item)</div>
    }
    @if(bool) {
        @for(gIndex, group in nestedObservableCollection) {
            <div @[ref]="'group_' + gIndex" class="group">
                <h3>Group @(gIndex)</h3>
                @for(dIndex, iItem in group) {
                    <button @[ref]="'btn_' + gIndex + '_' + dIndex" @on[click]="increment()">@(iItem)</button>
                }
            </div>
        }
    }
</div>
<div @injection[tail]="'group_0'">
    <p>Another line in injected content.</p>
</div>`;

console.log('┌─────────────────────────────────────────────────────────────┐');
console.log('│ Test 1: Refs                                                │');
console.log('└─────────────────────────────────────────────────────────────┘');
{
    getApp().innerHTML = template;
    let scope = new Scope();
    TemplateEngine.processRefs(document.getElementById('app')!, scope);
    console.log(scope);
}

{
    getApp().innerHTML = `
<exp of="'someValue'" />
<for index="'idx'" value="'e'" of="'collection'">
    <section>Element <exp of="'idx'"/>: <exp of="'e'"/></section>
</for>
<if condition="'condition'">

    <div>Condition is true</div>
</if>
<elseif condition="'otherCondition'">
    <div>Other condition is true</div>
</elseif>
<else>
    <div>Condition is false</div>
</else>
<p ref="'onePi'" on[click]=""></p>

<injection target="'onePi'" at="head" >

</injection>`;
    const tt = TemplateEngine.process(document.getElementById('app')!);
    const dd = tt.map(n => n.cloneNode(false).outerHTML ?? n.nodeValue).join(', ');
    console.log(dd);
}


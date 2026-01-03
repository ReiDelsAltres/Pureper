import { JSDOM } from 'jsdom';
import TemplateEngine from '../src/foundation/engine/TemplateEngine.js';
import TemplateInstance from '../src/foundation/engine/TemplateInstance.js';
import Scope from '../src/foundation/engine/Scope.js';
import Observable from '../src/foundation/api/Observer.js';
import EventRule from '../src/foundation/engine/rules/attribute/EventRule.js';

// Setup virtual DOM
const dom = new JSDOM('<!DOCTYPE html><html><body><div id="app"></div></body></html>');
const { document, HTMLElement, Event } = dom.window;
(global as any).document = document;
(global as any).Element = dom.window.Element;
(global as any).HTMLElement = HTMLElement;
(global as any).DocumentFragment = dom.window.DocumentFragment;
(global as any).Comment = dom.window.Comment;
(global as any).Event = Event;

function getApp(): HTMLElement {
    const app = document.getElementById('app')!;
    app.innerHTML = '';
    return app as HTMLElement;
}

console.log('┌─────────────────────────────────────────────────────────────┐');
console.log('│ Test 1: RefTest                                             │');
console.log('└─────────────────────────────────────────────────────────────┘');
{
    const count = new Observable(0);
    const scope = {
        count,
        increment: () => count.setObject(count.getObject() + 1),
        decrement: () => count.setObject(count.getObject() - 1)
    };

    const template = `
<div class="counter-component" @[ref]="'counterRoot'">
    <h2>Counter: @(count)</h2>
    <div class="controls">
        <button @[ref]="'btnMinus'" @on[click]="decrement()">-</button>
        <button @[ref]="'btnPlus'" @on[click]="increment()">+</button>
    </div>
</div>`;

    const engine = new TemplateEngine(scope);
    const instance = engine.parse(template);

    instance.bindRefs();

    console.log('btnMinus:', scope['btnMinus']);
    console.log('btnPlus:', scope['btnPlus']);
    console.log('counterRoot:', scope['counterRoot']);
}


console.log('┌─────────────────────────────────────────────────────────────┐');
console.log('│ Test 2: EventTest                                           │');
console.log('└─────────────────────────────────────────────────────────────┘');
{
    const count = new Observable(0);
    const scope = {
        count,
        increment: () => count.setObject(count.getObject() + 1),
        decrement: () => count.setObject(count.getObject() - 1)
    };

    const template = `
<div class="counter-component" @[ref]="'counterRoot'">
    <h2>Counter: @(count)</h2>
    <div class="controls">
        <button @[ref]="'btnMinus'" @on[click]="decrement()">-</button>
        <button @[ref]="'btnPlus'" @on[click]="increment()">+</button>
    </div>
</div>`;


    const engine = new TemplateEngine(scope);
    const instance = engine.parse(template);

    // Потом вставляем в DOM (элементы перемещаются, ссылки остаются валидными)
    const app = getApp();
    instance.bind(app);


    console.log('Initial count:', count.getObject());
    console.log(app.innerHTML);

    scope['btnPlus'].click();

    console.log('Count after btnPlus click:', count.getObject());
    console.log(app.innerHTML);

    scope.increment();

    console.log('Count after btnPlus click from code:', count.getObject());
    console.log(app.innerHTML);

}

console.log('┌─────────────────────────────────────────────────────────────┐');
console.log('│ Test 3: Complex Test                                        │');
console.log('└─────────────────────────────────────────────────────────────┘');
{
    const count = new Observable(0);
    const bool = new Observable(false);
    const scope = {
        count,
        bool,
        observableCollection: new Observable(['Item 1', 'Item 2', 'Item 3']),
        nestedObservableCollection: new Observable([
            new Observable(['G1-Item 1', 'G1-Item 2']),
            new Observable(['G2-Item 1', 'G2-Item 2', 'G2-Item 3'])
        ]),
        getValue: () => 'Computed Value',
        increment: () => count.setObject(count.getObject() + 1),
        decrement: () => count.setObject(count.getObject() - 1)
    };

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

    const engine = new TemplateEngine(scope);
    const instance = engine.parse(template);

    instance.bind(getApp());

    console.log('Initial:');
    console.log(document.getElementById('app')!.innerHTML);

    console.log('After bool set to true:');
    bool.setObject(true);
    console.log(document.getElementById('app')!.innerHTML);

    console.log('After increment:');
    console.log('scope[btn_0_1]:', scope['btn_0_1']);
    scope['btn_0_1'].click();
    console.log(document.getElementById('app')!.innerHTML);
}


console.log('┌─────────────────────────────────────────────────────────────┐');
console.log('│ Test 4: Injection Test                                      │');
console.log('└─────────────────────────────────────────────────────────────┘');
{
    const count = new Observable(0);
    const bool = new Observable(true);
    const scope = {
        count,
        bool,
        observableCollection: new Observable(['Item 1', 'Item 2', 'Item 3']),
        nestedObservableCollection: new Observable([
            new Observable(['G1-Item 1', 'G1-Item 2']),
            new Observable(['G2-Item 1', 'G2-Item 2', 'G2-Item 3'])
        ]),
        getValue: () => 'Computed Value',
        increment: () => count.setObject(count.getObject() + 1),
        decrement: () => count.setObject(count.getObject() - 1)
    };

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
</div>`;
    const injection = `<div @injection[tail]="'group_0'">
    <p>Another line in injected content.</p>
    <p>Computed: @(param)</p>
</div>`;

    const engine = new TemplateEngine(scope);
    const instance = engine.parse(template);

    instance.bind(getApp());

    console.log('Before injection:');
    console.log(document.getElementById('app')!.innerHTML);

    // Добавляем injection с кастомным scope
    engine.appendTemplate(instance, injection, { ...scope, param: 'Hello from injection!' });

    console.log('After injection:');
    console.log(document.getElementById('app')!.innerHTML);
}



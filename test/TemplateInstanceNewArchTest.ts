import { JSDOM } from 'jsdom';
import TemplateEngine from '../src/foundation/engine/TemplateEngine.js';
import TemplateInstance from '../src/foundation/engine/TemplateInstance.js';
import Scope from '../src/foundation/engine/Scope.js';
import Observable from '../src/foundation/api/Observer.js';

// Setup virtual DOM
const dom = new JSDOM('<!DOCTYPE html><html><body><div id="app"></div><div id="app2"></div></body></html>');
const { document, HTMLElement, Event } = dom.window;
(global as any).document = document;
(global as any).Element = dom.window.Element;
(global as any).HTMLElement = HTMLElement;
(global as any).DocumentFragment = dom.window.DocumentFragment;
(global as any).Comment = dom.window.Comment;
(global as any).Event = Event;
(global as any).Node = dom.window.Node;

function getApp(): HTMLElement {
    const app = document.getElementById('app')!;
    app.innerHTML = '';
    return app as HTMLElement;
}

function getApp2(): HTMLElement {
    const app = document.getElementById('app2')!;
    app.innerHTML = '';
    return app as HTMLElement;
}

let passed = 0;
let failed = 0;

function test(name: string, fn: () => void) {
    try {
        fn();
        console.log(`✅ ${name}`);
        passed++;
    } catch (e) {
        console.log(`❌ ${name}`);
        console.error(e);
        failed++;
    }
}

function assert(condition: boolean, message: string) {
    if (!condition) throw new Error(`Assertion failed: ${message}`);
}

function assertEqual(actual: any, expected: any, message: string = '') {
    if (actual !== expected) {
        throw new Error(`Expected "${expected}", got "${actual}". ${message}`);
    }
}

console.log('╔════════════════════════════════════════════════════════════════╗');
console.log('║     TemplateInstance New Architecture Tests                     ║');
console.log('╚════════════════════════════════════════════════════════════════╝');

// ═══════════════════════════════════════════════════════════════════
// Test 1: Basic bind() functionality
// ═══════════════════════════════════════════════════════════════════
console.log('\n─── Test Group 1: Basic bind() ───');

test('bind() inserts DOM into container', () => {
    const scope = { name: 'World' };
    const template = `<div>Hello @(name)!</div>`;
    
    const engine = new TemplateEngine(scope);
    const instance = engine.parse(template);
    
    const app = getApp();
    instance.bind(app);
    
    assert(app.innerHTML.includes('Hello World!'), 'Should contain rendered content');
});

test('bind() sets up refs', () => {
    const scope: any = {};
    const template = `<button @[ref]="'myBtn'">Click me</button>`;
    
    const engine = new TemplateEngine(scope);
    const instance = engine.parse(template);
    
    const app = getApp();
    instance.bind(app);
    
    assert(scope.myBtn instanceof HTMLElement, 'Ref should be set in scope');
    assertEqual(scope.myBtn.tagName, 'BUTTON', 'Ref should be the button element');
});

test('bind() sets up events', () => {
    let clicked = false;
    const scope = { 
        handleClick: () => { clicked = true; }
    };
    const template = `<button @[ref]="'btn'" @on[click]="handleClick()">Click</button>`;
    
    const engine = new TemplateEngine(scope);
    const instance = engine.parse(template);
    
    const app = getApp();
    instance.bind(app);
    
    (scope as any).btn.click();
    assert(clicked, 'Click handler should be called');
});

// ═══════════════════════════════════════════════════════════════════
// Test 2: unbind() functionality
// ═══════════════════════════════════════════════════════════════════
console.log('\n─── Test Group 2: unbind() ───');

test('unbind() leaves DOM in container', () => {
    const scope = { name: 'World' };
    const template = `<div>Hello @(name)!</div>`;
    
    const engine = new TemplateEngine(scope);
    const instance = engine.parse(template);
    
    const app = getApp();
    instance.bind(app);
    
    const htmlBefore = app.innerHTML;
    instance.unbind(app);
    
    assertEqual(app.innerHTML, htmlBefore, 'DOM should remain in container');
});

test('unbind() clears refs', () => {
    const scope: any = {};
    const template = `<button @[ref]="'myBtn'">Click me</button>`;
    
    const engine = new TemplateEngine(scope);
    const instance = engine.parse(template);
    
    const app = getApp();
    instance.bind(app);
    
    assert(scope.myBtn instanceof HTMLElement, 'Ref should be set before unbind');
    
    instance.unbind(app);
    
    assertEqual(scope.myBtn, null, 'Ref should be null after unbind');
});

test('unbind() removes event handlers', () => {
    let clickCount = 0;
    const scope: any = { 
        handleClick: () => { clickCount++; }
    };
    const template = `<button @[ref]="'btn'" @on[click]="handleClick()">Click</button>`;
    
    const engine = new TemplateEngine(scope);
    const instance = engine.parse(template);
    
    const app = getApp();
    instance.bind(app);
    
    // Store reference before unbind clears it
    const btn = scope.btn;
    
    btn.click();
    assertEqual(clickCount, 1, 'Should have 1 click before unbind');
    
    instance.unbind(app);
    
    // Try clicking after unbind (need to find button in DOM)
    const btnInDom = app.querySelector('button');
    btnInDom?.click();
    
    assertEqual(clickCount, 1, 'Click count should still be 1 after unbind');
});

// ═══════════════════════════════════════════════════════════════════
// Test 3: Multiple containers
// ═══════════════════════════════════════════════════════════════════
console.log('\n─── Test Group 3: Multiple Containers ───');

test('Can bind to multiple containers', () => {
    const scope = { name: 'World' };
    const template = `<div>Hello @(name)!</div>`;
    
    const engine = new TemplateEngine(scope);
    const instance = engine.parse(template);
    
    const app1 = getApp();
    const app2 = getApp2();
    
    instance.bind(app1);
    instance.bind(app2);
    
    assert(app1.innerHTML.includes('Hello World!'), 'Container 1 should have content');
    assert(app2.innerHTML.includes('Hello World!'), 'Container 2 should have content');
});

test('unbind() only affects specified container', () => {
    let clickCount = 0;
    const scope: any = { 
        handleClick: () => { clickCount++; }
    };
    const template = `<button @[ref]="'btn'" @on[click]="handleClick()">Click</button>`;
    
    const engine = new TemplateEngine(scope);
    const instance = engine.parse(template);
    
    const app1 = getApp();
    const app2 = getApp2();
    
    instance.bind(app1);
    instance.bind(app2);
    
    // Click in app2
    const btn2 = app2.querySelector('button')!;
    btn2.click();
    assertEqual(clickCount, 1, 'Click should work in app2');
    
    // Unbind app1
    instance.unbind(app1);
    
    // Click in app2 should still work
    btn2.click();
    assertEqual(clickCount, 2, 'Click should still work in app2 after unbinding app1');
});

// ═══════════════════════════════════════════════════════════════════
// Test 4: Reactive updates
// ═══════════════════════════════════════════════════════════════════
console.log('\n─── Test Group 4: Reactive Updates ───');

test('Observable changes update bound container', () => {
    const count = new Observable(0);
    const scope = { count };
    const template = `<div>Count: @(count)</div>`;
    
    const engine = new TemplateEngine(scope);
    const instance = engine.parse(template);
    
    const app = getApp();
    instance.bind(app);
    
    assert(app.innerHTML.includes('Count: 0'), 'Initial count should be 0');
    
    count.setObject(42);
    
    assert(app.innerHTML.includes('Count: 42'), 'Count should update to 42');
});

test('Observable changes update all bound containers', () => {
    const count = new Observable(0);
    const scope = { count };
    const template = `<div>Count: @(count)</div>`;
    
    const engine = new TemplateEngine(scope);
    const instance = engine.parse(template);
    
    const app1 = getApp();
    const app2 = getApp2();
    
    instance.bind(app1);
    instance.bind(app2);
    
    count.setObject(99);
    
    assert(app1.innerHTML.includes('Count: 99'), 'Container 1 should update');
    assert(app2.innerHTML.includes('Count: 99'), 'Container 2 should update');
});

test('Observable changes do not affect unbound containers', () => {
    const count = new Observable(0);
    const scope = { count };
    const template = `<div>Count: @(count)</div>`;
    
    const engine = new TemplateEngine(scope);
    const instance = engine.parse(template);
    
    const app1 = getApp();
    const app2 = getApp2();
    
    instance.bind(app1);
    instance.bind(app2);
    
    // Unbind app1
    instance.unbind(app1);
    
    count.setObject(77);
    
    // app1 should still have old value (DOM doesn't update)
    assert(app1.innerHTML.includes('Count: 0'), 'Unbound container should keep old value');
    assert(app2.innerHTML.includes('Count: 77'), 'Bound container should update');
});

// ═══════════════════════════════════════════════════════════════════
// Test 5: onFragmentChange event
// ═══════════════════════════════════════════════════════════════════
console.log('\n─── Test Group 5: onFragmentChange Event ───');

test('onFragmentChange is emitted on Observable change', () => {
    const count = new Observable(0);
    const scope = { count };
    const template = `<div>Count: @(count)</div>`;
    
    const engine = new TemplateEngine(scope);
    const instance = engine.parse(template);
    
    const app = getApp();
    instance.bind(app);
    
    let eventFired = false;
    let eventData: any = null;
    
    instance.onFragmentChange((event) => {
        eventFired = true;
        eventData = event;
    });
    
    count.setObject(5);
    
    assert(eventFired, 'onFragmentChange should fire');
    assert(eventData.fragmentId !== undefined, 'Event should have fragmentId');
    assert(eventData.affectedObservables.includes(count), 'Event should include the changed Observable');
});

// ═══════════════════════════════════════════════════════════════════
// Test 6: Counter component (full integration)
// ═══════════════════════════════════════════════════════════════════
console.log('\n─── Test Group 6: Counter Component (Integration) ───');

test('Full counter component works', () => {
    const count = new Observable(0);
    const scope: any = {
        count,
        increment: () => count.setObject(count.getObject() + 1),
        decrement: () => count.setObject(count.getObject() - 1)
    };

    const template = `
<div class="counter" @[ref]="'root'">
    <h2>Counter: @(count)</h2>
    <button @[ref]="'btnMinus'" @on[click]="decrement()">-</button>
    <button @[ref]="'btnPlus'" @on[click]="increment()">+</button>
</div>`;

    const engine = new TemplateEngine(scope);
    const instance = engine.parse(template);
    
    const app = getApp();
    instance.bind(app);
    
    // Check initial state
    assert(app.innerHTML.includes('Counter: 0'), 'Initial count should be 0');
    assert(scope.root instanceof HTMLElement, 'root ref should be set');
    assert(scope.btnPlus instanceof HTMLElement, 'btnPlus ref should be set');
    assert(scope.btnMinus instanceof HTMLElement, 'btnMinus ref should be set');
    
    // Click plus
    scope.btnPlus.click();
    assert(app.innerHTML.includes('Counter: 1'), 'Count should be 1 after click');
    
    // Click plus again
    scope.btnPlus.click();
    assert(app.innerHTML.includes('Counter: 2'), 'Count should be 2');
    
    // Click minus
    scope.btnMinus.click();
    assert(app.innerHTML.includes('Counter: 1'), 'Count should be 1 after minus');
});

// ═══════════════════════════════════════════════════════════════════
// Test 7: dispose() cleanup
// ═══════════════════════════════════════════════════════════════════
console.log('\n─── Test Group 7: dispose() Cleanup ───');

test('dispose() cleans up everything', () => {
    const count = new Observable(0);
    let clickCount = 0;
    const scope: any = {
        count,
        handleClick: () => { clickCount++; }
    };

    const template = `<button @[ref]="'btn'" @on[click]="handleClick()">@(count)</button>`;

    const engine = new TemplateEngine(scope);
    const instance = engine.parse(template);
    
    const app = getApp();
    instance.bind(app);
    
    // Store button reference
    const btn = app.querySelector('button')!;
    
    // Dispose
    instance.dispose();
    
    // Events should not work
    btn.click();
    assertEqual(clickCount, 0, 'Event should not fire after dispose');
    
    // Observable changes should not update DOM
    const htmlBefore = app.innerHTML;
    count.setObject(999);
    assertEqual(app.innerHTML, htmlBefore, 'DOM should not update after dispose');
});

// ═══════════════════════════════════════════════════════════════════
// Summary
// ═══════════════════════════════════════════════════════════════════
console.log('\n╔════════════════════════════════════════════════════════════════╗');
console.log(`║  Results: ${passed} passed, ${failed} failed                                   ║`);
console.log('╚════════════════════════════════════════════════════════════════╝');

if (failed > 0) {
    process.exit(1);
}

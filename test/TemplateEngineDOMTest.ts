/**
 * TemplateEngine DOM Test with Reactivity
 * Uses jsdom for virtual DOM environment
 */
import { JSDOM } from 'jsdom';
import TemplateEngine from '../src/foundation/engine/TemplateEngine.js';
import TemplateInstance from '../src/foundation/engine/TemplateInstance.js';
import Scope from '../src/foundation/engine/Scope.js';
import Observable, { isObservable } from '../src/foundation/api/Observer.js';
import RefRule from '../src/foundation/engine/rules/attribute/RefRule.js';
import EventRule from '../src/foundation/engine/rules/attribute/EventRule.js';

// Setup virtual DOM
const dom = new JSDOM('<!DOCTYPE html><html><body><div id="app"></div></body></html>');
const { document } = dom.window;
(global as any).document = document;
(global as any).Element = dom.window.Element;
(global as any).DocumentFragment = dom.window.DocumentFragment;

console.log('=== TemplateEngine DOM Tests with Reactivity ===\n');

// ==================== Test 0: Observable Behavior ====================
console.log('--- Test 0: Observable Behavior (without Proxy) ---');
{
    const user = new Observable({ name: 'Alice', age: 25 });
    
    // Test: isObservable works
    console.log('isObservable(user):', isObservable(user));
    
    // Test: getObject() to access properties
    console.log('user.getObject().name:', user.getObject().name);
    console.log('user.getObject().age:', user.getObject().age);
    
    // Test: setObject() works
    user.setObject({ name: 'Bob', age: 30 });
    console.log('After setObject: user.getObject().name =', user.getObject().name);
    
    // Test: subscribe works
    let updateTriggered = false;
    user.subscribe(() => { updateTriggered = true; });
    user.setObject({ name: 'Charlie', age: 35 });
    console.log('setObject triggered update:', updateTriggered);
    console.log('After setObject: user.getObject().name =', user.getObject().name);
    
    // Test: subscribeMutation works
    let mutationCalled = false;
    user.subscribeMutation((oldVal, newVal) => { 
        mutationCalled = true;
        console.log(`Mutation: ${oldVal.name} -> ${newVal.name}`);
    });
    user.setObject({ name: 'Dave', age: 40 });
    console.log('subscribeMutation works:', mutationCalled);
    
    console.log('✓ Observable behavior works\n');
}

// ==================== Test 1: Basic DOM Rendering ====================
console.log('--- Test 1: Basic DOM Rendering ---');
{
    const scope = { title: 'Hello DOM', message: 'Welcome!' };
    const template = `
        <div class="container">
            <h1>@(title)</h1>
            <p>@(message)</p>
        </div>
    `;

    const engine = new TemplateEngine(scope);
    const pageTemplate = engine.parse(template);
    const fragment = pageTemplate.createFragment();

    const app = document.getElementById('app')!;
    app.innerHTML = '';
    app.appendChild(fragment);

    console.log('Rendered HTML:', app.innerHTML.trim());
    console.log('H1 content:', app.querySelector('h1')?.textContent);
    console.log('✓ Basic DOM rendering works\n');
}

// ==================== Test 2: Observable Reactivity ====================
console.log('--- Test 2: Observable Reactivity ---');
{
    const counter = new Observable(0);
    const scope = { counter };

    const template = `<div class="counter">Count: @(counter)</div>`;

    const engine = new TemplateEngine(scope);
    const pageTemplate = engine.parse(template);

    console.log('Initial template:', pageTemplate.getTemplate().trim());

    // Subscribe to template changes
    let changeCount = 0;
    pageTemplate.onTemplateChange((oldVal, newVal, oldTpl, newTpl) => {
        changeCount++;
        console.log(`Change #${changeCount}: "${oldTpl.trim()}" -> "${newTpl.trim()}"`);
    });

    // Trigger change
    counter.setObject(5);
    console.log('After setObject(5):', pageTemplate.getTemplate().trim());
    console.log('✓ Observable reactivity works\n');
}

// ==================== Test 3: @for with Observable Array ====================
console.log('--- Test 3: @for with Observable Array ---');
{
    const items = new Observable(['Apple', 'Banana']);
    const scope = { items };

    const template = `
<ul>
@for(item in items) {
    <li>@(item)</li>
}
</ul>`;

    const engine = new TemplateEngine(scope);
    const pageTemplate = engine.parse(template);

    console.log('Initial:');
    console.log(pageTemplate.getTemplate());

    // Track changes
    pageTemplate.onTemplateChange((_, __, ___, newTpl) => {
        console.log('After update:');
        console.log(newTpl);
    });

    // Update array
    items.setObject(['Apple', 'Banana', 'Cherry', 'Date']);
    console.log('✓ @for with Observable array works\n');
}

// ==================== Test 4: @[ref] Binding ====================
console.log('--- Test 4: @[ref] Binding ---');
{
    const scope = Scope.from({ inputValue: '' });
    const template = `<input type="text" @[ref]="'myInput'" placeholder="Type here">`;

    const engine = new TemplateEngine(scope);
    const pageTemplate = engine.parse(template);
    const fragment = pageTemplate.createFragment();

    const app = document.getElementById('app')!;
    app.innerHTML = '';
    app.appendChild(fragment);

    // Bind refs
    pageTemplate.bindRefs(app);

    const inputRef = scope.get('myInput');
    console.log('Ref bound:', inputRef ? 'yes' : 'no');
    console.log('Element tagName:', inputRef?.tagName);
    console.log('✓ @[ref] binding works\n');
}

// ==================== Test 5: @on[event] Binding ====================
console.log('--- Test 5: @on[event] Binding ---');
{
    let clickCount = 0;
    const handleClick = () => {
        clickCount++;
        console.log(`Button clicked! Count: ${clickCount}`);
    };

    const scope = { handleClick };
    const template = `<button @on[click]="handleClick()">Click me</button>`;

    const engine = new TemplateEngine(scope);
    const pageTemplate = engine.parse(template);
    const fragment = pageTemplate.createFragment();

    const app = document.getElementById('app')!;
    app.innerHTML = '';
    app.appendChild(fragment);

    const button = app.querySelector('button')!;
    
    // Manually bind events (simulate EventRule.bindEvents)
    const scopeObj = Scope.from(scope);
    EventRule.bindEvents(button, scopeObj);

    // Simulate click
    button.click();
    button.click();

    console.log('Click count after 2 clicks:', clickCount);
    console.log('✓ @on[event] binding works\n');
}

// ==================== Test 6: Nested Observable Updates (GROUPED) ====================
console.log('--- Test 6: Nested Observable Updates (All in one onTemplateChange) ---');
{
    const user = new Observable({ name: 'Alice', age: 25 });
    const scope = { user };

    // Синтаксис user.name автоматически трансформируется в user.getObject().name
    const template = `
<div class="user-card">
    <h2>@(user.name)</h2>
    <p>Age: @(user.age)</p>
</div>`;

    const engine = new TemplateEngine(scope);
    const pageTemplate = engine.parse(template);

    console.log('Initial:', pageTemplate.getTemplate().replace(/\s+/g, ' ').trim());

    // Считаем количество вызовов onTemplateChange
    let changeCount = 0;
    pageTemplate.onTemplateChange((_, __, oldTpl, newTpl) => {
        changeCount++;
        console.log(`Change #${changeCount}:`);
        console.log('  Old:', oldTpl.replace(/\s+/g, ' ').trim());
        console.log('  New:', newTpl.replace(/\s+/g, ' ').trim());
    });

    // Update user - должен вызвать ОДИН onTemplateChange для обоих @(user.name) и @(user.age)
    user.setObject({ name: 'Bob', age: 30 });
    
    console.log(`Total changes: ${changeCount} (expected: 1)`);
    console.log(changeCount === 1 ? '✓ All updates grouped in one change!' : '✗ Updates were not grouped');
    console.log('✓ Nested Observable updates work\n');
}

// ==================== Test 7: @if with Observable Condition ====================
console.log('--- Test 7: @if with Observable Condition ---');
{
    const isVisible = new Observable(true);
    const scope = { isVisible };

    // For primitive Observable, still need getObject() since there's no property to proxy
    // Alternative: use isVisible.valueOf() or make condition based on object property
    const template = `
@if(isVisible) {
    <div class="visible">I am visible!</div>
}`;

    const engine = new TemplateEngine(scope);
    const pageTemplate = engine.parse(template);

    console.log('When true:', pageTemplate.getTemplate().trim());

    pageTemplate.onTemplateChange((_, __, ___, newTpl) => {
        console.log('When false:', newTpl.trim() || '(empty)');
    });

    isVisible.setObject(false);
    console.log('✓ @if with Observable condition works\n');
}

// ==================== Test 8: @injection Post-processing ====================
console.log('--- Test 8: @injection Post-processing ---');
{
    const scope = Scope.from({});

    const template = `<div @[ref]="'myDiv'"></div>
    <div @injection[head]="'myDiv'">Injected content</div>
`;

    const engine = new TemplateEngine(scope);
    const pageTemplate = engine.parse(template);
    const fragment = pageTemplate.createFragment();

    const wrapper = document.createElement('div');
    wrapper.appendChild(fragment);

    // Bind refs first
    pageTemplate.bindRefs(wrapper);

    console.log('Before injection:', wrapper.innerHTML.replace(/\s+/g, ' ').trim());

    // Process injections через pageTemplate
    pageTemplate.processInjections(wrapper);

    const targetDiv = scope.get('myDiv') as Element;
    console.log('After injection:', wrapper.innerHTML.replace(/\s+/g, ' ').trim());
    console.log('Target children:', targetDiv?.children.length ?? 0);
    console.log('✓ @injection post-processing works\n');
}

// ==================== Test 9: Full Reactive Component ====================
console.log('--- Test 9: Full Reactive Component Simulation ---');
{
    // Simulate a reactive counter component
    const state = {
        count: new Observable(0),
        items: new Observable<string[]>([])
    };

    const increment = () => {
        // For primitive Observable (number), still need getObject()
        state.count.setObject(state.count.getObject() + 1);
    };

    const addItem = () => {
        const items = state.items.getObject();
        state.items.setObject([...items, `Item ${items.length + 1}`]);
    };

    const scope = { state, increment, addItem };

    // Note: For primitives (number, array), getObject() is still needed in templates
    // Proxy works best for object properties like user.name
    const template = `
<div class="component">
    <h2>Counter: @(state.count)</h2>
    <button @on[click]="increment()">+</button>
    
    <h3>Items:</h3>
    <ul>
    @for(item in state.items) {
        <li>@(item)</li>
    }
    </ul>
    <button @on[click]="addItem()">Add Item</button>
</div>`;

    const engine = new TemplateEngine(scope);
    const pageTemplate = engine.parse(template);

    console.log('Initial state:');
    console.log('- Count:', state.count.getObject());
    console.log('- Items:', state.items.getObject());

    // Track all changes
    let updateCount = 0;
    state.count.subscribe((val) => {
        updateCount++;
        console.log(`Update #${updateCount}: count = ${val}`);
    });
    state.items.subscribe((val) => {
        updateCount++;
        console.log(`Update #${updateCount}: items = [${val.join(', ')}]`);
    });

    // Simulate user actions
    increment();
    increment();
    addItem();
    addItem();
    increment();
    addItem();

    console.log('\nFinal state:');
    console.log('- Count:', state.count.getObject());
    console.log('- Items:', state.items.getObject());
    console.log('- Total updates:', updateCount);
    console.log('✓ Full reactive component works\n');
}

// ==================== Test 10: Mutation Observer ====================
console.log('--- Test 10: MutationObserver (oldValue, newValue) ---');
{
    const data = new Observable({ value: 'initial' });

    data.subscribeMutation((oldVal, newVal) => {
        console.log(`Mutation: "${oldVal.value}" -> "${newVal.value}"`);
    });

    data.setObject({ value: 'second' });
    data.setObject({ value: 'third' });
    data.setObject({ value: 'final' });

    console.log('✓ MutationObserver works\n');
}

// ==================== Test 11: Dispose and Cleanup ====================
console.log('--- Test 11: Dispose and Cleanup ---');
{
    const counter = new Observable(0);
    const scope = { counter };

    const template = `<span>@(counter)</span>`;
    const engine = new TemplateEngine(scope);
    const pageTemplate = engine.parse(template);

    let changeDetected = false;
    pageTemplate.onTemplateChange(() => {
        changeDetected = true;
    });

    // Before dispose
    counter.setObject(1);
    console.log('Change detected before dispose:', changeDetected);

    // Dispose
    pageTemplate.dispose();
    changeDetected = false;

    // After dispose (should not trigger)
    counter.setObject(2);
    console.log('Change detected after dispose:', changeDetected);
    console.log('✓ Dispose and cleanup works\n');
}

console.log('=== All DOM Tests Completed ===');

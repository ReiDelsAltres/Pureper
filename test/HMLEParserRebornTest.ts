import HMLEParserReborn from '../src/foundation/HMLEParserReborn.js';
import Observable from '../src/foundation/api/Observer.js';

// Create a DOM environment for tests
import { JSDOM } from 'jsdom';
import { parse } from '../../node_modules/tldts/dist/es6/index';
const dom = new JSDOM('<!doctype html><html><body></body></html>');
// @ts-ignore
globalThis.window = dom.window as any;
// @ts-ignore
globalThis.document = dom.window.document as any;

function assert(cond: boolean, message?: string) {
    if (!cond) throw new Error('Assertion failed' + (message ? ': ' + message : ''));
}

const parser = new HMLEParserReborn();

// 1) simple interpolation
console.log("1|---------------------------------------------------|");
const out1 = parser.parse('Hello @(name)!', { name: 'Alice' });
console.log(out1);
assert(out1.includes('Hello Alice!'), 'simple interpolation failed');

// 2) expression/string/void
console.log("2|---------------------------------------------------|");
const scope2 = { greet: () => 'hi', doNothing: () => { /*void*/ } };
const out2 = parser.parse('@(greet()) -- @(doNothing())', scope2);
console.log(out2);
assert(out2.includes('hi') && out2.includes('--'), 'expression string/void failed');

// 3) Observable interpolation -> should produce template placeholder
console.log("3|---------------------------------------------------|");
const o = new Observable('init');
const s3: any = { obs: o };
const out3 = parser.parse('Start @(obs) End', s3);
console.log(out3);
assert(out3.includes('<template') && out3.includes('exp') && out3.includes('var="obs"'), 'observable placeholder generation failed');

// 4) @for expansion for plain array
console.log("4|---------------------------------------------------|");
const out4 = parser.parse('@for (i, v in arr) {<div>@(i):@(v)</div>}', { arr: ["A", "B"] });
console.log(out4);
assert(out4.includes('<div>0:A</div>') && out4.includes('<div>1:B</div>'), '@for array expansion failed');

// 5) @for with Observable should create template for iteration
const arrObs = new Observable(['X','Y']);
console.log("5|---------------------------------------------------|");
const out5 = parser.parse('@for (idx,val in arr) {<p>@(idx)-@(val)</p>}', { arr: arrObs } as any);
console.log(out5);
assert(out5.includes('<template') && out5.includes('for') && out5.includes('in="arr"'), '@for observable must result in template');

// 6) parseToDOM + hydrate should replace templates
console.log("6|---------------------------------------------------|");
const domFrag = parser.parseToDOM('<div>Start @(obs) <ul>@for (i, it in arr) {<li>@(i)-@(it)</li>}</ul> End</div>', { obs: o, arr: ['A'] });
// Before hydration templates should be present
assert(domFrag.querySelectorAll('template').length > 0, 'templates should be present before hydration');

parser.hydrate(domFrag, { obs: o, arr: ['A', 'B'] });
console.log(domFrag.firstChild?.outerHTML);
// After hydrate templates should be replaced
assert(domFrag.querySelectorAll('template').length === 0, 'templates should be removed during hydration');

// 7) @(expression) with Observable dependency should be dynamic
console.log("7|---------------------------------------------------|");
const expObs = new Observable('World');
const doSomething = (varName: string) => { return 'Did ' + varName; };
const out7 = parser.parse('Hello @(action(greeting))!', { greeting: expObs, action: doSomething });
console.log(out7);
assert(out7.includes('<template exp expr="action(greeting)"'), '@(expression) with Observable should create template');

// 8) Hydrate @(expression) with Observable and test reactivity
console.log("8|---------------------------------------------------|");
const domFrag2 = parser.parseToDOM('Result: @(action(greeting))', { greeting: expObs, action: doSomething });
parser.hydrate(domFrag2, { greeting: expObs, action: doSomething });
console.log('After hydrate:', domFrag2.textContent);
assert(domFrag2.textContent?.includes('Did World'), 'hydrated expression should evaluate');

// Update Observable and check if text updates
expObs.setObject('Universe');
console.log('After setObject:', domFrag2.textContent);
assert(domFrag2.textContent?.includes('Did Universe'), 'text should update when Observable changes');

// 9) Complex test: multiple static and dynamic rules together
console.log("9|---------------------------------------------------|");
console.log("Complex Observable test with nested structures");

// Setup: Observable collections and values
const userObs = new Observable({ name: 'John', role: 'Admin' });
const itemsObs = new Observable([
    { id: 1, title: 'Task A', done: false },
    { id: 2, title: 'Task B', done: true },
    { id: 3, title: 'Task C', done: false }
]);
const countObs = new Observable(3);
const staticItems = ['X', 'Y', 'Z'];

// Helper functions
const formatUser = (u: any) => `${u.name} (${u.role})`;
const formatStatus = (done: boolean) => done ? '✓' : '○';
const double = (n: number) => n * 2;

const complexTemplate = `
<div class="app">
    <header>
        <h1>Dashboard for @(formatUser(user))</h1>
        <span class="count">Total: @(count), Double: @(double(count))</span>
    </header>
    
    <section class="static-list">
        <h2>Static Items</h2>
        <ul>
            @for (i, item in staticArr) {
                <li>@(i). @(item)</li>
            }
        </ul>
    </section>
    
    <section class="dynamic-list">
        <h2>Dynamic Tasks (@(count) items)</h2>
        <ul>
            @for (idx, task in tasks) {
                <li class="task" data-id="@(task.id)">
                    <span class="status">@(formatStatus(task.done))</span>
                    <span class="title">@(task.title)</span>
                    <span class="index">#@(idx)</span>
                </li>
            }
        </ul>
    </section>
    
    <footer>
        <p>User: @(user.name) | Items: @(count)</p>
    </footer>
</div>
`;

const complexScope = {
    user: userObs,
    tasks: itemsObs,
    count: countObs,
    staticArr: staticItems,
    formatUser,
    formatStatus,
    double
};

// Stage 1: Parse
const parsed = parser.parse(complexTemplate, complexScope);
console.log("Parsed template (Stage 1):");
console.log(parsed.substring(0, 500) + "...");

// Check static parts are expanded
assert(parsed.includes('<li>0. X</li>'), 'Static @for should expand immediately');
assert(parsed.includes('<li>1. Y</li>'), 'Static @for should expand item Y');
assert(parsed.includes('<li>2. Z</li>'), 'Static @for should expand item Z');

// Check Observable parts create templates
assert(parsed.includes('<template exp expr="formatUser(user)"'), 'formatUser(user) should be dynamic');
assert(parsed.includes('<template exp var="count"'), 'count Observable should create template');
assert(parsed.includes('<template exp expr="double(count)"'), 'double(count) should be dynamic');
assert(parsed.includes('<template for'), 'Observable @for should create template');

console.log("\n✓ Stage 1 passed: static expanded, dynamic preserved as templates");

// Stage 2: Parse to DOM
const complexDom = parser.parseToDOM(complexTemplate, complexScope);
const templateCount = complexDom.querySelectorAll('template').length;
console.log(`\nDOM has ${templateCount} template placeholders before hydration`);
assert(templateCount > 0, 'Should have templates before hydration');

// Stage 3: Hydrate
parser.hydrate(complexDom, complexScope);
const afterHydrateTemplates = complexDom.querySelectorAll('template').length;
console.log(`DOM has ${afterHydrateTemplates} templates after hydration`);
assert(afterHydrateTemplates === 0, 'All templates should be hydrated');

// Get the rendered content
const container = document.createElement('div');
container.appendChild(complexDom);
console.log("\nHydrated HTML:");
console.log(container.innerHTML.substring(0, 800) + "...");

// Verify initial render
assert(container.textContent?.includes('John (Admin)'), 'User should be rendered');
assert(container.textContent?.includes('Total: 3'), 'Count should be rendered');
assert(container.textContent?.includes('Double: 6'), 'double(count) should be 6');
assert(container.textContent?.includes('Task A'), 'Task A should be rendered');
assert(container.textContent?.includes('Task B'), 'Task B should be rendered');
assert(container.textContent?.includes('Task C'), 'Task C should be rendered');

console.log("\n✓ Stage 2-3 passed: DOM created and hydrated correctly");

// Test reactivity: Update user
console.log("\n--- Testing Reactivity ---");
userObs.setObject({ name: 'Jane', role: 'User' });
console.log("After user update:", container.textContent?.includes('Jane (User)') ? '✓ User updated' : '✗ User not updated');
assert(container.textContent?.includes('Jane (User)'), 'User should update reactively');

// Test reactivity: Update count
countObs.setObject(5);
console.log("After count update:", container.textContent?.includes('Total: 5') ? '✓ Count updated' : '✗ Count not updated');
console.log("After count update (double):", container.textContent?.includes('Double: 10') ? '✓ Double updated' : '✗ Double not updated');
assert(container.textContent?.includes('Total: 5'), 'Count should update to 5');
assert(container.textContent?.includes('Double: 10'), 'Double should update to 10');

// Test reactivity: Update tasks array - modify existing item
itemsObs.setObject([
    { id: 1, title: 'Task A Updated', done: true },
    { id: 2, title: 'Task B', done: true },
    { id: 3, title: 'Task C', done: false },
    { id: 4, title: 'Task D', done: false }
]);
console.log("After tasks update:", container.textContent?.includes('Task A Updated') ? '✓ Tasks updated' : '✗ Tasks not updated');
console.log("After tasks update:", container.textContent?.includes('Task D') ? '✓ New task added' : '✗ New task not added');

console.log("\n✓ Reactivity tests passed!");
console.log("9|---------------------------------------------------|");

// 10) Deeply nested rules test
console.log("10|---------------------------------------------------|");
console.log("Deeply nested Observable rules test");

// Setup: Categories with nested items, each item has tags
const categoriesObs = new Observable([
    {
        name: 'Frontend',
        items: [
            { title: 'React', tags: ['UI', 'Library'], rating: 5 },
            { title: 'Vue', tags: ['UI', 'Framework'], rating: 4 }
        ]
    },
    {
        name: 'Backend',
        items: [
            { title: 'Node.js', tags: ['Runtime', 'JavaScript'], rating: 5 },
            { title: 'Python', tags: ['Language', 'Versatile'], rating: 4 },
            { title: 'Go', tags: ['Language', 'Fast'], rating: 4 }
        ]
    }
]);

const selectedCategoryObs = new Observable('Frontend');
const showTagsObs = new Observable(true);
const multiplierObs = new Observable(10);

// Helper functions for nested test
const stars = (n: number) => '★'.repeat(n) + '☆'.repeat(5 - n);
const calcScore = (rating: number, mult: number) => rating * mult;
const isSelected = (name: string, selected: string) => name === selected ? 'selected' : '';

const nestedTemplate = `
<div class="catalog">
    <h1>Tech Catalog</h1>
    <p>Selected: @(selected), Show tags: @(showTags), Multiplier: @(multiplier)</p>
    
    @for (catIdx, category in categories) {
        <section class="category @(isSelected(category.name, selected))" data-index="@(catIdx)">
            <h2>@(category.name) (@(catIdx))</h2>
            
            <ul class="items">
                @for (itemIdx, item in category.items) {
                    <li class="item" data-cat="@(catIdx)" data-item="@(itemIdx)">
                        <strong>@(item.title)</strong>
                        <span class="rating">@(stars(item.rating))</span>
                        <span class="score">Score: @(calcScore(item.rating, multiplier))</span>
                        
                        @for (tagIdx, tag in item.tags) {
                            <span class="tag" data-tag-idx="@(tagIdx)">@(tag)</span>
                        }
                    </li>
                }
            </ul>
            
            <footer>
                Category @(catIdx) has items: 
                @for (i, it in category.items) {
                    <span>@(it.title)@(i < category.items.length - 1 ? ', ' : '')</span>
                }
            </footer>
        </section>
    }
    
    <aside class="summary">
        <h3>Summary</h3>
        <p>Categories: @for (i, c in categories) {<span>@(c.name) </span>}</p>
        <p>Multiplier x@(multiplier) applied</p>
    </aside>
</div>
`;

const nestedScope = {
    categories: categoriesObs,
    selected: selectedCategoryObs,
    showTags: showTagsObs,
    multiplier: multiplierObs,
    stars,
    calcScore,
    isSelected
};

// Stage 1: Parse nested template
const nestedParsed = parser.parse(nestedTemplate, nestedScope);
console.log("Nested parsed (first 600 chars):");
console.log(nestedParsed.substring(0, 600) + "...\n");

// Should have nested templates for Observable @for
assert(nestedParsed.includes('<template for'), 'Should have @for templates');
assert(nestedParsed.includes('in="categories"'), 'Should iterate over categories Observable');

// Stage 2+3: Parse to DOM and hydrate
const nestedDom = parser.parseToDOM(nestedTemplate, nestedScope);
const nestedTemplateCount = nestedDom.querySelectorAll('template').length;
console.log(`Nested DOM has ${nestedTemplateCount} templates before hydration`);

parser.hydrate(nestedDom, nestedScope);
const nestedAfterHydrate = nestedDom.querySelectorAll('template').length;
console.log(`Nested DOM has ${nestedAfterHydrate} templates after hydration`);
assert(nestedAfterHydrate === 0, 'All nested templates should be hydrated');

const nestedContainer = document.createElement('div');
nestedContainer.appendChild(nestedDom);

console.log("\nNested hydrated HTML (first 1000 chars):");
console.log(nestedContainer.innerHTML.substring(0, 1000) + "...\n");

// Verify nested content
assert(nestedContainer.textContent?.includes('Frontend'), 'Should have Frontend category');
assert(nestedContainer.textContent?.includes('Backend'), 'Should have Backend category');
assert(nestedContainer.textContent?.includes('React'), 'Should have React item');
assert(nestedContainer.textContent?.includes('Node.js'), 'Should have Node.js item');
assert(nestedContainer.textContent?.includes('★★★★★'), 'Should have 5-star rating');
assert(nestedContainer.textContent?.includes('Score: 50'), 'Score should be rating * multiplier (5 * 10)');
assert(nestedContainer.textContent?.includes('UI'), 'Should have UI tag');
assert(nestedContainer.textContent?.includes('Library'), 'Should have Library tag');

console.log("✓ Initial nested render correct");

// Test nested reactivity: Update multiplier
console.log("\n--- Testing Nested Reactivity ---");
multiplierObs.setObject(20);
console.log("After multiplier=20:", nestedContainer.textContent?.includes('Score: 100') ? '✓ Score updated to 100' : '✗ Score not updated');
assert(nestedContainer.textContent?.includes('Score: 100'), 'Score should update to 100 (5*20)');
assert(nestedContainer.textContent?.includes('Multiplier x20'), 'Multiplier text should update');

// Test nested reactivity: Update categories (modify nested structure)
categoriesObs.setObject([
    {
        name: 'Frontend',
        items: [
            { title: 'React', tags: ['UI', 'Library', 'Popular'], rating: 5 },
            { title: 'Svelte', tags: ['UI', 'Compiler'], rating: 5 }
        ]
    },
    {
        name: 'Backend',
        items: [
            { title: 'Rust', tags: ['Systems', 'Fast', 'Safe'], rating: 5 }
        ]
    },
    {
        name: 'Database',
        items: [
            { title: 'PostgreSQL', tags: ['SQL', 'Reliable'], rating: 5 },
            { title: 'MongoDB', tags: ['NoSQL', 'Flexible'], rating: 4 }
        ]
    }
]);

console.log("After categories update:");
console.log("  Svelte added:", nestedContainer.textContent?.includes('Svelte') ? '✓' : '✗');
console.log("  Rust added:", nestedContainer.textContent?.includes('Rust') ? '✓' : '✗');
console.log("  Database category added:", nestedContainer.textContent?.includes('Database') ? '✓' : '✗');
console.log("  PostgreSQL added:", nestedContainer.textContent?.includes('PostgreSQL') ? '✓' : '✗');
console.log("  Popular tag added:", nestedContainer.textContent?.includes('Popular') ? '✓' : '✗');

// Test selected category update
selectedCategoryObs.setObject('Database');
console.log("After selected=Database:", nestedContainer.textContent?.includes('Selected: Database') ? '✓ Selected updated' : '✗ Selected not updated');

console.log("\n✓ Deeply nested reactivity tests passed!");
console.log("10|---------------------------------------------------|");

console.log('HMLEParserReborn tests passed');

// 11) Element ref rule: @[ref]
console.log("11|---------------------------------------------------|");
const refTemplate = `<div @[ref]="myEl" id="theOne">Ref Test</div><p>Element ID: @(myEl.id)</p>`;
const refScope: any = {};
const refDom = parser.parseToDOM(refTemplate, refScope);
parser.hydrate(refDom, refScope);
const refContainer = document.createElement('div');
refContainer.appendChild(refDom);
console.log(refContainer.innerHTML);
assert(refContainer.textContent?.includes('Element ID: theOne'), 'ref rule should expose element variable');
assert(refScope.myEl && refScope.myEl.id === 'theOne', 'scope should have the element variable set');
console.log('✓ @[ref] rule test passed');

// 12) Event binding: @[onclick]
console.log("12|---------------------------------------------------|");
const clickCount = new Observable(0);
const clickHandler = (event: any, element: any) => {
    clickCount.setObject(clickCount.getObject() + 1);
};
const onTemplate = `<button @[onclick]="clickHandler(event, element)">Click</button><span>Clicks: @(clickCount)</span>`;
const onScope: any = { clickCount, clickHandler };
const onDom = parser.parseToDOM(onTemplate, onScope);
parser.hydrate(onDom, onScope);
const onContainer = document.createElement('div');
onContainer.appendChild(onDom);
const btn = onContainer.querySelector('button') as HTMLButtonElement;
assert(!!btn, 'button exists');
btn!.dispatchEvent(new (globalThis as any).window.Event('click'));
console.log('After click count:', clickCount.getObject());
assert(clickCount.getObject() === 1, 'click handler should update clickCount');
assert(onContainer.textContent?.includes('Clicks: 1'), 'UI should update for Observable clickCount');
console.log('✓ @[onclick] rule test passed');

/**
 * TemplateEngine Integration Test
 */
import TemplateEngine from '../src/foundation/engine/TemplateEngine.js';
import Scope from '../src/foundation/engine/Scope.js';
import Expression from '../src/foundation/engine/Expression.js';

// ==================== Test Scope ====================
console.log('=== Testing Scope ===');

class TestClass {
    public value = 'classValue';
    public getValue() { return this.value; }
}

const scope1 = new Scope();
scope1.set('a', 1);
scope1.set('b', 2);

const scope2 = Scope.from({ c: 3, d: 4 });
scope1.merge(scope2);

console.log('Merged scope:', scope1.getVariables());

const childScope = scope1.createChild({ local: 'localVar' });
console.log('Child scope:', childScope.getVariables());

const classScope = Scope.from(new TestClass());
console.log('Class scope:', classScope.getVariables());
console.log('Class method result:', classScope.get('getValue')());

// ==================== Test Expression ====================
console.log('\n=== Testing Expression ===');

const exprScope = Scope.from({
    title: 'Hello',
    user: { name: 'John' },
    items: [1, 2, 3],
    greet: (name: string) => `Hello, ${name}!`
});

// Simple variable
const expr1 = new Expression('title');
console.log('Simple var:', expr1.execute(exprScope)); // Hello

// Object property
const expr2 = new Expression('user.name');
console.log('Object prop:', expr2.execute(exprScope)); // John

// Function call
const expr3 = new Expression('greet("World")');
console.log('Function call:', expr3.execute(exprScope)); // Hello, World!

// Complex expression
const expr4 = new Expression('items.map(x => x * 2).join(", ")');
console.log('Complex:', expr4.execute(exprScope)); // 2, 4, 6

// With return
const expr5 = new Expression('const x = 5; return x * 2;');
console.log('With return:', expr5.execute(exprScope)); // 10

// ==================== Test TemplateEngine ====================
console.log('\n=== Testing TemplateEngine ===');

const templateScope = {
    title: 'Test Page',
    user: { name: 'Alice' },
    items: [
        { id: 1, name: 'Apple' },
        { id: 2, name: 'Banana' },
        { id: 3, name: 'Cherry' }
    ],
    showList: true,
    count: 5
};

// Test @(expression)
const tpl1 = '<h1>@(title)</h1>';
console.log('Expression:', TemplateEngine.process(tpl1, templateScope));

// Test @for with array
const tpl2 = `
<ul>
@for(item in items) {
    <li>@(item.name)</li>
}
</ul>`;
console.log('For array:', TemplateEngine.process(tpl2, templateScope));

// Test @for with index
const tpl3 = `
<ul>
@for(idx, item in items) {
    <li>@(idx): @(item.name)</li>
}
</ul>`;
console.log('For indexed:', TemplateEngine.process(tpl3, templateScope));

// Test @for with number
const tpl4 = `
<ul>
@for(i in count) {
    <li>Item @(i)</li>
}
</ul>`;
console.log('For numeric:', TemplateEngine.process(tpl4, templateScope));

// Test @if
const tpl5 = `
@if(showList) {
    <div>List is visible</div>
}
`;
console.log('If true:', TemplateEngine.process(tpl5, templateScope));

const tpl6 = `
@if(!showList) {
    <div>Hidden</div>
} @else {
    <div>Shown</div>
}
`;
console.log('If/else:', TemplateEngine.process(tpl6, templateScope));

// Test nested @for
const nestedScope = {
    categories: [
        { name: 'Fruits', items: ['Apple', 'Banana'] },
        { name: 'Veggies', items: ['Carrot', 'Potato'] }
    ]
};

const tpl7 = `
@for(cat in categories) {
    <h2>@(cat.name)</h2>
    <ul>
    @for(item in cat.items) {
        <li>@(item)</li>
    }
    </ul>
}
`;
console.log('Nested for:', TemplateEngine.process(tpl7, nestedScope));

// Test @@ escape
const tpl8 = '<p>Email: user@@example.com</p>';
console.log('Escape @@:', TemplateEngine.process(tpl8, {}));

// Test complex expression
const complexScope = {
    data: { value: 'test' },
    encode: encodeURIComponent,
    stringify: JSON.stringify
};

const tpl9 = '<input value="@(encode(stringify(data)))">';
console.log('Complex expr:', TemplateEngine.process(tpl9, complexScope));

console.log('\n=== All tests completed ===');

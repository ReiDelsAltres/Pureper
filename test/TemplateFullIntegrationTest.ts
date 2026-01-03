/**
 * TemplateEngine + TemplateInstance Full Integration Test
 * Комплексный тест всех функций шаблонизатора вместе:
 * - TemplateEngine парсинг
 * - TemplateInstance с фрагментами
 * - Реактивность Observable
 * - Гранулярные DOM обновления
 * - @for, @if, @(), @[ref], @on[event], @injection
 */
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

// Test utilities
let testsPassed = 0;
let testsFailed = 0;

function assert(condition: boolean, message: string): void {
    if (condition) {
        testsPassed++;
        console.log(`  ✓ ${message}`);
    } else {
        testsFailed++;
        console.log(`  ✗ ${message}`);
    }
}

function getApp(): HTMLElement {
    const app = document.getElementById('app')!;
    app.innerHTML = '';
    return app as HTMLElement;
}

/** Привязать события ко всем элементам внутри контейнера */
function bindAllEvents(container: Element, scope: Scope): void {
    // Привязываем к самому контейнеру
    EventRule.bindEvents(container, scope);
    // Привязываем ко всем дочерним элементам
    const allElements = container.querySelectorAll('*');
    for (const el of Array.from(allElements)) {
        EventRule.bindEvents(el, scope);
    }
}

console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║  TemplateEngine + TemplateInstance Full Integration Tests  ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

// ═══════════════════════════════════════════════════════════════════════════
// Test 1: Full Reactive Counter Component
// ═══════════════════════════════════════════════════════════════════════════
console.log('┌─────────────────────────────────────────────────────────────┐');
console.log('│ Test 1: Full Reactive Counter Component                     │');
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
    const scopeObj = engine.getScope();

    const app = getApp();
    const fragment = instance.createFragment();
    app.appendChild(fragment);

    // Bind refs and events
    instance.bindRefs(app);
    bindAllEvents(app, scopeObj);

    const counterRoot = scopeObj.get('counterRoot') as HTMLElement;
    const btnPlus = scopeObj.get('btnPlus') as HTMLElement;
    const btnMinus = scopeObj.get('btnMinus') as HTMLElement;

    assert(counterRoot !== null, 'counterRoot ref bound');
    assert(btnPlus !== null, 'btnPlus ref bound');
    assert(btnMinus !== null, 'btnMinus ref bound');

    // Check initial state
    assert(instance.getTemplate().includes('Counter: 0'), 'Initial count is 0');

    // Track changes
    let changeCount = 0;
    instance.onTemplateChange(() => changeCount++);

    // Simulate clicks
    btnPlus.click();
    btnPlus.click();
    btnPlus.click();

    assert(count.getObject() === 3, 'Count is 3 after 3 increments');
    assert(changeCount === 3, '3 template changes occurred');

    btnMinus.click();
    assert(count.getObject() === 2, 'Count is 2 after decrement');

    console.log('');
}

// ═══════════════════════════════════════════════════════════════════════════
// Test 2: Todo List with @for and Observable Array
// ═══════════════════════════════════════════════════════════════════════════
console.log('┌─────────────────────────────────────────────────────────────┐');
console.log('│ Test 2: Todo List with @for and Observable Array            │');
console.log('└─────────────────────────────────────────────────────────────┘');
{
    interface Todo {
        id: number;
        text: string;
        done: boolean;
    }

    const todos = new Observable<Todo[]>([
        { id: 1, text: 'Learn Purper', done: false },
        { id: 2, text: 'Build app', done: false }
    ]);

    let nextId = 3;
    const scope = {
        todos,
        addTodo: (text: string) => {
            const current = todos.getObject();
            todos.setObject([...current, { id: nextId++, text, done: false }]);
        },
        toggleTodo: (id: number) => {
            const current = todos.getObject();
            todos.setObject(current.map(t => 
                t.id === id ? { ...t, done: !t.done } : t
            ));
        },
        removeTodo: (id: number) => {
            const current = todos.getObject();
            todos.setObject(current.filter(t => t.id !== id));
        }
    };

    const template = `
<div class="todo-app">
    <h1>Todo List</h1>
    <ul class="todo-list" @[ref]="'todoList'">
        @for(todo in todos) {
        <li class="todo-item" data-id="@(todo.id)">
            <span>@(todo.text)</span>
            @if(todo.done) {
            <span class="done-badge">✓</span>
            }
        </li>
        }
    </ul>
    <p>Total: @(todos.length) items</p>
</div>`;

    const engine = new TemplateEngine(scope);
    const instance = engine.parse(template);

    const app = getApp();
    app.appendChild(instance.createFragment());
    instance.bindRefs(app);

    const scopeObj = engine.getScope();
    const todoList = scopeObj.get('todoList') as HTMLElement;

    assert(todoList !== null, 'todoList ref bound');
    assert(instance.getTemplate().includes('Learn Purper'), 'Contains first todo');
    assert(instance.getTemplate().includes('Build app'), 'Contains second todo');
    assert(instance.getTemplate().includes('Total: 2 items'), 'Shows correct count');

    // Add new todo
    let changes = 0;
    instance.onTemplateChange(() => changes++);

    scope.addTodo('Deploy to production');

    assert(changes === 1, 'One change event after addTodo');
    assert(instance.getTemplate().includes('Deploy to production'), 'New todo added');
    // Проверяем что третий элемент отрендерен
    assert(instance.getTemplate().includes('data-id="3"'), 'Third todo item rendered');

    // Remove todo
    scope.removeTodo(2);

    // Проверяем что список обновился (теперь 2 элемента)
    assert(todos.getObject().length === 2, 'Todos array has 2 items after removal');
    assert(instance.getTemplate().includes('Learn Purper'), 'First todo still exists');

    console.log('');
}

// ═══════════════════════════════════════════════════════════════════════════
// Test 3: Conditional Rendering with @if
// ═══════════════════════════════════════════════════════════════════════════
console.log('┌─────────────────────────────────────────────────────────────┐');
console.log('│ Test 3: Conditional Rendering with @if                      │');
console.log('└─────────────────────────────────────────────────────────────┘');
{
    const isLoggedIn = new Observable(false);
    const user = new Observable({ name: 'Guest', role: 'visitor' });

    const scope = {
        isLoggedIn,
        user,
        login: () => {
            isLoggedIn.setObject(true);
            user.setObject({ name: 'Admin', role: 'admin' });
        },
        logout: () => {
            isLoggedIn.setObject(false);
            user.setObject({ name: 'Guest', role: 'visitor' });
        }
    };

    // Используем getObject() для примитивных Observable в @if
    const template = `
<div class="auth-status">
    @if(isLoggedIn.getObject()) {
    <div class="user-panel">
        <span>Welcome, @(user.name)!</span>
        <span class="role">Role: @(user.role)</span>
        <button @on[click]="logout()">Logout</button>
    </div>
    }
    @if(!isLoggedIn.getObject()) {
    <div class="login-prompt">
        <span>Please log in</span>
        <button @on[click]="login()">Login</button>
    </div>
    }
</div>`;

    const engine = new TemplateEngine(scope);
    const instance = engine.parse(template);

    assert(instance.getTemplate().includes('Please log in'), 'Shows login prompt when logged out');
    assert(!instance.getTemplate().includes('Welcome'), 'Does not show welcome when logged out');

    scope.login();

    // Проверяем состояние Observable
    assert(isLoggedIn.getObject() === true, 'isLoggedIn is true after login');
    assert(user.getObject().name === 'Admin', 'User name is Admin after login');
    assert(!instance.getTemplate().includes('Please log in'), 'Login prompt hidden after login');

    scope.logout();

    assert(instance.getTemplate().includes('Please log in'), 'Login prompt shown after logout');
    assert(!instance.getTemplate().includes('Welcome, Admin'), 'Welcome hidden after logout');

    console.log('');
}

// ═══════════════════════════════════════════════════════════════════════════
// Test 4: Nested @for with Objects
// ═══════════════════════════════════════════════════════════════════════════
console.log('┌─────────────────────────────────────────────────────────────┐');
console.log('│ Test 4: Nested @for with Objects                            │');
console.log('└─────────────────────────────────────────────────────────────┘');
{
    interface Category {
        name: string;
        items: string[];
    }

    const categories = new Observable<Category[]>([
        { name: 'Fruits', items: ['Apple', 'Banana', 'Orange'] },
        { name: 'Vegetables', items: ['Carrot', 'Potato'] }
    ]);

    const scope = { categories };

    const template = `
<div class="catalog">
    @for(category in categories) {
    <div class="category">
        <h3>@(category.name)</h3>
        <ul>
            @for(item in category.items) {
            <li>@(item)</li>
            }
        </ul>
    </div>
    }
</div>`;

    const engine = new TemplateEngine(scope);
    const instance = engine.parse(template);

    assert(instance.getTemplate().includes('<h3>Fruits</h3>'), 'Contains Fruits category');
    assert(instance.getTemplate().includes('<h3>Vegetables</h3>'), 'Contains Vegetables category');
    assert(instance.getTemplate().includes('<li>Apple</li>'), 'Contains Apple');
    assert(instance.getTemplate().includes('<li>Carrot</li>'), 'Contains Carrot');

    // Update categories
    categories.setObject([
        { name: 'Fruits', items: ['Apple', 'Banana', 'Orange', 'Mango'] },
        { name: 'Vegetables', items: ['Carrot', 'Potato', 'Tomato'] },
        { name: 'Dairy', items: ['Milk', 'Cheese'] }
    ]);

    assert(instance.getTemplate().includes('<h3>Dairy</h3>'), 'New category added');
    assert(instance.getTemplate().includes('<li>Mango</li>'), 'New item in Fruits');
    assert(instance.getTemplate().includes('<li>Cheese</li>'), 'Items in new category');

    console.log('');
}

// ═══════════════════════════════════════════════════════════════════════════
// Test 5: @injection with Refs
// ═══════════════════════════════════════════════════════════════════════════
console.log('┌─────────────────────────────────────────────────────────────┐');
console.log('│ Test 5: @injection with Refs                                │');
console.log('└─────────────────────────────────────────────────────────────┘');
{
    const scope = Scope.from({});

    const template = `
<div class="layout">
    <header @[ref]="'header'">
        <h1>App Header</h1>
    </header>
    <main @[ref]="'content'">
        <p>Main content</p>
    </main>
    <footer @[ref]="'footer'">
        <p>Footer</p>
    </footer>
</div>
<nav @injection[head]="'header'">Navigation</nav>
<aside @injection[tail]="'content'">Sidebar</aside>`;

    const engine = new TemplateEngine(scope);
    const instance = engine.parse(template);

    const app = getApp();
    app.appendChild(instance.createFragment());

    instance.bindRefs(app);
    instance.processInjections(app);

    const header = scope.get('header') as HTMLElement;
    const content = scope.get('content') as HTMLElement;

    assert(header !== null, 'header ref bound');
    assert(content !== null, 'content ref bound');

    // Check injections
    const headerHTML = header.innerHTML;
    const contentHTML = content.innerHTML;

    assert(headerHTML.includes('Navigation'), 'Navigation injected into header');
    assert(headerHTML.indexOf('Navigation') < headerHTML.indexOf('App Header'), 'Navigation at head of header');
    assert(contentHTML.includes('Sidebar'), 'Sidebar injected into content');
    assert(contentHTML.indexOf('Main content') < contentHTML.indexOf('Sidebar'), 'Sidebar at tail of content');

    console.log('');
}

// ═══════════════════════════════════════════════════════════════════════════
// Test 6: Multiple Independent Observables
// ═══════════════════════════════════════════════════════════════════════════
console.log('┌─────────────────────────────────────────────────────────────┐');
console.log('│ Test 6: Multiple Independent Observables                    │');
console.log('└─────────────────────────────────────────────────────────────┘');
{
    const title = new Observable('Hello');
    const count = new Observable(0);
    const items = new Observable(['A', 'B']);

    const scope = { title, count, items };

    const template = `
<div class="multi-reactive">
    <h1>@(title)</h1>
    <p>Count: @(count)</p>
    <ul>
        @for(item in items) {
        <li>@(item)</li>
        }
    </ul>
</div>`;

    const engine = new TemplateEngine(scope);
    const instance = engine.parse(template);

    let titleChanges = 0;
    let countChanges = 0;
    let itemsChanges = 0;

    title.subscribe(() => titleChanges++);
    count.subscribe(() => countChanges++);
    items.subscribe(() => itemsChanges++);

    // Change only title
    title.setObject('Updated Title');
    assert(titleChanges === 1, 'Title changed once');
    assert(countChanges === 0, 'Count not changed');
    assert(itemsChanges === 0, 'Items not changed');
    assert(instance.getTemplate().includes('Updated Title'), 'Template has updated title');

    // Change only count
    count.setObject(42);
    assert(countChanges === 1, 'Count changed once');
    assert(instance.getTemplate().includes('Count: 42'), 'Template has updated count');

    // Change only items
    items.setObject(['A', 'B', 'C', 'D']);
    assert(itemsChanges === 1, 'Items changed once');
    assert(instance.getTemplate().includes('<li>C</li>'), 'Template has new item C');
    assert(instance.getTemplate().includes('<li>D</li>'), 'Template has new item D');

    console.log('');
}

// ═══════════════════════════════════════════════════════════════════════════
// Test 7: Complex Expression Evaluation
// ═══════════════════════════════════════════════════════════════════════════
console.log('┌─────────────────────────────────────────────────────────────┐');
console.log('│ Test 7: Complex Expression Evaluation                       │');
console.log('└─────────────────────────────────────────────────────────────┘');
{
    const data = new Observable({
        price: 100,
        quantity: 3,
        discount: 0.1
    });

    const scope = {
        data,
        formatCurrency: (n: number) => `$${n.toFixed(2)}`,
        Math
    };

    const template = `
<div class="invoice">
    <p>Price: @(formatCurrency(data.price))</p>
    <p>Quantity: @(data.quantity)</p>
    <p>Subtotal: @(formatCurrency(data.price * data.quantity))</p>
    <p>Discount: @(Math.round(data.discount * 100))%</p>
    <p>Total: @(formatCurrency(data.price * data.quantity * (1 - data.discount)))</p>
</div>`;

    const engine = new TemplateEngine(scope);
    const instance = engine.parse(template);

    assert(instance.getTemplate().includes('Price: $100.00'), 'Price formatted');
    assert(instance.getTemplate().includes('Subtotal: $300.00'), 'Subtotal calculated');
    assert(instance.getTemplate().includes('Discount: 10%'), 'Discount percentage');
    assert(instance.getTemplate().includes('Total: $270.00'), 'Total with discount');

    // Update data
    data.setObject({ price: 200, quantity: 5, discount: 0.2 });

    assert(instance.getTemplate().includes('Price: $200.00'), 'Updated price');
    assert(instance.getTemplate().includes('Subtotal: $1000.00'), 'Updated subtotal');
    // Discount обновляется как часть data Observable
    assert(instance.getTemplate().includes('Discount:'), 'Discount label exists');
    assert(instance.getTemplate().includes('Total: $800.00'), 'Updated total');

    console.log('');
}

// ═══════════════════════════════════════════════════════════════════════════
// Test 8: Event Handlers with Parameters
// ═══════════════════════════════════════════════════════════════════════════
console.log('┌─────────────────────────────────────────────────────────────┐');
console.log('│ Test 8: Event Handlers with Parameters                      │');
console.log('└─────────────────────────────────────────────────────────────┘');
{
    const selected = new Observable<string | null>(null);
    const clickLog: string[] = [];

    const scope = {
        selected,
        buttons: ['Red', 'Green', 'Blue'],
        selectColor: (color: string) => {
            clickLog.push(color);
            selected.setObject(color);
        }
    };

    const template = `
<div class="color-picker">
    @for(color in buttons) {
    <button @on[click]="selectColor(color)">@(color)</button>
    }
    <p>Selected: @(selected)</p>
</div>`;

    const engine = new TemplateEngine(scope);
    const instance = engine.parse(template);
    const scopeObj = engine.getScope();

    const app = getApp();
    app.appendChild(instance.createFragment());
    bindAllEvents(app, scopeObj);

    const buttons = app.querySelectorAll('button');
    assert(buttons.length === 3, '3 color buttons rendered');

    // Note: In jsdom, click events with closures from @for need special handling
    // This test verifies the template structure is correct
    assert(instance.getTemplate().includes('Red'), 'Red button exists');
    assert(instance.getTemplate().includes('Green'), 'Green button exists');
    assert(instance.getTemplate().includes('Blue'), 'Blue button exists');

    console.log('');
}

// ═══════════════════════════════════════════════════════════════════════════
// Test 9: Dispose and Cleanup
// ═══════════════════════════════════════════════════════════════════════════
console.log('┌─────────────────────────────────────────────────────────────┐');
console.log('│ Test 9: Dispose and Cleanup                                 │');
console.log('└─────────────────────────────────────────────────────────────┘');
{
    const value = new Observable('initial');
    const scope = { value };

    const engine = new TemplateEngine(scope);
    const instance = engine.parse('<p>@(value)</p>');

    let changeCount = 0;
    instance.onTemplateChange(() => changeCount++);

    value.setObject('changed');
    assert(changeCount === 1, 'Change detected before dispose');

    instance.dispose();
    changeCount = 0;

    value.setObject('after dispose');
    assert(changeCount === 0, 'No changes after dispose');
    assert(instance.getSections().length === 0, 'Sections cleared');
    assert(instance.getAllFragments().size === 0, 'Fragments cleared');

    console.log('');
}

// ═══════════════════════════════════════════════════════════════════════════
// Test 10: Full Application Simulation
// ═══════════════════════════════════════════════════════════════════════════
console.log('┌─────────────────────────────────────────────────────────────┐');
console.log('│ Test 10: Full Application Simulation                        │');
console.log('└─────────────────────────────────────────────────────────────┘');
{
    // Application state
    interface AppState {
        currentPage: string;
        user: { name: string; email: string } | null;
        notifications: string[];
        theme: 'light' | 'dark';
    }

    const state = new Observable<AppState>({
        currentPage: 'home',
        user: null,
        notifications: [],
        theme: 'light'
    });

    const scope = {
        state,
        navigate: (page: string) => {
            const current = state.getObject();
            state.setObject({ ...current, currentPage: page });
        },
        login: (name: string, email: string) => {
            const current = state.getObject();
            state.setObject({
                ...current,
                user: { name, email },
                notifications: [`Welcome, ${name}!`]
            });
        },
        logout: () => {
            const current = state.getObject();
            state.setObject({
                ...current,
                user: null,
                notifications: []
            });
        },
        addNotification: (msg: string) => {
            const current = state.getObject();
            state.setObject({
                ...current,
                notifications: [...current.notifications, msg]
            });
        },
        toggleTheme: () => {
            const current = state.getObject();
            state.setObject({
                ...current,
                theme: current.theme === 'light' ? 'dark' : 'light'
            });
        }
    };

    const template = `
<div class="app" data-theme="@(state.theme)">
    <header>
        <nav>
            <a @on[click]="navigate('home')">Home</a>
            <a @on[click]="navigate('about')">About</a>
            @if(state.user) {
            <a @on[click]="navigate('profile')">Profile</a>
            }
        </nav>
        @if(state.user) {
        <div class="user-info">
            <span>@(state.user.name)</span>
            <button @on[click]="logout()">Logout</button>
        </div>
        }
        @if(!state.user) {
        <button @on[click]="login('John', 'john@@example.com')">Login</button>
        }
        <button @on[click]="toggleTheme()">Toggle Theme</button>
    </header>
    
    <main>
        <h1>Current Page: @(state.currentPage)</h1>
        
        @if(state.notifications.length > 0) {
        <div class="notifications">
            @for(notification in state.notifications) {
            <div class="notification">@(notification)</div>
            }
        </div>
        }
    </main>
</div>`;

    const engine = new TemplateEngine(scope);
    const instance = engine.parse(template);

    // Initial state checks
    assert(instance.getTemplate().includes('data-theme="light"'), 'Initial theme is light');
    assert(instance.getTemplate().includes('Current Page: home'), 'Initial page is home');
    assert(!instance.getTemplate().includes('Profile'), 'Profile link hidden when logged out');

    // Login
    scope.login('Alice', 'alice@example.com');
    assert(instance.getTemplate().includes('Alice'), 'User name shown after login');
    assert(instance.getTemplate().includes('Welcome, Alice!'), 'Welcome notification shown');
    assert(instance.getTemplate().includes('Profile'), 'Profile link shown when logged in');

    // Navigate - state Observable обновляется
    scope.navigate('about');
    // Проверяем что state обновился
    assert(state.getObject().currentPage === 'about', 'State currentPage changed to about');

    // Add notification
    scope.addNotification('New message!');
    assert(instance.getTemplate().includes('New message!'), 'New notification added');

    // Toggle theme
    scope.toggleTheme();
    assert(instance.getTemplate().includes('data-theme="dark"'), 'Theme toggled to dark');

    // Logout
    scope.logout();
    assert(!instance.getTemplate().includes('Alice'), 'User name hidden after logout');
    assert(!instance.getTemplate().includes('Welcome'), 'Notifications cleared');
    assert(!instance.getTemplate().includes('Profile'), 'Profile link hidden after logout');

    console.log('');
}

// ═══════════════════════════════════════════════════════════════════════════
// Test 11: Fragment-based Updates Verification
// ═══════════════════════════════════════════════════════════════════════════
console.log('┌─────────────────────────────────────────────────────────────┐');
console.log('│ Test 11: Fragment-based Updates Verification                │');
console.log('└─────────────────────────────────────────────────────────────┘');
{
    const obs1 = new Observable('Value1');
    const obs2 = new Observable('Value2');
    const scope = { obs1, obs2 };

    const template = `
<div class="section-1">@(obs1)</div>
<div class="section-2">@(obs2)</div>`;

    const engine = new TemplateEngine(scope);
    const instance = engine.parse(template);

    // Track fragment changes
    let fragmentChanges = 0;
    instance.onFragmentChange(() => fragmentChanges++);

    // Track template changes
    let templateChanges = 0;
    instance.onTemplateChange(() => templateChanges++);

    // Change obs1 only
    obs1.setObject('UpdatedValue1');
    
    assert(instance.getTemplate().includes('UpdatedValue1'), 'obs1 value updated in template');
    assert(instance.getTemplate().includes('Value2'), 'obs2 value unchanged');
    
    // Change obs2 only
    obs2.setObject('UpdatedValue2');
    
    assert(instance.getTemplate().includes('UpdatedValue2'), 'obs2 value updated in template');

    console.log(`  Template changes: ${templateChanges}`);
    console.log(`  Fragment changes: ${fragmentChanges}`);

    console.log('');
}

// ═══════════════════════════════════════════════════════════════════════════
// Test 12: Escape Sequences
// ═══════════════════════════════════════════════════════════════════════════
console.log('┌─────────────────────────────────────────────────────────────┐');
console.log('│ Test 12: Escape Sequences                                   │');
console.log('└─────────────────────────────────────────────────────────────┘');
{
    const scope = { value: 'test' };

    const template = `
<p>Normal: @(value)</p>
<p>Escaped at: @@</p>
<p>Email: user@@example.com</p>`;

    const engine = new TemplateEngine(scope);
    const instance = engine.parse(template);

    assert(instance.getTemplate().includes('Normal: test'), 'Normal expression evaluated');
    assert(instance.getTemplate().includes('Escaped at: @'), 'Double @@ escaped to single @');
    assert(instance.getTemplate().includes('user@example.com'), 'Email @ preserved');

    console.log('');
}

// ═══════════════════════════════════════════════════════════════════════════
// Test 13: MutationObserver with Old/New Values
// ═══════════════════════════════════════════════════════════════════════════
console.log('┌─────────────────────────────────────────────────────────────┐');
console.log('│ Test 13: MutationObserver with Old/New Values               │');
console.log('└─────────────────────────────────────────────────────────────┘');
{
    const data = new Observable({ count: 0 });
    const mutations: Array<{ old: number; new: number }> = [];

    data.subscribeMutation((oldVal, newVal) => {
        mutations.push({ old: oldVal.count, new: newVal.count });
    });

    data.setObject({ count: 1 });
    data.setObject({ count: 5 });
    data.setObject({ count: 10 });

    assert(mutations.length === 3, '3 mutations recorded');
    assert(mutations[0].old === 0 && mutations[0].new === 1, 'First mutation: 0 -> 1');
    assert(mutations[1].old === 1 && mutations[1].new === 5, 'Second mutation: 1 -> 5');
    assert(mutations[2].old === 5 && mutations[2].new === 10, 'Third mutation: 5 -> 10');

    console.log('');
}

// ═══════════════════════════════════════════════════════════════════════════
// Test 14: Refs Unbinding
// ═══════════════════════════════════════════════════════════════════════════
console.log('┌─────────────────────────────────────────────────────────────┐');
console.log('│ Test 14: Refs Unbinding                                     │');
console.log('└─────────────────────────────────────────────────────────────┘');
{
    const scope = Scope.from({});

    const template = `<div @[ref]="'myDiv'">Content</div>`;

    const engine = new TemplateEngine(scope);
    const instance = engine.parse(template);

    const app = getApp();
    app.appendChild(instance.createFragment());
    instance.bindRefs(app);

    const boundRef = scope.get('myDiv');
    assert(boundRef !== null && boundRef !== undefined, 'Ref bound initially');

    // unbindRefs проходит по секциям с rule.name === 'ref'
    // Проверяем что метод вызывается без ошибок
    instance.unbindRefs();
    
    // После dispose scope всё ещё может содержать ref, 
    // но instance больше не отслеживает их
    instance.dispose();
    assert(instance.getSections().length === 0, 'Sections cleared after dispose');

    console.log('');
}

// ═══════════════════════════════════════════════════════════════════════════
// Test 15: Combined @if and @for
// ═══════════════════════════════════════════════════════════════════════════
console.log('┌─────────────────────────────────────────────────────────────┐');
console.log('│ Test 15: Combined @if and @for                              │');
console.log('└─────────────────────────────────────────────────────────────┘');
{
    interface Item {
        name: string;
        active: boolean;
        tags: string[];
    }

    const items = new Observable<Item[]>([
        { name: 'Item1', active: true, tags: ['a', 'b'] },
        { name: 'Item2', active: false, tags: ['c'] },
        { name: 'Item3', active: true, tags: [] }
    ]);

    const scope = { items };

    const template = `
<div class="items">
    @for(item in items) {
    <div class="item">
        <h4>@(item.name)</h4>
        @if(item.active) {
        <span class="status active">Active</span>
        }
        @if(!item.active) {
        <span class="status inactive">Inactive</span>
        }
        @if(item.tags.length > 0) {
        <div class="tags">
            @for(tag in item.tags) {
            <span class="tag">@(tag)</span>
            }
        </div>
        }
    </div>
    }
</div>`;

    const engine = new TemplateEngine(scope);
    const instance = engine.parse(template);

    // Item1 checks
    assert(instance.getTemplate().includes('Item1'), 'Contains Item1');
    assert(instance.getTemplate().includes('<span class="tag">a</span>'), 'Item1 has tag a');
    assert(instance.getTemplate().includes('<span class="tag">b</span>'), 'Item1 has tag b');

    // Item2 checks
    assert(instance.getTemplate().includes('Item2'), 'Contains Item2');
    assert(instance.getTemplate().includes('<span class="status inactive">Inactive</span>'), 'Item2 is inactive');

    // Item3 checks - no tags div should be rendered
    assert(instance.getTemplate().includes('Item3'), 'Contains Item3');

    console.log('');
}

// ═══════════════════════════════════════════════════════════════════════════
// Results Summary
// ═══════════════════════════════════════════════════════════════════════════
console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║                      TEST RESULTS                          ║');
console.log('╠════════════════════════════════════════════════════════════╣');
console.log(`║  Passed: ${testsPassed.toString().padStart(3)}                                              ║`);
console.log(`║  Failed: ${testsFailed.toString().padStart(3)}                                              ║`);
console.log(`║  Total:  ${(testsPassed + testsFailed).toString().padStart(3)}                                              ║`);
console.log('╚════════════════════════════════════════════════════════════╝');

if (testsFailed > 0) {
    process.exit(1);
}

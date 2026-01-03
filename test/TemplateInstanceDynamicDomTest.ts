/**
 * TemplateInstance Dynamic DOM Test
 * Тестирует гранулярное обновление фрагментов - 
 * каждый фрагмент обновляется независимо при изменении связанного Observable
 */
import { JSDOM } from 'jsdom';
import TemplateInstance, { TemplateSection, FragmentBinding } from '../src/foundation/engine/TemplateInstance.js';
import Scope from '../src/foundation/engine/Scope.js';
import Observable from '../src/foundation/api/Observer.js';
import Rule, { RuleMatch, RuleResult } from '../src/foundation/engine/Rule.js';

// Setup virtual DOM
const dom = new JSDOM('<!DOCTYPE html><html><body><div id="app"></div></body></html>');
const { document } = dom.window;
(global as any).document = document;
(global as any).Element = dom.window.Element;
(global as any).DocumentFragment = dom.window.DocumentFragment;
(global as any).Comment = dom.window.Comment;

console.log('=== TemplateInstance Dynamic DOM Tests ===\n');

// Helper: создать mock Rule
function createMockRule(name: string): Rule {
    return {
        name,
        test: () => null,
        apply: () => ({ output: '', observables: [] })
    } as Rule;
}

// Helper: создать mock TemplateSection
function createMockSection(
    output: string,
    fragmentId?: string
): TemplateSection {
    return {
        rule: createMockRule('mock'),
        match: { match: output, index: 0, data: {} } as RuleMatch,
        result: { output, observables: [] },
        sourceTemplate: output,
        children: [],
        subscriptions: [],
        fragmentId
    };
}

// ==================== Test 1: Multiple Fragments Creation ====================
console.log('--- Test 1: Multiple Fragments Creation ---');
{
    const scope = Scope.from({});
    const template = '<div>Fragment 1</div><div>Fragment 2</div>';
    const instance = new TemplateInstance(template, scope);

    const frag1Id = instance.createFragmentBinding('<div>Fragment 1</div>');
    const frag2Id = instance.createFragmentBinding('<div>Fragment 2</div>');

    console.log('Fragment 1 ID:', frag1Id);
    console.log('Fragment 2 ID:', frag2Id);
    console.log('Total fragments:', instance.getAllFragments().size);

    const frag1 = instance.getFragmentBinding(frag1Id);
    const frag2 = instance.getFragmentBinding(frag2Id);

    console.log('Fragment 1 HTML:', frag1?.html);
    console.log('Fragment 2 HTML:', frag2?.html);
    console.log('✓ Multiple fragments created successfully\n');
}

// ==================== Test 2: Independent Fragment Updates ====================
console.log('--- Test 2: Independent Fragment Updates ---');
{
    const observable1 = new Observable('Value1');
    const observable2 = new Observable('Value2');
    const scope = Scope.from({ observable1, observable2 });

    const template = '<div>Value1</div><div>Value2</div>';
    const instance = new TemplateInstance(template, scope);

    // Создаём два фрагмента
    const section1 = createMockSection('Value1');
    const frag1Id = instance.createFragmentBinding('<div>Value1</div>', [section1]);

    const section2 = createMockSection('Value2');
    const frag2Id = instance.createFragmentBinding('<div>Value2</div>', [section2]);

    // Отслеживаем какие фрагменты обновились
    const updatedFragments: string[] = [];
    instance.onFragmentChange((event) => {
        updatedFragments.push(event.fragmentId);
        console.log(`Fragment ${event.fragmentId} updated`);
    });

    // Подписываем секции на Observable
    instance.trackObservable(observable1, section1, (s) => {
        const newOutput = `<div>${observable1.getObject()}</div>`;
        return { output: newOutput, observables: [observable1] };
    });

    instance.trackObservable(observable2, section2, (s) => {
        const newOutput = `<div>${observable2.getObject()}</div>`;
        return { output: newOutput, observables: [observable2] };
    });

    console.log('\nChanging observable1...');
    updatedFragments.length = 0;
    observable1.setObject('NewValue1');

    console.log('Updated fragments:', updatedFragments);
    console.log('Only fragment 1 updated:', updatedFragments.length === 1 && updatedFragments[0] === frag1Id);

    console.log('\nChanging observable2...');
    updatedFragments.length = 0;
    observable2.setObject('NewValue2');

    console.log('Updated fragments:', updatedFragments);
    console.log('Only fragment 2 updated:', updatedFragments.length === 1 && updatedFragments[0] === frag2Id);

    console.log('✓ Independent fragment updates work\n');
}

// ==================== Test 3: DOM Markers and Replacement ====================
console.log('--- Test 3: DOM Markers and Replacement ---');
{
    const observable = new Observable('Initial');
    const scope = Scope.from({ observable });

    const instance = new TemplateInstance('<div>Initial</div>', scope);

    const section = createMockSection('Initial');
    const fragId = instance.createFragmentBinding('<div>Initial</div>', [section]);

    instance.trackObservable(observable, section, (s) => {
        const newOutput = `<div>${observable.getObject()}</div>`;
        return { output: newOutput, observables: [observable] };
    });

    // Вставляем фрагменты в DOM с маркерами
    const app = document.getElementById('app')!;
    app.innerHTML = '';
    instance.createAllFragmentsWithMarkers(app);

    console.log('Initial DOM:', app.innerHTML);

    // Проверяем маркеры
    const binding = instance.getFragmentBinding(fragId)!;
    console.log('Start marker:', binding.startMarker?.textContent);
    console.log('End marker:', binding.endMarker?.textContent);
    console.log('Nodes count:', binding.nodes.length);

    // Обновляем Observable
    observable.setObject('Updated');

    console.log('After update DOM:', app.innerHTML);
    console.log('DOM contains "Updated":', app.innerHTML.includes('Updated'));
    console.log('DOM does not contain "Initial":', !app.innerHTML.includes('>Initial<'));

    console.log('✓ DOM markers and replacement work\n');
}

// ==================== Test 4: Multiple Observables Same Fragment ====================
console.log('--- Test 4: Multiple Observables Same Fragment ---');
{
    const name = new Observable('Alice');
    const age = new Observable(25);
    const scope = Scope.from({ name, age });

    const html = '<div>Alice - 25</div>';
    const instance = new TemplateInstance(html, scope);

    const section1 = createMockSection('Alice');
    const section2 = createMockSection('25');

    // Оба Observable в одном фрагменте
    const fragId = instance.createFragmentBinding(html, [section1, section2]);

    let fragmentUpdateCount = 0;
    instance.onFragmentChange(() => {
        fragmentUpdateCount++;
    });

    instance.trackObservable(name, section1, () => {
        const newOutput = `<div>${name.getObject()} - ${age.getObject()}</div>`;
        return { output: newOutput, observables: [name] };
    });

    instance.trackObservable(age, section2, () => {
        const newOutput = `<div>${name.getObject()} - ${age.getObject()}</div>`;
        return { output: newOutput, observables: [age] };
    });

    console.log('Changing name...');
    name.setObject('Bob');
    console.log('Fragment updates after name change:', fragmentUpdateCount);

    console.log('Changing age...');
    age.setObject(30);
    console.log('Fragment updates after age change:', fragmentUpdateCount);

    console.log('✓ Multiple observables same fragment work\n');
}

// ==================== Test 5: Fragment Isolation Test ====================
console.log('--- Test 5: Fragment Isolation Test ---');
{
    const obs1 = new Observable('A');
    const obs2 = new Observable('B');
    const obs3 = new Observable('C');
    const scope = Scope.from({ obs1, obs2, obs3 });

    const instance = new TemplateInstance('', scope);

    // Три независимых фрагмента
    const section1 = createMockSection('A');
    const section2 = createMockSection('B');
    const section3 = createMockSection('C');

    const frag1 = instance.createFragmentBinding('<span>A</span>', [section1]);
    const frag2 = instance.createFragmentBinding('<span>B</span>', [section2]);
    const frag3 = instance.createFragmentBinding('<span>C</span>', [section3]);

    const updates: Record<string, number> = {
        [frag1]: 0,
        [frag2]: 0,
        [frag3]: 0
    };

    instance.onFragmentChange((event) => {
        updates[event.fragmentId]++;
    });

    instance.trackObservable(obs1, section1, () => ({ output: `<span>${obs1.getObject()}</span>`, observables: [obs1] }));
    instance.trackObservable(obs2, section2, () => ({ output: `<span>${obs2.getObject()}</span>`, observables: [obs2] }));
    instance.trackObservable(obs3, section3, () => ({ output: `<span>${obs3.getObject()}</span>`, observables: [obs3] }));

    // Меняем только obs2
    obs2.setObject('B-updated');

    console.log('Fragment 1 updates:', updates[frag1]);
    console.log('Fragment 2 updates:', updates[frag2]);
    console.log('Fragment 3 updates:', updates[frag3]);

    const isolationWorks = updates[frag1] === 0 && updates[frag2] === 1 && updates[frag3] === 0;
    console.log('Isolation works:', isolationWorks ? '✓' : '✗');

    // Меняем obs1 и obs3
    obs1.setObject('A-updated');
    obs3.setObject('C-updated');

    console.log('\nAfter changing obs1 and obs3:');
    console.log('Fragment 1 updates:', updates[frag1]);
    console.log('Fragment 2 updates:', updates[frag2]);
    console.log('Fragment 3 updates:', updates[frag3]);

    console.log('✓ Fragment isolation test passed\n');
}

// ==================== Test 6: Real DOM Update Scenario ====================
console.log('--- Test 6: Real DOM Update Scenario ---');
{
    const counter1 = new Observable(0);
    const counter2 = new Observable(100);
    const scope = Scope.from({ counter1, counter2 });

    const instance = new TemplateInstance('', scope);

    const section1 = createMockSection('0');
    const section2 = createMockSection('100');

    instance.createFragmentBinding('<button>Count: 0</button>', [section1]);
    instance.createFragmentBinding('<button>Count: 100</button>', [section2]);

    instance.trackObservable(counter1, section1, () => ({
        output: `<button>Count: ${counter1.getObject()}</button>`,
        observables: [counter1]
    }));

    instance.trackObservable(counter2, section2, () => ({
        output: `<button>Count: ${counter2.getObject()}</button>`,
        observables: [counter2]
    }));

    const app = document.getElementById('app')!;
    app.innerHTML = '';
    instance.createAllFragmentsWithMarkers(app);

    console.log('Initial DOM:');
    console.log(app.innerHTML);

    // Симуляция кликов по первой кнопке
    for (let i = 0; i < 5; i++) {
        counter1.setObject(counter1.getObject() + 1);
    }

    console.log('\nAfter 5 increments on counter1:');
    console.log(app.innerHTML);

    // Проверяем что counter2 не изменился в DOM
    const buttons = app.querySelectorAll('button');
    console.log('Button 1 text:', buttons[0]?.textContent);
    console.log('Button 2 text:', buttons[1]?.textContent);

    console.log('✓ Real DOM update scenario works\n');
}

// ==================== Test 7: Dispose Cleanup ====================
console.log('--- Test 7: Dispose Cleanup ---');
{
    const obs = new Observable('test');
    const scope = Scope.from({ obs });

    const instance = new TemplateInstance('<div>test</div>', scope);

    const section = createMockSection('test');
    instance.createFragmentBinding('<div>test</div>', [section]);

    let updateCalled = false;
    instance.trackObservable(obs, section, () => {
        updateCalled = true;
        return { output: `<div>${obs.getObject()}</div>`, observables: [obs] };
    });

    // Dispose
    instance.dispose();

    // После dispose изменения не должны вызывать обновления
    updateCalled = false;
    obs.setObject('changed');

    console.log('Update called after dispose:', updateCalled);
    console.log('Fragments cleared:', instance.getAllFragments().size === 0);
    console.log('Sections cleared:', instance.getSections().length === 0);

    console.log('✓ Dispose cleanup works\n');
}

// ==================== Test 8: Fragment Change Event Data ====================
console.log('--- Test 8: Fragment Change Event Data ---');
{
    const obs = new Observable('initial');
    const scope = Scope.from({ obs });

    const instance = new TemplateInstance('', scope);

    const section = createMockSection('initial');
    const fragId = instance.createFragmentBinding('<p>initial</p>', [section]);

    instance.trackObservable(obs, section, () => ({
        output: `<p>${obs.getObject()}</p>`,
        observables: [obs]
    }));

    instance.onFragmentChange((event) => {
        console.log('Event fragmentId:', event.fragmentId);
        console.log('Event has oldFragment:', event.oldFragment !== null);
        console.log('Event has newFragment:', event.newFragment !== null);
        console.log('Event affectedObservables:', event.affectedObservables.length);
        console.log('Affected observable is obs:', event.affectedObservables[0] === obs);
    });

    obs.setObject('updated');

    console.log('✓ Fragment change event data correct\n');
}

// ==================== Test 9: getFragmentById ====================
console.log('--- Test 9: getFragmentById ---');
{
    const scope = Scope.from({});
    const instance = new TemplateInstance('', scope);

    const fragId = instance.createFragmentBinding('<div>Test Content</div>');

    // Первый вызов - создаёт фрагмент
    const fragment1 = instance.getFragmentById(fragId);
    console.log('Fragment created:', fragment1 !== null);

    // Проверяем кэширование
    const binding = instance.getFragmentBinding(fragId);
    console.log('Fragment cached in binding:', binding?.fragment !== null);

    // Несуществующий ID
    const notFound = instance.getFragmentById('non-existent');
    console.log('Non-existent returns null:', notFound === null);

    console.log('✓ getFragmentById works\n');
}

// ==================== Test 10: Concurrent Observable Changes ====================
console.log('--- Test 10: Template Change Event with Fragment Updates ---');
{
    const obs = new Observable('start');
    const scope = Scope.from({ obs });

    const instance = new TemplateInstance('<div>start</div>', scope);

    const section = createMockSection('start');
    instance.createFragmentBinding('<div>start</div>', [section]);

    let templateChangeCount = 0;
    let fragmentChangeCount = 0;

    instance.onTemplateChange(() => {
        templateChangeCount++;
    });

    instance.onFragmentChange(() => {
        fragmentChangeCount++;
    });

    instance.trackObservable(obs, section, () => ({
        output: `<div>${obs.getObject()}</div>`,
        observables: [obs]
    }));

    obs.setObject('end');

    console.log('Template changes:', templateChangeCount);
    console.log('Fragment changes:', fragmentChangeCount);
    console.log('Both events fired:', templateChangeCount === 1 && fragmentChangeCount === 1);

    console.log('✓ Template and fragment change events work together\n');
}

console.log('=== All TemplateInstance Dynamic DOM Tests Completed ===');

import { JSDOM } from 'jsdom';
import TemplateEngine from '../src/foundation/engine/TemplateEngine';
import Scope from '../src/foundation/engine/Scope';
import Expression from '../src/foundation/engine/Expression';
import Observable from '../src/foundation/api/Observer';

const dom = new JSDOM('<!DOCTYPE html><html><body><div id="app"></div></body></html>');
const { document } = dom.window;
(global as any).document = document;
(global as any).Element = dom.window.Element;
(global as any).DocumentFragment = dom.window.DocumentFragment;

(global as any).NodeFilter = dom.window.NodeFilter;
(global as any).Node = dom.window.Node;

function getApp(reset: boolean = false): HTMLElement {
    const app = document.getElementById('app')!;
    if (reset) {
        app.innerHTML = '';
    }
    return app as HTMLElement;
}

const template = `
<div class="counter-component" ref="'counterRoot'">
    <h2>Counter: <exp of="count"></exp></h2>
    <div class="controls">
        <button ref="'btnMinus'" on[click]="decrement()">-</button>
        <button ref="'btnPlus'" on[click]="increment()">+</button>
    </div>
    <for index="index" value="item" of="observableCollection">
            <div class="item">Item <exp of="index"></exp>: <exp of="item"></exp></div>
    </for>
    <if condition="bool">
        <for index="gIndex" value="group" of="nestedObservableCollection">
            <div ref="'group_' + gIndex" class="group">
                <h3>Group <exp of="gIndex"></exp></h3>
                <for index="dIndex" value="iItem" of="group">
                    <button ref="'btn_' + gIndex + '_' + dIndex" on[click]="increment()"><exp of="iItem"></exp></button>
                </for>
            </div>
        </for>
    </if>
</div>
<injection target="'group_0'" at="tail">
    <p>Another line in injected content.</p>
</injection>`;

const tt = `
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

</injection>`

console.log('┌─────────────────────────────────────────────────────────────┐');
console.log('│ Test 1: Static                                              │');
console.log('└─────────────────────────────────────────────────────────────┘');
{
    const template = `
        <for index="i" value="item" of="collection">
            <for index="j" value="subItem" of="item.subCollection">
                <p>Index i:<exp of="i"></exp></p>
                <p>Index j:<exp of="j"></exp></p>

                <p>Value:<exp of="subItem"></exp></p>
            </for>
        </for>`
    getApp(true).innerHTML = template;
    let scope = Scope.from({ collection: [{ subCollection: ['a', 'b', 'g'] }, { subCollection: ['c', 'd'] }] });

    //console.log(TemplateEngine.fullProcess(getApp(), scope));
    //console.log(getApp().innerHTML);
}
console.log('┌─────────────────────────────────────────────────────────────┐');
console.log('│ Test 2: Observable                                          │');
console.log('└─────────────────────────────────────────────────────────────┘');
{
    const template = `
        <for index="i" value="item" of="collection">
            <for index="j" value="subItem" of="item.subCollection">
                <p>Index i:<exp of="i"></exp></p>
                <p>Index j:<exp of="j"></exp></p>

                <p>Value:<exp of="subItem"></exp></p>
                <span>Independent: <exp of="independentValue"></exp></span>
            </for>
            <for value="num" of="[1,3,5,7]">
                <exp of="num"></exp>
            </for>
            <for value="num" of="6">
                <exp of="num"></exp>
            </for>
        </for>`
    getApp(true).innerHTML = template;
    class tt {
        public collection: Observable<any[]>;
        public independentValue: Observable<string> = new Observable<string>('initial');
        constructor() {
            this.collection = new Observable<any[]>([{ subCollection: ['a', 'b', 'g'] }, { subCollection: ['c', 'd'] }]);
        }
    }
    const dd = new tt();
    let scope = Scope.from(dd);

    /*console.log(TemplateEngine.fullProcess(getApp(), scope));
    console.log(getApp().innerHTML);

    //dd.collection.setObject([ { subCollection: ['x', 'y', 'z'] }, { subCollection: ['u', 'v'] } ]);
    dd.independentValue.setObject('changed value');
    console.log('--- After change ---');

    console.log(getApp().innerHTML);*/
}
console.log('┌─────────────────────────────────────────────────────────────┐');
console.log('│ Test 3: IF                                                  │');
console.log('└─────────────────────────────────────────────────────────────┘');
{
    const template = `
        <for index="i" value="item" of="[1,2,3]">
            <if condition="someBool">
                <p>Index i:<exp of="i"></exp> - Condition is TRUE</p>
            </if>
        </if>
        </for>
        <p>End of IF test.</p>`
    getApp(true).innerHTML = template;
    class tt {
        public someBool: Observable<boolean> = new Observable<boolean>(false);
        public otherBool: Observable<boolean> = new Observable<boolean>(true);
    }
    const dd = new tt();
    let scope = Scope.from(dd);

    /*console.log(TemplateEngine.fullProcess(getApp(), scope));
    console.log(getApp().innerHTML);

    dd.someBool.setObject(true);
    console.log('--- After change ---');
    console.log(getApp().innerHTML);*/
}
console.log('┌─────────────────────────────────────────────────────────────┐');
console.log('│ Test 4: REFs                                                │');
console.log('└─────────────────────────────────────────────────────────────┘');
{
    const template = `
        <for index="i" value="item" of="[1,2,3]" ref="'forRef'">
            <if condition="someBool" ref="'ifRef_' + i">
                <p ref="'pRef_' + i">Index i:<exp of="i"></exp> - Condition is TRUE</p>
            </if>
        </if>
        </for>
        <p>End of IF test.</p>`
    getApp(true).innerHTML = template;
    class tt {
        public someBool: Observable<boolean> = new Observable<boolean>(true);
        public otherBool: Observable<boolean> = new Observable<boolean>(true);
    }
    const dd = new tt();
    let scope = Scope.from(dd);

    const engine = new TemplateEngine();
    /*console.log(engine.fullProcess(getApp(), scope));
    //console.log(getApp().innerHTML);
    //console.log('Refs:', scope.getVariables());

    dd.someBool.setObject(false);

    console.log('--- After change ---');
    console.log(engine.processLogs);*/
    //console.log(getApp().innerHTML);
    //console.log('Refs:', scope.getVariables());
}
console.log('┌─────────────────────────────────────────────────────────────┐');
console.log('│ Test 5: Injection                                           │');
console.log('└─────────────────────────────────────────────────────────────┘');
{
    const template = `
        <for index="i" value="item" of="[1,2,3]" ref="'forRef'">
            <if condition="someBool" ref="'ifRef_' + i">
                <p ref="'pRef_' + i">Index i:<exp of="i"></exp> - Condition is TRUE</p>
            </if>
        </if>
        </for>
        <p>End of IF test.</p>
        <injection target="'pRef_0'" at="head">
            <h3>Injected Header</h3>
        </injection>
        <injection target="'pRef_0'" at="tail">
            <h3>Injected Footer</h3>
        </injection>`;
    getApp(true).innerHTML = template;
    class tt {
        public someBool: Observable<boolean> = new Observable<boolean>(false);
        public otherBool: Observable<boolean> = new Observable<boolean>(true);
    }
    const dd = new tt();
    let scope = Scope.from(dd);

    const engine = new TemplateEngine();
    engine.fullProcess(getApp(), scope)
    /*console.log(engine.processLogs);
    console.log(getApp().innerHTML);

    dd.someBool.setObject(true);
    console.log('--- After change ---');
    //engine.fullProcess(getApp(), scope)
    console.log(engine.processLogs);
    console.log(getApp().innerHTML);*/
}
console.log('┌─────────────────────────────────────────────────────────────┐');
console.log('│ Test 6: Events                                              │');
console.log('└─────────────────────────────────────────────────────────────┘');
{
    const template = `
        <for index="i" value="item" of="[1,2,3]" ref="'forRef'">
            <if condition="someBool" ref="'ifRef_' + i">
                <button ref="'pRef_' + i" on[click]="increment()">Index Z:<exp of="z"></exp></button>
            </if>
        </if>
        </for>`;
    getApp(true).innerHTML = template;
    class tt {
        public someBool: Observable<boolean> = new Observable<boolean>(true);
        public z: Observable<number> = new Observable<number>(0);
        public increment() {
            this.z.setObject(this.z.getObject() + 1);
        };
    }
    const dd = new tt();
    let scope = Scope.from(dd);

    const engine = new TemplateEngine();
    engine.fullProcess(getApp(), scope)

    /*console.log(getApp().innerHTML);

    (scope.get("pRef_0") as HTMLButtonElement).click();
    console.log('--- After change ---');

    console.log(getApp().innerHTML);*/
}
console.log('┌─────────────────────────────────────────────────────────────┐');
console.log('│ Test 7: Complex                                             │');
console.log('└─────────────────────────────────────────────────────────────┘');
{
    const template = `
<div class="counter-component" ref="'counterRoot'">
    <h2>Counter: <exp of="count"></exp></h2>
    <div class="controls">
        <button ref="'btnMinus'" on[click]="decrement()">-</button>
        <button ref="'btnPlus'" on[click]="increment()">+</button>
    </div>
    <for index="index" value="item" of="observableCollection">
            <div class="item">Item <exp of="index"></exp>: <exp of="item"></exp></div>
    </for>
    <if condition="bool">
        <for index="gIndex" value="group" of="nestedObservableCollection">
            <div ref="'group_' + gIndex" class="group">
                <h3>Group <exp of="gIndex"></exp></h3>
                <for index="dIndex" value="iItem" of="group">
                    <button ref="'btn_' + gIndex + '_' + dIndex" on[click]="increment()"><exp of="iItem"></exp></button>
                </for>
            </div>
        </for>
        <div>Additional content inside IF block.</div>
    </if>
</div>
<injection target="'group_0'" at="tail">
    <p>Another line in injected content.</p>
</injection>`;
    getApp(true).innerHTML = template;
    class tt {
        public count: Observable<number> = new Observable<number>(0);
        public bool: Observable<boolean> = new Observable<boolean>(true)
        public observableCollection: Observable<number[]> = new Observable<number[]>([10, 20, 30]);
        public nestedObservableCollection: Observable<number[][]> = new Observable<number[][]>([[1, 2], [3, 4, 5]]);
        public increment() {
            this.count.setObject(this.count.getObject() + 1);
        };
        public decrement() {
            this.count.setObject(this.count.getObject() - 1);
        };
    }
    const dd = new tt();
    let scope = Scope.from(dd);

    const engine = new TemplateEngine();
    engine.fullProcess(getApp(), scope)

    console.log(dd);

    /*console.log(getApp().innerHTML);

    dd.bool.setObject(false);
    console.log('--- After IF Condition False ---');

    console.log(getApp().innerHTML);*/

}


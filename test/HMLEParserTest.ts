import HMLEParser from "../src/foundation/HMLEParser.js";

const html = `
<div class="container">
    <h1>@(title)</h1>
    <p>Welcome, @(user.name)!</p>
    
    <ul>
        @for (item in items) {
            <li class="item-@(item.id)">@(item.name) - @(item.price)</li>
        }
    </ul>
    
    <re-button color="@(buttonColor)">@(buttonText)</re-button>
    
    <p>Method call: @(getFullTitle())</p>
</div>
`;

// Stage 2 example with event bindings
const htmlWithBindings = `
<div class="app">
    <h2>Counter: @(count)</h2>
    <re-button color="primary" @[onClick](increment())>+1</re-button>
    <re-button color="secondary" @[onClick](decrement())>-1</re-button>
    <input type="text" @[bind:value](inputText) placeholder="Type here..." />
    <p @[if](showMessage)>Message is visible!</p>
    <span @[class:active](isActive) @[style:color](textColor)>Styled text</span>
    <div @[ref](myDiv)>Referenced element</div>
</div>
`;

class TestScope {
    title = "HMLEParser Test";
    user = { name: "John" };
    items = [
        { id: 1, name: "Apple", price: "$1.00" },
        { id: 2, name: "Banana", price: "$0.50" },
        { id: 3, name: "Orange", price: "$0.75" }
    ];
    buttonColor = "primary";
    buttonText = "Click Me";
    
    // Stage 2 properties
    count = 0;
    inputText = "Hello";
    showMessage = true;
    isActive = true;
    textColor = "blue";
    myDiv: Element | null = null;

    getFullTitle(): string {
        return `${this.title} - Complete`;
    }
    
    increment(): void {
        this.count++;
        console.log("Count:", this.count);
    }
    
    decrement(): void {
        this.count--;
        console.log("Count:", this.count);
    }
}


const parser = new HMLEParser();
const scope = new TestScope();

console.log("=== Stage 1: String Processing ===");
console.log(parser.parse(html, scope));

// Numeric iteration example: indexes 0..4
const htmlNumeric = `
<ul>
    @for (i in 5) {
        <li>Index @(i)</li>
    }
</ul>
`;
console.log('\n=== Numeric @for (i in 5) ===');
console.log(parser.parse(htmlNumeric, scope));

// Two-variable iteration example: index and value
const htmlIndexValue = `
<ul>
    @for (idx, it in items) {
        <li>@(idx): @(it.name)</li>
    }
</ul>
`;
console.log('\n=== @for (idx, it in items) ===');
console.log(parser.parse(htmlIndexValue, scope));

// Variable persistence example: assignments inside @() should be visible later
const htmlVarPersist = `
<div>
        @(def val = "stri";
            def num = 42;
            def obj = { key: "value" };
            def arr = [1, 2, 3];
            const test = getFullTitle();
            return test;
        )
        @(return JSON.stringify({ val, num, obj, arr }))
        <p>String: @(val)</p>
        <p>Number: @(num)</p>
        <p>Object Key: @(obj.key)</p>
        @for (i in arr) {
            @(def item = i * 2;)
            @for (j in i) {
                <p>Inner Loop Index: @(j)</p>
            }
            <p>Array Item: @(i) @(item)</p>
        }
        <p>Method Call Result: @(test)</p>
</div>
`;
console.log('\n=== Variable persistence from @() ===');
console.log(parser.parse(htmlVarPersist, scope));

console.log("\n=== Stage 2: DOM Processing (attributes before processing) ===");
console.log(parser.parse(htmlWithBindings, scope));

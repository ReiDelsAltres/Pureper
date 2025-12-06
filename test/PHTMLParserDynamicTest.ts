import PHTMLParser from "../src/foundation/PHTMLParser";

const tt = `<paper-component simple="true" class="page testing-actual-page">
    @(getTest())
</paper-component>`;
class TestClass {
    public getTest(): string {
        return "TEST SUCCESS";
    }
}

const pp = new PHTMLParser().parse(tt, new TestClass());
console.log(pp);

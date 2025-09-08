export default class Page {
    constructor(filePath) {
        this.filePath = filePath;
    }

    get path() {
        return this.filePath;
    }

    async preLoadJS(element) {
    }
    async postLoadJS(element) {
    }

    async render(element) {
        const response = await fetch(this.filePath);
        const html = await response.text();
        element.innerHTML = html;
    }
}
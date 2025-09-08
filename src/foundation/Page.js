export default class Page {
    constructor(filePath) {
        this.filePath = filePath.startsWith('./') ? filePath : 
            window.RouterConfig.BASE_PATH; + filePath;
    }

    get path() {
        return this.filePath;
    }

    async preLoadJS(element) {
    }
    async postLoadJS(element) {
    }

    async render(element) {
        try {
            const response = await fetch(this.filePath);
            if (!response.ok) {
                throw new Error(`Failed to load ${this.filePath}: ${response.status}`);
            }
            const html = await response.text();
            element.innerHTML = html;
        } catch (error) {
            console.error('Error loading page:', error);
            element.innerHTML = '<h1>Error loading page</h1>';
        }
    }
}
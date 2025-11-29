import Fetcher from "./Fetcher.js";
export let ACTIVE_THEME_KEY = "Empty";
export async function loadTheme(name) {
    return Fetcher.fetchText(`../../../resources/${name}.theme.css`);
}
export async function loadThemeAsInstant(name) {
    let theme = await loadTheme(name);
    const sheet = new CSSStyleSheet();
    sheet.replaceSync(theme);
    return sheet;
}
export async function init() {
    ACTIVE_THEME_KEY = localStorage.getItem("theme");
    if (ACTIVE_THEME_KEY) {
        await setTheme(ACTIVE_THEME_KEY);
    }
    else {
        await setTheme("Blazor");
    }
}
export async function setTheme(name) {
    let theme = await loadTheme(name);
    theme = theme.replace(/\.[\w-]+-theme/g, ":root");
    const sheet = new CSSStyleSheet();
    sheet.replaceSync(theme);
    document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];
}
//# sourceMappingURL=Theme.js.map
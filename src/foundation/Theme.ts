import Fetcher from "./Fetcher.js";

export let ACTIVE_THEME_KEY = "Empty";
let activeThemeSheet: CSSStyleSheet | null = null;

export async function loadTheme(name: string): Promise<string> {
    // Use hosting-root absolute path so GitHub Pages subfolder deployments (e.g. /Hellper/) keep the subfolder.
    return Fetcher.fetchText(`/resources/${name}.theme.css`);
}
export async function loadThemeAsInstant(name: string): Promise<CSSStyleSheet> {
    let theme: string = await loadTheme(name);
    const sheet = new CSSStyleSheet();
    sheet.replaceSync(theme);
    return sheet;
}
export async function init() {
    ACTIVE_THEME_KEY = localStorage.getItem("theme");
    if (ACTIVE_THEME_KEY) {
        await setTheme(ACTIVE_THEME_KEY);
    } else {
        await setTheme("Blazor");
    }
}
export async function setTheme(name: string) {
    let theme: string = await loadTheme(name);
    theme = theme.replace(/\.[\w-]+-theme/g, ":root");
    const sheet = new CSSStyleSheet();
    sheet.replaceSync(theme);
    if (activeThemeSheet) {
        const index = document.adoptedStyleSheets.indexOf(activeThemeSheet);
        if (index !== -1) {
            const sheets = [...document.adoptedStyleSheets];
            sheets[index] = sheet;
            document.adoptedStyleSheets = sheets;
        } else {
            document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];
        }
    } else {
        document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];
    }
    activeThemeSheet = sheet;
}


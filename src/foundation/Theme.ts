import Fetcher from "./Fetcher.js";

export type IconName = 'home' | 'user' | 'settings' | 'copy' | 'menu' | 'close' | 'arrow-left' | 
                'arrow-right' | 'search' | 'heart' | 'star' | 'palette' | string;

export type SizeClass = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export type ThemeColor = 'primary' | 'secondary' | 'tertiary' | 'additional' | 
    'success' | 'warning' | 'error' | 'info' | 'text';

export let ACTIVE_THEME_KEY = "Empty";

export async function loadTheme(name: string) : Promise<string> {
    // Use hosting-root absolute path so GitHub Pages subfolder deployments (e.g. /Hellper/) keep the subfolder.
    return Fetcher.fetchText(`/resources/${name}.theme.css`);
}
export async function loadThemeAsInstant(name: string) : Promise<CSSStyleSheet> {
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
    document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];
}


import Fetcher from "./Fetcher.js";

export type ComponentSize = 'extra-small' | 'small' | 'medium' | 'large' | 'extra-large';
export type ComponentSizeAlias = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export type ConponentColor = 'empty' | 'primary' | 'secondary' | 'tertiary' | 'additional' | 'success' | 'warning' | 'error' | 'info' | 'text';
export type ComponentColorAlias = 'emp' | 'pry' | 'sec' | 'ter' | 'add' | 'suc' | 'war' | 'err' | 'inf' | 'txt';

export type ComponentVariant = 'filled' | 'outlined' | 'text';
export type ComponentVariantAlias = 'fil' | 'out' | 'txt';

export interface CssVariableBase {
    name: string;
    aliases: string[];
}
export const THEME_SIZES: CssVariableBase[] = [
    { name: 'extra-small', aliases: ['xs'] },
    { name: 'small', aliases: ['sm'] },
    { name: 'medium', aliases: ['md'] },
    { name: 'large', aliases: ['lg'] },
    { name: 'extra-large', aliases: ['xl'] },
];
export const THEME_COLORS: CssVariableBase[] = [
    { name: 'empty', aliases: ['emp'] },
    { name: 'primary', aliases: ['pry'] },
    { name: 'secondary', aliases: ['sec'] },
    { name: 'tertiary', aliases: ['ter'] },
    { name: 'additional', aliases: ['add'] },
    { name: 'success', aliases: ['suc'] },
    { name: 'warning', aliases: ['war'] },
    { name: 'error', aliases: ['err'] },
    { name: 'info', aliases: ['inf'] },
    { name: 'text', aliases: ['txt'] },
];
export const THEME_VARIANTS: CssVariableBase[] = [
    { name: 'filled', aliases: ['fil'] },
    { name: 'outlined', aliases: ['out'] },
    { name: 'text', aliases: ['txt'] },
];



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


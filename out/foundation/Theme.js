import Fetcher from "./Fetcher.js";
import Observable from "./api/Observer.js";
export let ACTIVE_THEME_KEY = "Empty";
let activeThemeSheet = null;
let _internalThemeSwitch = false;
export async function loadTheme(name) {
    // Use hosting-root absolute path so GitHub Pages subfolder deployments (e.g. /Hellper/) keep the subfolder.
    return Fetcher.fetchText(`/resources/${name}.theme.css`);
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
    // Deactivate AppTheme when switching to a plain palette (but not when called from activateAppTheme)
    if (!_internalThemeSwitch && activeAppTheme.getObject()) {
        const current = activeAppTheme.getObject();
        current.onDeactivate?.();
        activeAppTheme.setObject(null);
        localStorage.removeItem('appTheme');
    }
    let theme = await loadTheme(name);
    theme = theme.replace(/\.[\w-]+-theme/g, ":root");
    const sheet = new CSSStyleSheet();
    sheet.replaceSync(theme);
    if (activeThemeSheet) {
        const index = document.adoptedStyleSheets.indexOf(activeThemeSheet);
        if (index !== -1) {
            const sheets = [...document.adoptedStyleSheets];
            sheets[index] = sheet;
            document.adoptedStyleSheets = sheets;
        }
        else {
            document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];
        }
    }
    else {
        document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];
    }
    activeThemeSheet = sheet;
}
/** Currently active AppTheme, or null if only a color palette is active */
export const activeAppTheme = new Observable(null);
/** Registry of all registered AppThemes */
const appThemeRegistry = new Map();
/** Register an AppTheme so it can be activated by name */
export function registerAppTheme(config) {
    appThemeRegistry.set(config.name, config);
}
/** Get a registered AppTheme by name */
export function getAppTheme(name) {
    return appThemeRegistry.get(name);
}
/** Get all registered AppTheme names */
export function getAppThemeNames() {
    return Array.from(appThemeRegistry.keys());
}
/**
 * Activate an AppTheme by name.
 * - Applies its color palette
 * - Switches component implementations listed in the config
 * - Calls onActivate callback
 */
export async function activateAppTheme(name) {
    const config = appThemeRegistry.get(name);
    if (!config)
        throw new Error(`[Theme]: AppTheme "${name}" not registered`);
    // Deactivate current AppTheme if any
    await deactivateAppTheme();
    // Apply palette (guarded to avoid deactivation inside setTheme)
    _internalThemeSwitch = true;
    await setTheme(config.palette);
    _internalThemeSwitch = false;
    ACTIVE_THEME_KEY = config.palette;
    // Switch implementations
    if (config.implementations) {
        // Dynamic import to avoid circular dependency
        const { Placeholder } = await import('./Injection.js');
        for (const [placeholder, impl] of config.implementations) {
            try {
                await Placeholder.switchTo(placeholder, impl);
            }
            catch (e) {
                console.warn(`[Theme]: Failed to switch "${placeholder}" to "${impl}":`, e);
            }
        }
    }
    // Set active
    activeAppTheme.setObject(config);
    localStorage.setItem('appTheme', name);
    // Call activate callback
    config.onActivate?.();
    console.info(`[Theme]: AppTheme "${name}" activated`);
}
/**
 * Deactivate the currently active AppTheme.
 * - Calls onDeactivate callback
 * - Reverts implementations to defaults
 * - Does NOT change the color palette (that's separate)
 */
export async function deactivateAppTheme() {
    const current = activeAppTheme.getObject();
    if (!current)
        return;
    // Call deactivate callback
    current.onDeactivate?.();
    // Revert implementations to defaults
    if (current.implementations) {
        const { Placeholder } = await import('./Injection.js');
        for (const [placeholder] of current.implementations) {
            try {
                const p = Placeholder.get(placeholder);
                const firstImpl = p.implementations.entries().next().value;
                if (firstImpl) {
                    await Placeholder.switchTo(placeholder, firstImpl[0]);
                }
            }
            catch (e) {
                console.warn(`[Theme]: Failed to revert "${placeholder}":`, e);
            }
        }
    }
    activeAppTheme.setObject(null);
    localStorage.removeItem('appTheme');
    console.info(`[Theme]: AppTheme "${current.name}" deactivated`);
}
//# sourceMappingURL=Theme.js.map
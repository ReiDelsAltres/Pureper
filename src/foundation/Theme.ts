import Fetcher from "./Fetcher.js";
import Observable from "./api/Observer.js";

export const DEFAULT_THEME = "Blazor";
export let ACTIVE_THEME_KEY = "Empty";
let activeThemeSheet: CSSStyleSheet | null = null;
let _internalThemeSwitch = false;

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
        await setTheme(DEFAULT_THEME);
    }
}
export async function setTheme(name: string) {
    // Deactivate AppTheme when switching to a plain palette (but not when called from activateAppTheme)
    if (!_internalThemeSwitch && activeAppTheme.getObject()) {
        const current = activeAppTheme.getObject()!;
        current.onDeactivate?.();
        activeAppTheme.setObject(null);
        localStorage.removeItem('appTheme');
    }

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

// ── AppTheme system ─────────────────────────────────────────────

/**
 * AppTheme descriptor — combines a color palette with optional
 * component implementation switches and lifecycle callbacks.
 */
export interface AppThemeConfig {
    /** Name of the theme */
    name: string;
    /** Color palette CSS file name (without .theme.css extension), e.g. "Winter" */
    palette: string;
    /** Map of placeholder name → implementation name to switch when theme activates */
    implementations?: Map<string, string>;
    /** Called when theme is activated — use for effects (e.g., snow animation) */
    onActivate?: () => void;
    /** Called when theme is deactivated — use to clean up effects */
    onDeactivate?: () => void;
}

/** Currently active AppTheme, or null if only a color palette is active */
export const activeAppTheme: Observable<AppThemeConfig | null> = new Observable<AppThemeConfig | null>(null);

/** Registry of all registered AppThemes */
const appThemeRegistry: Map<string, AppThemeConfig> = new Map();

/** Register an AppTheme so it can be activated by name */
export function registerAppTheme(config: AppThemeConfig): void {
    appThemeRegistry.set(config.name, config);
}

/** Get a registered AppTheme by name */
export function getAppTheme(name: string): AppThemeConfig | undefined {
    return appThemeRegistry.get(name);
}

/** Get all registered AppTheme names */
export function getAppThemeNames(): string[] {
    return Array.from(appThemeRegistry.keys());
}

/**
 * Activate an AppTheme by name.
 * - Applies its color palette
 * - Switches component implementations listed in the config
 * - Calls onActivate callback
 */
export async function activateAppTheme(name: string): Promise<void> {
    const config = appThemeRegistry.get(name);
    if (!config) throw new Error(`[Theme]: AppTheme "${name}" not registered`);

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
            } catch (e) {
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
export async function deactivateAppTheme(): Promise<void> {
    const current = activeAppTheme.getObject();
    if (!current) return;

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
            } catch (e) {
                console.warn(`[Theme]: Failed to revert "${placeholder}":`, e);
            }
        }
    }

    activeAppTheme.setObject(null);
    localStorage.removeItem('appTheme');

    console.info(`[Theme]: AppTheme "${current.name}" deactivated`);
}

export async function resetToDefault(): Promise<void> {
    await deactivateAppTheme();
    await setTheme(DEFAULT_THEME);
    ACTIVE_THEME_KEY = DEFAULT_THEME;
    localStorage.setItem("theme", DEFAULT_THEME);
    console.info(`[Theme]: Reset to default theme "${DEFAULT_THEME}"`);
}


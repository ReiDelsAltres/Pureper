import Observable from "./api/Observer.js";
export declare let ACTIVE_THEME_KEY: string;
export declare function loadTheme(name: string): Promise<string>;
export declare function loadThemeAsInstant(name: string): Promise<CSSStyleSheet>;
export declare function init(): Promise<void>;
export declare function setTheme(name: string): Promise<void>;
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
export declare const activeAppTheme: Observable<AppThemeConfig | null>;
/** Register an AppTheme so it can be activated by name */
export declare function registerAppTheme(config: AppThemeConfig): void;
/** Get a registered AppTheme by name */
export declare function getAppTheme(name: string): AppThemeConfig | undefined;
/** Get all registered AppTheme names */
export declare function getAppThemeNames(): string[];
/**
 * Activate an AppTheme by name.
 * - Applies its color palette
 * - Switches component implementations listed in the config
 * - Calls onActivate callback
 */
export declare function activateAppTheme(name: string): Promise<void>;
/**
 * Deactivate the currently active AppTheme.
 * - Calls onDeactivate callback
 * - Reverts implementations to defaults
 * - Does NOT change the color palette (that's separate)
 */
export declare function deactivateAppTheme(): Promise<void>;
//# sourceMappingURL=Theme.d.ts.map
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
export declare const THEME_SIZES: CssVariableBase[];
export declare const THEME_COLORS: CssVariableBase[];
export declare const THEME_VARIANTS: CssVariableBase[];
export declare let ACTIVE_THEME_KEY: string;
export declare function loadTheme(name: string): Promise<string>;
export declare function loadThemeAsInstant(name: string): Promise<CSSStyleSheet>;
export declare function init(): Promise<void>;
export declare function setTheme(name: string): Promise<void>;
//# sourceMappingURL=Theme.d.ts.map
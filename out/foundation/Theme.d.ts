export type IconName = 'home' | 'user' | 'settings' | 'copy' | 'menu' | 'close' | 'arrow-left' | 'arrow-right' | 'search' | 'heart' | 'star' | 'palette' | string;
export type SizeClass = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
export type ThemeColor = 'primary' | 'secondary' | 'tertiary' | 'additional' | 'success' | 'warning' | 'error' | 'info' | 'text';
export declare let ACTIVE_THEME_KEY: string;
export declare function loadTheme(name: string): Promise<string>;
export declare function loadThemeAsInstant(name: string): Promise<CSSStyleSheet>;
export declare function init(): Promise<void>;
export declare function setTheme(name: string): Promise<void>;
//# sourceMappingURL=Theme.d.ts.map
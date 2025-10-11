// ColorPalettes.js
// Static color palettes for use in the application
import SuperColorPalette from "./SuperColorPalette.js";

export const ColorPalettes = {
    BASIC: new SuperColorPalette({
        primary: '#264653',
        primaryDistinctive: '#5a47ff',
        primaryLight: '#3e6b5c',
        primaryBlack: '#1d3a42',
        textPrimary: '#1d3a42',
        textPrimaryContrast: '#ffffff',

        secondary: '#2a9d8f',
        secondaryDistinctive: '#cc1854',
        secondaryLight: '#4db3a6',
        secondaryBlack: '#1f7a6b',
        textSecondary: '#264653',
        textSecondaryContrast: '#ffffff',

        tertiary: '#f4a261',
        tertiaryDistinctive: '#19a98c',
        tertiaryLight: '#f7b584',
        tertiaryBlack: '#d1843e',
        textTertiary: '#999999',
        textTertiaryContrast: '#1d3a42',

        additional: '#e9c46a',
        additionalDistinctive: '#264f78',
        additionalLight: '#f0d084',
        additionalBlack: '#c7a854',
        textAdditional: '#757575',
        textAdditionalContrast: '#1d3a42',

        info: '#f4a261',
        textInfoContrast: '#1d3a42',
        success: '#2a9d8f',
        textSuccessContrast: '#ffffff',
        warning: '#e76f51',
        textWarningContrast: '#ffffff',
        error: '#e63946',
        textErrorContrast: '#ffffff',

        text: '#c1c1c4',
        textDisabled: '#cccccc',

        surface: '#32333d',
        surfaceLight: '#ffffff',
        surfaceDark: '#1d3a42',
    }),

    MUD_BLAZOR: new SuperColorPalette({
        primary: '#594ae2',
        primaryDistinctive: '#5a47ff',
        primaryLight: '#7b6ff1',
        primaryBlack: '#3a2e7b',
        textPrimary: '#594ae2',
        textPrimaryContrast: '#fff',

        secondary: '#ff4081',
        secondaryDistinctive: '#cc1854',
        secondaryLight: '#ff79b0',
        secondaryBlack: '#c60055',
        textSecondary: '#ff4081',
        textSecondaryContrast: '#fff',

        tertiary: '#ffc107',
        tertiaryDistinctive: '#19a98c',
        tertiaryLight: '#fff350',
        tertiaryBlack: '#c79100',
        textTertiary: '#ffc107',
        textTertiaryContrast: '#fff',

        additional: '#00bcd4',
        additionalDistinctive: '#264f78',
        additionalLight: '#62efff',
        additionalBlack: '#008ba3',
        textAdditional: '#00bcd4',
        textAdditionalContrast: '#fff',

        info: '#2196f3',
        textInfoContrast: '#fff',
        success: '#4caf50',
        textSuccessContrast: '#fff',
        warning: '#ff9800',
        textWarningContrast: '#fff',
        error: '#f44336',
        textErrorContrast: '#fff',

        text: '#c1c1c4',
        textDisabled: '#9e9e9e',

        surface: '#32333d',
        surfaceLight: '#fff',
        surfaceDark: '#27272f',
    })
};

// ActualPalette always points to the currently active palette
export let ActualPalette = ColorPalettes.MUD_BLAZOR;


export function setActualPalette(paletteName) {
    localStorage.setItem("palette", paletteName);
    if (ColorPalettes[paletteName]) {
        ActualPalette = ColorPalettes[paletteName];
        setThemeCssVariables(ActualPalette);
    }
}
export function initThemeCssVariables() {
    const paletteName = localStorage.getItem("palette");
    if (paletteName && ColorPalettes[paletteName]) {
        setThemeCssVariables(ColorPalettes[paletteName]);
    } else {
        setThemeCssVariables(ActualPalette);
    }
}
// Update CSS variables in .theme according to the palette
export function setThemeCssVariables(palette) {
    const root = document.querySelector('.theme');
    if (!palette) return;
    // Remove previous dynamic theme sheet if exists
    if (window.dynamicThemeSheet && document.adoptedStyleSheets) {
        document.adoptedStyleSheets = document.adoptedStyleSheets.filter(s => s !== window.dynamicThemeSheet);
    }
    // Create new CSSStyleSheet
    const sheet = new CSSStyleSheet();
    sheet.replaceSync(`:root {
            ${palette.toCSSVariables()}
        }`);
    if (document.adoptedStyleSheets) {
        document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];
        window.dynamicThemeSheet = sheet;
    } /*else {
            // Fallback for browsers without adoptedStyleSheets
            const prev = document.getElementById('dynamic-theme-vars');
            if (prev) prev.remove();
            const style = document.createElement('style');
            style.id = 'dynamic-theme-vars';
            style.textContent = sheet.cssRules[0].cssText;
            document.head.appendChild(style);
        }*/
}

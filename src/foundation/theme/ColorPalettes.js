// ColorPalettes.js
// Static color palettes for use in the application
import SimpleColorPalette from "./SimpleColorPalette.js";

export const ColorPalettes = {
    BASIC: new SimpleColorPalette('#264653', '#2a9d8f', '#e9c46a', '#f4a261', '#e76f51', '#e63946'),
    PASTEL: new SimpleColorPalette('#a3c9a8', '#f7d9c4', '#f6eac2', '#b5ead7', '#ffb7b2', '#c7ceea'),
    MATERIAL: new SimpleColorPalette('#1976d2', '#388e3c', '#fbc02d', '#0288d1', '#f57c00', '#d32f2f'),
    DARK: new SimpleColorPalette('#22223b', '#4a4e69', '#9a8c98', '#c9ada7', '#f2e9e4', '#22223b'),
    LIGHT: new SimpleColorPalette('#f1faee', '#a8dadc', '#457b9d', '#1d3557', '#ffb4a2', '#e63946'),
    DARK_VIOLET: new SimpleColorPalette('#231942', '#5e548e', '#9f86c0', '#be95c4', '#e0b1cb', '#ffb4a2')
};

// ActualPalette always points to the currently active palette
export let ActualPalette = ColorPalettes.BASIC;


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
            --color-primary: ${palette.primary};
            --color-secondary: ${palette.secondary};
            --color-additional: ${palette.additional};
            --color-info: ${palette.info};
            --color-warning: ${palette.warning};
            --color-error: ${palette.error};
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

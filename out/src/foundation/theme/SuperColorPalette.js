import IColorPalette from './IColorPalette.js';
/**
 * SuperColorPalette extends IColorPalette with comprehensive color management.
 * Based on all CSS variables from Theme.css
 */
export default class SuperColorPalette extends IColorPalette {
    /**
     * @param {Object} colors - Complete color configuration object
     */
    constructor(colors = {}) {
        super();
        this._colors = {
            // Primary
            primary: colors.primary || '#FF0000',
            primaryDistinctive: colors.primaryDistinctive || '#FF0000',
            primaryLight: colors.primaryLight || '#FF6666',
            primaryBlack: colors.primaryBlack || '#AA0000',
            textPrimary: colors.textPrimary || '#FFFFFF',
            textPrimaryContrast: colors.textPrimaryContrast || '#FFFFFF',
            // Secondary
            secondary: colors.secondary || '#00FF00',
            secondaryDistinctive: colors.secondaryDistinctive || '#00FF00',
            secondaryLight: colors.secondaryLight || '#66FF66',
            secondaryBlack: colors.secondaryBlack || '#00AA00',
            textSecondary: colors.textSecondary || '#CCCCCC',
            textSecondaryContrast: colors.textSecondaryContrast || '#000000',
            // Tertiary
            tertiary: colors.tertiary || '#FFFF00',
            tertiaryDistinctive: colors.tertiaryDistinctive || '#FFFF00',
            tertiaryLight: colors.tertiaryLight || '#FFFF66',
            tertiaryBlack: colors.tertiaryBlack || '#AAAA00',
            textTertiary: colors.textTertiary || '#AAAAAA',
            textTertiaryContrast: colors.textTertiaryContrast || '#000000',
            // Additional
            additional: colors.additional || '#0000FF',
            additionalDistinctive: colors.additionalDistinctive || '#0000FF',
            additionalLight: colors.additionalLight || '#6666FF',
            additionalBlack: colors.additionalBlack || '#0000AA',
            textAdditional: colors.textAdditional || '#888888',
            textAdditionalContrast: colors.textAdditionalContrast || '#FFFFFF',
            // Utility
            info: colors.info || '#FFFF00',
            textInfoContrast: colors.textInfoContrast || '#000000',
            success: colors.success || '#00FF00',
            textSuccessContrast: colors.textSuccessContrast || '#000000',
            warning: colors.warning || '#FF00FF',
            textWarningContrast: colors.textWarningContrast || '#FFFFFF',
            error: colors.error || '#00FFFF',
            textErrorContrast: colors.textErrorContrast || '#000000',
            text: colors.text || '#FFFFFF',
            textDisabled: colors.textDisabled || '#555555',
            // Surfaces
            surface: colors.surface || '#32333d',
            surfaceLight: colors.surfaceLight || '#FFFFFF',
            surfaceDark: colors.surfaceDark || '#1E1E1E',
        };
    }
    /**
     * Get a color by its name.
     * @param {string} key - The name of the color.
     * @returns {string} The color value (hex code).
     */
    getColor(key) {
        return this._colors[key] || null;
    }
    /**
     * Get all colors in the palette.
     * @returns {Object} Object with all color values.
     */
    getAllColors() {
        return { ...this._colors };
    }
    /**
     * Add or update a color in the palette.
     * @param {string} key - The name of the color.
     * @param {string} color - The color value to add/update.
     */
    addColor(key, color) {
        this._colors[key] = color;
    }
    /**
     * Get colors object compatible with SimpleColorPalette for backwards compatibility.
     * @returns {Object} Basic colors object.
     */
    getSimpleColors() {
        return {
            primary: this._colors.primary,
            secondary: this._colors.secondary,
            additional: this._colors.additional,
            info: this._colors.info,
            warning: this._colors.warning,
            error: this._colors.error
        };
    }
    /**
     * Generate CSS variables string for this palette.
     * @returns {string} CSS variables as string.
     */
    toCSSVariables() {
        return `
            /* Primary */
            --color-primary: ${this._colors.primary};
            --color-primary-distinctive: ${this._colors.primaryDistinctive};
            --color-primary-light: ${this._colors.primaryLight};
            --color-primary-black: ${this._colors.primaryBlack};
            --color-text-primary: ${this._colors.textPrimary};
            --color-text-primary-contrast: ${this._colors.textPrimaryContrast};

            /* Secondary */
            --color-secondary: ${this._colors.secondary};
            --color-secondary-distinctive: ${this._colors.secondaryDistinctive};
            --color-secondary-light: ${this._colors.secondaryLight};
            --color-secondary-black: ${this._colors.secondaryBlack};
            --color-text-secondary: ${this._colors.textSecondary};
            --color-text-secondary-contrast: ${this._colors.textSecondaryContrast};

            /* Tertiary */
            --color-tertiary: ${this._colors.tertiary};
            --color-tertiary-distinctive: ${this._colors.tertiaryDistinctive};
            --color-tertiary-light: ${this._colors.tertiaryLight};
            --color-tertiary-black: ${this._colors.tertiaryBlack};
            --color-text-tertiary: ${this._colors.textTertiary};
            --color-text-tertiary-contrast: ${this._colors.textTertiaryContrast};

            /* Additional Colors */
            --color-additional: ${this._colors.additional};
            --color-additional-distinctive: ${this._colors.additionalDistinctive};
            --color-additional-light: ${this._colors.additionalLight};
            --color-additional-black: ${this._colors.additionalBlack};
            --color-text-additional: ${this._colors.textAdditional};
            --color-text-additional-contrast: ${this._colors.textAdditionalContrast};

            /* Utility Colors */
            --color-info: ${this._colors.info};
            --color-text-info-contrast: ${this._colors.textInfoContrast};
            --color-success: ${this._colors.success};
            --color-text-success-contrast: ${this._colors.textSuccessContrast};
            --color-warning: ${this._colors.warning};
            --color-text-warning-contrast: ${this._colors.textWarningContrast};
            --color-error: ${this._colors.error};
            --color-text-error-contrast: ${this._colors.textErrorContrast};

            --color-text: ${this._colors.text};
            --color-text-disabled: ${this._colors.textDisabled};

            /*Surface color*/
            --surface: ${this._colors.surface};
            --surface-light: ${this._colors.surfaceLight};
            --surface-dark: ${this._colors.surfaceDark};
        `.replace(/\n\s+/g, '\n').trim();
    }
    // Getters for all color properties from Theme.css
    get primary() { return this._colors.primary; }
    get primaryLight() { return this._colors.primaryLight; }
    get primaryBlack() { return this._colors.primaryBlack; }
    get textPrimary() { return this._colors.textPrimary; }
    get textPrimaryContrast() { return this._colors.textPrimaryContrast; }
    get secondary() { return this._colors.secondary; }
    get secondaryLight() { return this._colors.secondaryLight; }
    get secondaryBlack() { return this._colors.secondaryBlack; }
    get textSecondary() { return this._colors.textSecondary; }
    get textSecondaryContrast() { return this._colors.textSecondaryContrast; }
    get tertiary() { return this._colors.tertiary; }
    get tertiaryLight() { return this._colors.tertiaryLight; }
    get tertiaryBlack() { return this._colors.tertiaryBlack; }
    get textTertiary() { return this._colors.textTertiary; }
    get textTertiaryContrast() { return this._colors.textTertiaryContrast; }
    get additional() { return this._colors.additional; }
    get additionalLight() { return this._colors.additionalLight; }
    get additionalBlack() { return this._colors.additionalBlack; }
    get textAdditional() { return this._colors.textAdditional; }
    get textAdditionalContrast() { return this._colors.textAdditionalContrast; }
    get info() { return this._colors.info; }
    get textInfoContrast() { return this._colors.textInfoContrast; }
    get success() { return this._colors.success; }
    get textSuccessContrast() { return this._colors.textSuccessContrast; }
    get warning() { return this._colors.warning; }
    get textWarningContrast() { return this._colors.textWarningContrast; }
    get error() { return this._colors.error; }
    get textErrorContrast() { return this._colors.textErrorContrast; }
    get text() { return this._colors.text; }
    get textDisabled() { return this._colors.textDisabled; }
    get surface() { return this._colors.surface; }
    get surfaceLight() { return this._colors.surfaceLight; }
    get surfaceDark() { return this._colors.surfaceDark; }
}
//# sourceMappingURL=SuperColorPalette.js.map
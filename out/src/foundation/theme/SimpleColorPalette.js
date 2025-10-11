import IColorPalette from './IColorPalette.js';
/**
 * SimpleColorPalette implements IColorPalette.
 */
export default class SimpleColorPalette extends IColorPalette {
    /**
     * @param {string} primary
     * @param {string} secondary
     * @param {string} additional
     * @param {string} info
     * @param {string} warning
     * @param {string} error
     */
    constructor(primary, secondary, additional, info, warning, error) {
        super();
        this._colors = {
            primary,
            secondary,
            additional,
            info,
            warning,
            error,
        };
    }
    /**
     * Get a color by its name or index.
     * @param {string|number} key - The name or index of the color.
     * @returns {string} The color value (e.g., hex code).
     */
    getColor(key) {
        if (typeof key === 'number') {
            const values = Object.values(this._colors);
            return values[key] || null;
        }
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
     * Add a new color to the palette.
     * @param {string} key - The name of the color.
     * @param {string} color - The color value to add.
     */
    addColor(key, color) {
        this._colors[key] = color;
    }
    /**
     * Generate CSS variables string for this palette using only Theme.css tokens it can supply.
     * @returns {string} CSS variables as string.
     */
    toCSSVariables() {
        return [
            `--color-primary: ${this._colors.primary};`,
            `--color-secondary: ${this._colors.secondary};`,
            `--color-additional: ${this._colors.additional};`,
            `--color-info: ${this._colors.info};`,
            `--color-warning: ${this._colors.warning};`,
            `--color-error: ${this._colors.error};`
        ].join('\n');
    }
    get primary() { return this._colors.primary; }
    get secondary() { return this._colors.secondary; }
    get additional() { return this._colors.additional; }
    get info() { return this._colors.info; }
    get warning() { return this._colors.warning; }
    get error() { return this._colors.error; }
}
//# sourceMappingURL=SimpleColorPalette.js.map
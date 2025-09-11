/**
 * Interface for a color palette.
 * Defines the structure for managing a set of colors.
 */
export default class IColorPalette {
    /**
     * Get a color by its name or index.
     * @param {string|number} key - The name or index of the color.
     * @returns {string} The color value (e.g., hex code).
     */
    getColor(key) {
        throw new Error('Method not implemented.');
    }

    /**
     * Get all colors in the palette.
     * @returns {string[]} Array of color values.
     */
    getAllColors() {
        throw new Error('Method not implemented.');
    }

    /**
     * Add a new color to the palette.
     * @param {string} color - The color value to add.
     */
    addColor(color) {
        throw new Error('Method not implemented.');
    }

    toCSSVariables() {
        throw new Error('Method not implemented.');
    }
}
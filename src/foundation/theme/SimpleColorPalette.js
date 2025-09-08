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
    constructor(primary, secondary, additional,
        info, warning, error
    ) {
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
    getColors() {
        // Return a copy of the color object
        return { ...this._colors };
    }

    get primary() { return this._colors.primary; }
    get secondary() { return this._colors.secondary; }
    get additional() { return this._colors.additional; }
    get info() { return this._colors.info; }
    get warning() { return this._colors.warning; }
    get error() { return this._colors.error; }
}

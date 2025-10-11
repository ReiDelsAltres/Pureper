import IElementHolder from "../foundation/api/ElementHolder.js";
import Component from "../foundation/component_api/Component.js";
import { ActualPalette, ColorPalettes } from "../foundation/theme/ColorPalettes.js";

export default class ColorPalettePreview extends Component {
    static get observedAttributes() {
        return ['palette'];
    }
    protected preLoad(holder: IElementHolder): Promise<void> {
        this._updateColors(holder);
        this.onAttributeChangedCallback((name, oldValue, newValue) => {
            if (name === 'palette' && oldValue !== newValue) {
                this._updateColors(holder);
            }
        });
        return Promise.resolve();
    }

    private _getPalette() {
        const paletteName = this.getAttribute('palette') as keyof typeof ColorPalettes;
        if (paletteName && ColorPalettes[paletteName]) {
            return ColorPalettes[paletteName];
        }
        return ActualPalette;
    }

    private _updateColors(holder: IElementHolder) {
        const palette = this._getPalette();
        const colorMap = {
            primary: palette.primary,
            secondary: palette.secondary,
            additional: palette.additional,
            info: palette.info,
            warning: palette.warning,
            error: palette.error
        };
        Object.entries(colorMap).forEach(([key, value]) => {
            const el = holder.element.querySelector(`.color[data-color="${key}"]`)!;
            if (el) {
                el.setAttribute('style', `background: ${value}; color: ${_getContrastYIQ(value)};`);
                const hexSpan = el.querySelector('.hex');
                if (hexSpan) hexSpan.textContent = value.toUpperCase();
            }
        });
    }
}
// Контрастный цвет текста (черный/белый) для фона
function _getContrastYIQ(hexcolor: string): string {
    let hex = hexcolor.replace('#', '');
    if (hex.length === 3) hex = hex.split('').map(x => x + x).join('');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
    return (yiq >= 128) ? '#222' : '#fff';
}
import { ActualPalette, ColorPalettes } from "../foundation/theme/ColorPalettes.js";
import { UniHtmlComponent } from "../foundation/component_api/UniHtml.js";
export default class ColorPalettePreview extends UniHtmlComponent {
    static get observedAttributes() {
        return ['palette'];
    }
    preLoadJS(holder) {
        this._updateColors(holder);
        this.onAttributeChangedCallback((name, oldValue, newValue) => {
            if (name === 'palette' && oldValue !== newValue) {
                this._updateColors(holder);
            }
        });
        return Promise.resolve();
    }
    _getPalette() {
        const paletteName = this.getAttribute('palette');
        if (paletteName && ColorPalettes[paletteName]) {
            return ColorPalettes[paletteName];
        }
        return ActualPalette;
    }
    _updateColors(holder) {
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
            const el = holder.element.querySelector(`.color[data-color="${key}"]`);
            if (el) {
                el.setAttribute('style', `background: ${value}; color: ${_getContrastYIQ(value)};`);
                const hexSpan = el.querySelector('.hex');
                if (hexSpan)
                    hexSpan.textContent = value.toUpperCase();
            }
        });
    }
}
// Контрастный цвет текста (черный/белый) для фона
function _getContrastYIQ(hexcolor) {
    let hex = hexcolor.replace('#', '');
    if (hex.length === 3)
        hex = hex.split('').map(x => x + x).join('');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
    return (yiq >= 128) ? '#222' : '#fff';
}
//# sourceMappingURL=ColorPalettePreview.html.js.map
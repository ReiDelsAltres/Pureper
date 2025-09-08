// Using globally registered Component (set in src/foundation/globals.js)
const Component = globalThis.Component;
import { ColorPalettes, ActualPalette } from '../src/foundation/theme/ColorPalettes.js';

class ColorPalette extends Component {
  static get observedAttributes() {
    return ['palette'];
  }

  constructor() {
    super('/components/ColorPalette.html');
  }

  init() {
    this._updateColors();
    this.onAttributeChanged((name, oldValue, newValue) => {
      if (name === 'palette' && oldValue !== newValue) {
        this._updateColors();
      }
    });
  }

  _getPalette() {
    const paletteName = this.getAttribute('palette');
    if (paletteName && ColorPalettes[paletteName]) {
      return ColorPalettes[paletteName];
    }
    return ActualPalette;
  }

  _updateColors() {
    const palette = this._getPalette();
    const colorMap = {
      primary: palette.primary,
      secondary: palette.secondary,
      additional: palette.additional,
      info: palette.info,
      warning: palette.warning,
      error: palette.error
    };
    const root = this.shadowRoot || this;
    Object.entries(colorMap).forEach(([key, value]) => {
      const el = root.querySelector(`.color[data-color="${key}"]`);
      if (el) {
        el.style.background = value;
        // Контрастный цвет текста
        el.style.color = _getContrastYIQ(value);
        const hexSpan = el.querySelector('.hex');
        if (hexSpan) hexSpan.textContent = value.toUpperCase();
      }
    });
  }
}

// Контрастный цвет текста (черный/белый) для фона
function _getContrastYIQ(hexcolor) {
  let hex = hexcolor.replace('#', '');
  if (hex.length === 3) hex = hex.split('').map(x => x + x).join('');
  const r = parseInt(hex.substr(0,2),16);
  const g = parseInt(hex.substr(2,2),16);
  const b = parseInt(hex.substr(4,2),16);
  const yiq = ((r*299)+(g*587)+(b*114))/1000;
  return (yiq >= 128) ? '#222' : '#fff';
}
customElements.define('color-palette', ColorPalette);

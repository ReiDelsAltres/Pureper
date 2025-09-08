// PalettePage.html.js
// This script is loaded when PalettePage.html is injected by the SPA router
import { ColorPalettes, setActualPalette } from "../src/foundation/theme/ColorPalettes.js";
// Using globally registered Page (set in src/foundation/globals.js)
const Page = globalThis.Page;

export default class PalettePage extends Page {
  async postLoadJS(element) {
    const container = document.getElementById('palettes-list');
    if (!container) return;
    // Контрастный цвет текста (черный/белый) для фона
    function getContrastYIQ(hexcolor) {
      let hex = hexcolor.replace('#', '');
      if (hex.length === 3) hex = hex.split('').map(x => x + x).join('');
      const r = parseInt(hex.substr(0, 2), 16);
      const g = parseInt(hex.substr(2, 2), 16);
      const b = parseInt(hex.substr(4, 2), 16);
      const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
      return (yiq >= 128) ? '#222' : '#fff';
    }

    let activeBtn = null;
    container.innerHTML = '';
    Object.keys(ColorPalettes).forEach(name => {
      const wrap = document.createElement('div');
      wrap.style.display = 'flex';
      wrap.style.flexDirection = 'column';
      wrap.style.alignItems = 'center';
      const btn = document.createElement('button');
      btn.className = 'palette-title';
      btn.textContent = name.charAt(0) + name.slice(1).toLowerCase();
      btn.style.cursor = 'pointer';
      btn.style.border = 'none';
      btn.style.background = 'none';
      btn.style.padding = '0';
      btn.style.font = 'inherit';
      const palette = document.createElement('color-palette');
      palette.setAttribute('palette', name);
      btn.appendChild(palette);
      wrap.appendChild(btn);
      container.appendChild(wrap);
      // Highlight MATERIAL by default
      if (!activeBtn && name === 'MATERIAL') {
        btn.classList.add('active');
        btn.style.background = ColorPalettes[name].primary;
        btn.style.color = getContrastYIQ(ColorPalettes[name].primary);
        activeBtn = btn;
      }
      btn.addEventListener('click', () => {
        if (activeBtn) {
          activeBtn.classList.remove('active');
          activeBtn.style.background = 'none';
          activeBtn.style.color = '';
        }
        btn.classList.add('active');
        btn.style.background = ColorPalettes[name].primary;
        btn.style.color = getContrastYIQ(ColorPalettes[name].primary);
        activeBtn = btn;
        setActualPalette(name);
      });
    });
  }
}
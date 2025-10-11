// PalettePage.html.js
// Simplified palette page that creates color-palette components
import { setActualPalette } from "../foundation/theme/ColorPalettes.js";
import Page from '../foundation/component_api/Page.js';

export default class PalettePage extends Page {
  async postLoadJS(element) {
    const container = document.getElementById('palettes-list');
    if (!container) return;

    const currentPalette = localStorage.getItem('palette') || 'BASIC';
    const items = Array.from(container.querySelectorAll('color-palette'));

    items.forEach(el => {
      const name = el.getAttribute('palette');
      if (name === currentPalette) {
        el.classList.add('active');
      }
      el.addEventListener('click', () => {
        items.forEach(p => p.classList.remove('active'));
        el.classList.add('active');
        setActualPalette(name);
      });
    });
  }
}
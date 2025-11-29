// PalettePage.html.js
// Simplified palette page that creates color-palette components

import IElementHolder from '../foundation/api/ElementHolder.js';
import Page from '../foundation/component_api/Page.js';
import { setTheme } from '../foundation/Theme.js';

export default class PalettePage extends Page {
  protected preLoad(holder: IElementHolder): Promise<void> {
    const themeMap: Record<string, string> = {
        'blazor-theme': 'Blazor',
        'brass-theme': 'Brass',
        'chess-theme': 'Chess',
    };

    holder.element.querySelectorAll('re-button').forEach((button) => {
        button.addEventListener('button-click', (obj) => {
            for (const cls of button.classList) {
                if (themeMap[cls]) {
                    const themeName = themeMap[cls];
                    setTheme(themeName);
                    localStorage.setItem('theme', themeName);
                    break;
                }
            }
        });
    });
    return Promise.resolve();
  }
}
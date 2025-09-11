// Using globally registered Component (set in src/foundation/globals.js)
const Component = globalThis.Component;
import { ActualPalette } from '../src/foundation/theme/ColorPalettes.js';

class SvgIcon extends Component {
  static get observedAttributes() {
    return ['icon', 'size', 'color', 'fill', 'stroke', 'stroke-width', 'hover', 'clickable', 'viewbox'];
  }

  constructor() {
    super('./components/SvgIcon.html');
  }

  init() {
    this.svgElement = this.shadowRoot.querySelector('.svg-icon');
    this.containerElement = this.shadowRoot.querySelector('.svg-container');
    
    this._updateIcon();
    this._updateSize();
    this._updateColors();
    this._updateInteractivity();
    
    this.onAttributeChanged((name, oldValue, newValue) => {
      if (oldValue !== newValue) {
        switch (name) {
          case 'icon':
            this._updateIcon();
            break;
          case 'size':
            this._updateSize();
            break;
          case 'color':
          case 'fill':
          case 'stroke':
          case 'stroke-width':
            this._updateColors();
            break;
          case 'hover':
          case 'clickable':
            this._updateInteractivity();
            break;
          case 'viewbox':
            this._updateViewBox();
            break;
        }
      }
    });
  }

  _updateIcon() {
    const iconName = this.getAttribute('icon');
    if (!iconName) return;
    
    // Предопределенные иконки
    const icons = {
      'home': '<path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>',
      'user': '<path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>',
      'settings': '<path d="M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.07-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61 l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.7-1.62-0.94L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41 h-3.84c-0.24,0-0.43,0.17-0.47,0.41L9.25,5.35C8.66,5.59,8.12,5.92,7.63,6.29L5.24,5.33c-0.22-0.08-0.47,0-0.59,0.22L2.74,8.87 C2.62,9.08,2.66,9.34,2.86,9.48l2.03,1.58C4.84,11.36,4.82,11.69,4.82,12s0.02,0.64,0.07,0.94l-2.03,1.58 c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.7,1.62,0.94l0.36,2.54 c0.05,0.24,0.24,0.41,0.48,0.41h3.84c0.24,0,0.44-0.17,0.47-0.41l0.36-2.54c0.59-0.24,1.13-0.56,1.62-0.94l2.39,0.96 c0.22,0.08,0.47,0,0.59-0.22l1.92-3.32c0.12-0.22,0.07-0.47-0.12-0.61L19.14,12.94z M12,15.6c-1.98,0-3.6-1.62-3.6-3.6 s1.62-3.6,3.6-3.6s3.6,1.62,3.6,3.6S13.98,15.6,12,15.6z"/>',
      'menu': '<path d="M3,6H21V8H3V6M3,11H21V13H3V11M3,16H21V18H3V16Z" />',
      'close': '<path d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z" />',
      'arrow-left': '<path d="M20,11V13H8L13.5,18.5L12.08,19.92L4.16,12L12.08,4.08L13.5,5.5L8,11H20Z" />',
      'arrow-right': '<path d="M4,11V13H16L10.5,18.5L11.92,19.92L19.84,12L11.92,4.08L10.5,5.5L16,11H4Z" />',
      'search': '<path d="M9.5,3A6.5,6.5 0 0,1 16,9.5C16,11.11 15.41,12.59 14.44,13.73L14.71,14H15.5L20.5,19L19,20.5L14,15.5V14.71L13.73,14.44C12.59,15.41 11.11,16 9.5,16A6.5,6.5 0 0,1 3,9.5A6.5,6.5 0 0,1 9.5,3M9.5,5C7,5 5,7 5,9.5C5,12 7,14 9.5,14C12,14 14,12 14,9.5C14,7 12,5 9.5,5Z" />',
      'heart': '<path d="M12,21.35L10.55,20.03C5.4,15.36 2,12.27 2,8.5 2,5.41 4.42,3 7.5,3C9.24,3 10.91,3.81 12,5.08C13.09,3.81 14.76,3 16.5,3C19.58,3 22,5.41 22,8.5C22,12.27 18.6,15.36 13.45,20.03L12,21.35Z" />',
      'star': '<path d="M12,17.27L18.18,21L16.54,13.97L22,9.24L14.81,8.62L12,2L9.19,8.62L2,9.24L7.45,13.97L5.82,21L12,17.27Z" />',
      'palette': '<path fill-rule="evenodd" d="M8.649 2.577A10.004 10.004 0 0 1 20.344 6.49a9.995 9.995 0 0 1 1.2 8.486l-.004.01-.005.015a2.958 2.958 0 0 1-2.836 2.001h-2.69a1.037 1.037 0 0 0-.95.68c-.047.13-.068.27-.06.409v.916A3.01 3.01 0 0 1 11.96 22a9.626 9.626 0 0 1-4.195-1l.009.005-.018-.009.01.004a10.1 10.1 0 0 1-5.716-7.996l-.001-.012a9.992 9.992 0 0 1 6.6-10.415Zm3.35 3.429a1 1 0 1 0 0 2h.01a1 1 0 1 0 0-2H12ZM8.53 7.518a1 1 0 0 0 0 2h.01a1 1 0 1 0 0-2h-.01Zm6.968 0a1 1 0 1 0 0 2h.01a1 1 0 1 0 0-2h-.01ZM6.99 11.004a1 1 0 1 0 0 2H7a1 1 0 1 0 0-2h-.01Z" clip-rule="evenodd"></path>'
    };
    
    // Если иконка найдена в предопределенных
    if (icons[iconName]) {
      this.svgElement.innerHTML = icons[iconName];
      return;
    }
    
    // Если это путь к SVG или содержимое SVG
    if (iconName.includes('<') || iconName.includes('path') || iconName.includes('svg')) {
      // Если это полный SVG, извлекаем содержимое
      if (iconName.includes('<svg')) {
        const parser = new DOMParser();
        const svgDoc = parser.parseFromString(iconName, 'image/svg+xml');
        const svgContent = svgDoc.querySelector('svg');
        if (svgContent) {
          this.svgElement.innerHTML = svgContent.innerHTML;
          // Копируем viewBox если есть
          const viewBox = svgContent.getAttribute('viewBox');
          if (viewBox) {
            this.svgElement.setAttribute('viewBox', viewBox);
          }
        }
      } else {
        // Это содержимое SVG (path и т.д.)
        this.svgElement.innerHTML = iconName;
      }
    }
  }

  _updateSize() {
    const size = this.getAttribute('size');
    
    // Убираем все size классы
    this.svgElement.classList.remove('size-xs', 'size-sm', 'size-md', 'size-lg', 'size-xl');
    
    if (size) {
      // Если размер указан как класс (xs, sm, md, lg, xl)
      if (['xs', 'sm', 'md', 'lg', 'xl'].includes(size)) {
        this.svgElement.classList.add(`size-${size}`);
      } else {
        // Если размер указан в пикселях или других единицах
        this.svgElement.style.setProperty('--svg-size', size.includes('px') ? size : size + 'px');
      }
    }
  }

  _updateColors() {
    const color = this.getAttribute('color');
    const fill = this.getAttribute('fill');
    const stroke = this.getAttribute('stroke');
    const strokeWidth = this.getAttribute('stroke-width');
    
    // Убираем все color классы
    this.svgElement.classList.remove('color-primary', 'color-secondary', 'color-tertiary', 
      'color-success', 'color-warning', 'color-error', 'color-info', 'color-text');
    
    // Применяем цветовой класс темы
    if (color && ['primary', 'secondary', 'tertiary', 'success', 'warning', 'error', 'info', 'text'].includes(color)) {
      this.svgElement.classList.add(`color-${color}`);
    }
    
    // Применяем кастомные цвета
    if (fill) {
      this.svgElement.style.setProperty('--svg-fill', fill);
    }
    
    if (stroke) {
      this.svgElement.style.setProperty('--svg-stroke', stroke);
    }
    
    if (strokeWidth) {
      this.svgElement.style.setProperty('--svg-stroke-width', strokeWidth);
    }
  }

  _updateInteractivity() {
    const hover = this.getAttribute('hover');
    const clickable = this.getAttribute('clickable');
    
    // Hover эффект
    if (hover === 'true' || hover === '') {
      this.svgElement.classList.add('hover-enabled');
    } else {
      this.svgElement.classList.remove('hover-enabled');
    }
    
    // Кликабельность
    if (clickable === 'true' || clickable === '') {
      this.svgElement.classList.add('clickable');
    } else {
      this.svgElement.classList.remove('clickable');
    }
  }

  _updateViewBox() {
    const viewbox = this.getAttribute('viewbox');
    if (viewbox) {
      this.svgElement.setAttribute('viewBox', viewbox);
    }
  }

  // Публичные методы для управления иконкой
  setIcon(iconName) {
    this.setAttribute('icon', iconName);
  }

  setSize(size) {
    this.setAttribute('size', size);
  }

  setColor(color) {
    this.setAttribute('color', color);
  }

  setFill(fill) {
    this.setAttribute('fill', fill);
  }
}

customElements.define('svg-icon', SvgIcon);

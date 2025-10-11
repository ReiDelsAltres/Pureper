import IElementHolder from "../foundation/api/ElementHolder.js";
import Component from "../foundation/component_api/Component.js";

/**
 * Типы для системы иконок
 */
type IconName = 
    | 'home' | 'user' | 'settings' | 'copy' | 'menu' | 'close' 
    | 'arrow-left' | 'arrow-right' | 'search' | 'heart' | 'star' 
    | 'palette' | 'info' | 'warning' | 'error' | 'success'
    | string;

type SizeVariant = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
type ColorVariant = 'primary' | 'secondary' | 'tertiary' | 'success' | 'warning' | 'error' | 'info' | 'text';

/**
 * Интерфейс для конфигурации иконок
 */
interface IconConfig {
    name: string;
    path: string;
    viewBox?: string;
}

/**
 * Универсальный компонент SVG иконок с поддержкой тем и интерактивности
 * Поддерживает предустановленные иконки, кастомные SVG пути и полные SVG элементы
 */
export default class SvgIcon extends Component {
    private svgElement: SVGSVGElement | null = null;
    private containerElement: HTMLElement | null = null;
    
    /**
     * Библиотека предустановленных иконок Material Design
     */
    private readonly iconLibrary: Map<string, IconConfig> = new Map([
        ['home', { name: 'home', path: 'M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z' }],
        ['user', { name: 'user', path: 'M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z' }],
        ['settings', { 
            name: 'settings', 
            path: 'M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.07-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61 l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.7-1.62-0.94L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41 h-3.84c-0.24,0-0.43,0.17-0.47,0.41L9.25,5.35C8.66,5.59,8.12,5.92,7.63,6.29L5.24,5.33c-0.22-0.08-0.47,0-0.59,0.22L2.74,8.87 C2.62,9.08,2.66,9.34,2.86,9.48l2.03,1.58C4.84,11.36,4.82,11.69,4.82,12s0.02,0.64,0.07,0.94l-2.03,1.58 c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.7,1.62,0.94l0.36,2.54 c0.05,0.24,0.24,0.41,0.48,0.41h3.84c0.24,0,0.44-0.17,0.47-0.41l0.36-2.54c0.59-0.24,1.13-0.56,1.62-0.94l2.39,0.96 c0.22,0.08,0.47,0,0.59-0.22l1.92-3.32c0.12-0.22,0.07-0.47-0.12-0.61L19.14,12.94z M12,15.6c-1.98,0-3.6-1.62-3.6-3.6 s1.62-3.6,3.6-3.6s3.6,1.62,3.6,3.6S13.98,15.6,12,15.6z'
        }],
        ['copy', { name: 'copy', path: 'M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z' }],
        ['menu', { name: 'menu', path: 'M3,6H21V8H3V6M3,11H21V13H3V11M3,16H21V18H3V16Z' }],
        ['close', { name: 'close', path: 'M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z' }],
        ['arrow-left', { name: 'arrow-left', path: 'M20,11V13H8L13.5,18.5L12.08,19.92L4.16,12L12.08,4.08L13.5,5.5L8,11H20Z' }],
        ['arrow-right', { name: 'arrow-right', path: 'M4,11V13H16L10.5,18.5L11.92,19.92L19.84,12L11.92,4.08L10.5,5.5L16,11H4Z' }],
        ['search', { name: 'search', path: 'M9.5,3A6.5,6.5 0 0,1 16,9.5C16,11.11 15.41,12.59 14.44,13.73L14.71,14H15.5L20.5,19L19,20.5L14,15.5V14.71L13.73,14.44C12.59,15.41 11.11,16 9.5,16A6.5,6.5 0 0,1 3,9.5A6.5,6.5 0 0,1 9.5,3M9.5,5C7,5 5,7 5,9.5C5,12 7,14 9.5,14C12,14 14,12 14,9.5C14,7 12,5 9.5,5Z' }],
        ['heart', { name: 'heart', path: 'M12,21.35L10.55,20.03C5.4,15.36 2,12.27 2,8.5 2,5.41 4.42,3 7.5,3C9.24,3 10.91,3.81 12,5.08C13.09,3.81 14.76,3 16.5,3C19.58,3 22,5.41 22,8.5C22,12.27 18.6,15.36 13.45,20.03L12,21.35Z' }],
        ['star', { name: 'star', path: 'M12,17.27L18.18,21L16.54,13.97L22,9.24L14.81,8.62L12,2L9.19,8.62L2,9.24L7.45,13.97L5.82,21L12,17.27Z' }],
        ['palette', { 
            name: 'palette', 
            path: 'M8.649 2.577A10.004 10.004 0 0 1 20.344 6.49a9.995 9.995 0 0 1 1.2 8.486l-.004.01-.005.015a2.958 2.958 0 0 1-2.836 2.001h-2.69a1.037 1.037 0 0 0-.95.68c-.047.13-.068.27-.06.409v.916A3.01 3.01 0 0 1 11.96 22a9.626 9.626 0 0 1-4.195-1l.009.005-.018-.009.01.004a10.1 10.1 0 0 1-5.716-7.996l-.001-.012a9.992 9.992 0 0 1 6.6-10.415Zm3.35 3.429a1 1 0 1 0 0 2h.01a1 1 0 1 0 0-2H12ZM8.53 7.518a1 1 0 0 0 0 2h.01a1 1 0 1 0 0-2h-.01Zm6.968 0a1 1 0 1 0 0 2h.01a1 1 0 1 0 0-2h-.01ZM6.99 11.004a1 1 0 1 0 0 2H7a1 1 0 1 0 0-2h-.01Z'
        }],
        ['info', { name: 'info', path: 'M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22A10,10 0 0,1 2,12A10,10 0 0,1 12,2M12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20A8,8 0 0,0 20,12A8,8 0 0,0 12,4M11,8.5A1.5,1.5 0 0,1 12.5,7A1.5,1.5 0 0,1 14,8.5A1.5,1.5 0 0,1 12.5,10A1.5,1.5 0 0,1 11,8.5M10.5,12H13.5V17H10.5V12Z' }],
        ['warning', { name: 'warning', path: 'M12,2L1,21H23M12,6L19.53,19H4.47M11,10V14H13V10M11,16V18H13V16' }],
        ['error', { name: 'error', path: 'M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22A10,10 0 0,1 2,12A10,10 0 0,1 12,2M12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20A8,8 0 0,0 20,12A8,8 0 0,0 12,4M14.5,9A1.5,1.5 0 0,1 16,10.5A1.5,1.5 0 0,1 14.5,12A1.5,1.5 0 0,1 13,10.5A1.5,1.5 0 0,1 14.5,9M10,17L14,13L10,9V17Z' }],
        ['success', { name: 'success', path: 'M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22A10,10 0 0,1 2,12A10,10 0 0,1 12,2M12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20A8,8 0 0,0 20,12A8,8 0 0,0 12,4M11,16.5L6.5,12L7.91,10.59L11,13.67L16.59,8.09L18,9.5L11,16.5Z' }]
    ]);

    /**
     * Атрибуты, за которыми следит компонент
     */
    static get observedAttributes(): string[] {
        return ['icon', 'size', 'color', 'fill', 'stroke', 'stroke-width', 'hover', 'clickable', 'viewbox', 'rotation'];
    }

    /**
     * Инициализация компонента после загрузки HTML шаблона
     */
    protected async preLoad(holder: IElementHolder): Promise<void> {
        this.initializeElements(holder);
        this.updateAllProperties();
        this.setupAttributeWatchers();
        this.attachEventListeners();
    }

    /**
     * Получение ссылок на DOM элементы
     */
    private initializeElements(holder: IElementHolder): void {
        const tt = holder.element.innerHTML;
        this.svgElement = holder.element.querySelector('.svg-icon') as SVGSVGElement;
        this.containerElement = holder.element.querySelector('.svg-container') as HTMLElement;

        if (!this.svgElement || !this.containerElement) {
            console.error('SvgIcon: Не удалось найти необходимые элементы в шаблоне');
        }
    }

    /**
     * Обновление всех свойств при инициализации
     */
    private updateAllProperties(): void {
        this.updateIcon();
        this.updateSize();
        this.updateColors();
        this.updateInteractivity();
        this.updateViewBox();
        this.updateRotation();
    }

    /**
     * Настройка отслеживания изменений атрибутов
     */
    private setupAttributeWatchers(): void {
        this.onAttributeChangedCallback((name: string, oldValue: string | null, newValue: string | null) => {
            if (oldValue === newValue) return;

            switch (name) {
                case 'icon':
                    this.updateIcon();
                    break;
                case 'size':
                    this.updateSize();
                    break;
                case 'color':
                case 'fill':
                case 'stroke':
                case 'stroke-width':
                    this.updateColors();
                    break;
                case 'hover':
                case 'clickable':
                    this.updateInteractivity();
                    break;
                case 'viewbox':
                    this.updateViewBox();
                    break;
                case 'rotation':
                    this.updateRotation();
                    break;
            }
        });
    }

    /**
     * Прикрепление обработчиков событий
     */
    private attachEventListeners(): void {
        if (!this.svgElement) return;

        // Клик по иконке
        this.svgElement.addEventListener('click', (event) => {
            if (this.isClickable()) {
                this.dispatchEvent(new CustomEvent('icon-click', {
                    detail: { iconName: this.getAttribute('icon'), originalEvent: event },
                    bubbles: true
                }));
            }
        });

        // Hover эффекты
        if (this.hasHoverEffect()) {
            this.svgElement.addEventListener('mouseenter', () => {
                this.dispatchEvent(new CustomEvent('icon-hover-start', {
                    detail: { iconName: this.getAttribute('icon') },
                    bubbles: true
                }));
            });

            this.svgElement.addEventListener('mouseleave', () => {
                this.dispatchEvent(new CustomEvent('icon-hover-end', {
                    detail: { iconName: this.getAttribute('icon') },
                    bubbles: true
                }));
            });
        }
    }

    /**
     * Обновление иконки
     */
    private updateIcon(): void {
        const iconName = this.getAttribute('icon');
        if (!iconName || !this.svgElement) return;

        try {
            // Поиск в библиотеке предустановленных иконок
            const iconConfig = this.iconLibrary.get(iconName);
            if (iconConfig) {
                this.svgElement.innerHTML = `<path d="${iconConfig.path}"/>`;
                if (iconConfig.viewBox) {
                    this.svgElement.setAttribute('viewBox', iconConfig.viewBox);
                }
                return;
            }

            // Обработка кастомного SVG контента
            this.parseCustomIcon(iconName);
        } catch (error) {
            console.error(`SvgIcon: Ошибка при обработке иконки "${iconName}":`, error);
        }
    }

    /**
     * Парсинг кастомных SVG иконок
     */
    private parseCustomIcon(iconData: string): void {
        if (!this.svgElement) return;

        // Полный SVG элемент
        if (iconData.includes('<svg')) {
            this.parseFullSvg(iconData);
        } 
        // SVG path или другие элементы
        else if (iconData.includes('<path') || iconData.includes('<circle') || iconData.includes('<rect')) {
            this.svgElement.innerHTML = iconData;
        }
        // Просто path данные
        else if (iconData.includes('M') || iconData.includes('m')) {
            this.svgElement.innerHTML = `<path d="${iconData}"/>`;
        }
    }

    /**
     * Парсинг полного SVG элемента
     */
    private parseFullSvg(svgString: string): void {
        if (!this.svgElement) return;

        try {
            const parser = new DOMParser();
            const svgDoc = parser.parseFromString(svgString, 'image/svg+xml');
            const parsedSvg = svgDoc.querySelector('svg');
            
            if (parsedSvg) {
                this.svgElement.innerHTML = parsedSvg.innerHTML;
                
                // Копирование viewBox если есть
                const viewBox = parsedSvg.getAttribute('viewBox');
                if (viewBox) {
                    this.svgElement.setAttribute('viewBox', viewBox);
                }
            }
        } catch (error) {
            console.error('SvgIcon: Ошибка парсинга SVG:', error);
        }
    }

    /**
     * Обновление размера иконки
     */
    private updateSize(): void {
        if (!this.svgElement) return;
        
        const size = this.getAttribute('size');
        
        // Удаление всех size классов
        this.clearSizeClasses();

        if (!size) return;

        // Предустановленные размеры
        if (this.isValidSizeVariant(size)) {
            this.svgElement.classList.add(`size-${size}`);
        } else {
            // Кастомный размер
            const normalizedSize = size.includes('px') ? size : size + 'px';
            this.svgElement.style.setProperty('--svg-size', normalizedSize);
        }
    }

    /**
     * Очистка классов размера
     */
    private clearSizeClasses(): void {
        if (!this.svgElement) return;
        this.svgElement.classList.remove('size-xs', 'size-sm', 'size-md', 'size-lg', 'size-xl');
    }

    /**
     * Проверка валидности размера
     */
    private isValidSizeVariant(size: string): size is SizeVariant {
        return ['xs', 'sm', 'md', 'lg', 'xl'].includes(size);
    }

    /**
     * Обновление цветов иконки
     */
    private updateColors(): void {
        if (!this.svgElement) return;
        
        this.clearColorClasses();
        
        const color = this.getAttribute('color');
        const fill = this.getAttribute('fill');
        const stroke = this.getAttribute('stroke');
        const strokeWidth = this.getAttribute('stroke-width');

        // Цвет из темы
        if (color && this.isValidColorVariant(color)) {
            this.svgElement.classList.add(`color-${color}`);
        }

        // Кастомные цвета
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

    /**
     * Очистка цветовых классов
     */
    private clearColorClasses(): void {
        if (!this.svgElement) return;
        this.svgElement.classList.remove(
            'color-primary', 'color-secondary', 'color-tertiary',
            'color-success', 'color-warning', 'color-error', 
            'color-info', 'color-text'
        );
    }

    /**
     * Проверка валидности цвета
     */
    private isValidColorVariant(color: string): color is ColorVariant {
        return ['primary', 'secondary', 'tertiary', 'success', 'warning', 'error', 'info', 'text'].includes(color);
    }

    /**
     * Обновление интерактивности
     */
    private updateInteractivity(): void {
        if (!this.svgElement) return;
        
        const hover = this.getAttribute('hover');
        const clickable = this.getAttribute('clickable');

        // Hover эффект
        if (this.isBooleanAttribute(hover)) {
            this.svgElement.classList.add('hover-enabled');
        } else {
            this.svgElement.classList.remove('hover-enabled');
        }

        // Кликабельность
        if (this.isBooleanAttribute(clickable)) {
            this.svgElement.classList.add('clickable');
            this.svgElement.setAttribute('role', 'button');
            this.svgElement.setAttribute('tabindex', '0');
        } else {
            this.svgElement.classList.remove('clickable');
            this.svgElement.removeAttribute('role');
            this.svgElement.removeAttribute('tabindex');
        }
    }

    /**
     * Обновление viewBox
     */
    private updateViewBox(): void {
        if (!this.svgElement) return;
        
        const viewbox = this.getAttribute('viewbox');
        if (viewbox) {
            this.svgElement.setAttribute('viewBox', viewbox);
        }
    }

    /**
     * Обновление поворота иконки
     */
    private updateRotation(): void {
        if (!this.svgElement) return;
        
        const rotation = this.getAttribute('rotation');
        if (rotation) {
            this.svgElement.style.setProperty('--svg-rotation', `${rotation}deg`);
            this.svgElement.style.transform = `rotate(var(--svg-rotation, 0deg))`;
        } else {
            this.svgElement.style.removeProperty('--svg-rotation');
            this.svgElement.style.removeProperty('transform');
        }
    }

    /**
     * Проверка булевого атрибута
     */
    private isBooleanAttribute(value: string | null): boolean {
        return value === 'true' || value === '';
    }

    /**
     * Проверка наличия hover эффекта
     */
    private hasHoverEffect(): boolean {
        return this.isBooleanAttribute(this.getAttribute('hover'));
    }

    /**
     * Проверка кликабельности
     */
    private isClickable(): boolean {
        return this.isBooleanAttribute(this.getAttribute('clickable'));
    }

    // ===================
    // Публичное API
    // ===================

    /**
     * Установка иконки
     */
    public setIcon(iconName: IconName): this {
        this.setAttribute('icon', iconName);
        return this;
    }

    /**
     * Установка размера
     */
    public setSize(size: SizeVariant | string): this {
        this.setAttribute('size', size);
        return this;
    }

    /**
     * Установка цвета из темы
     */
    public setColor(color: ColorVariant): this {
        this.setAttribute('color', color);
        return this;
    }

    /**
     * Установка кастомного цвета заливки
     */
    public setFill(fill: string): this {
        this.setAttribute('fill', fill);
        return this;
    }

    /**
     * Установка цвета обводки
     */
    public setStroke(stroke: string): this {
        this.setAttribute('stroke', stroke);
        return this;
    }

    /**
     * Установка толщины обводки
     */
    public setStrokeWidth(width: string): this {
        this.setAttribute('stroke-width', width);
        return this;
    }

    /**
     * Включение/отключение hover эффекта
     */
    public setHover(enabled: boolean): this {
        if (enabled) {
            this.setAttribute('hover', '');
        } else {
            this.removeAttribute('hover');
        }
        return this;
    }

    /**
     * Включение/отключение кликабельности
     */
    public setClickable(enabled: boolean): this {
        if (enabled) {
            this.setAttribute('clickable', '');
        } else {
            this.removeAttribute('clickable');
        }
        return this;
    }

    /**
     * Установка поворота
     */
    public setRotation(degrees: number): this {
        this.setAttribute('rotation', degrees.toString());
        return this;
    }

    /**
     * Установка viewBox
     */
    public setViewBox(viewBox: string): this {
        this.setAttribute('viewbox', viewBox);
        return this;
    }

    /**
     * Получение списка доступных иконок
     */
    public getAvailableIcons(): string[] {
        return Array.from(this.iconLibrary.keys());
    }

    /**
     * Добавление кастомной иконки в библиотеку
     */
    public addIcon(name: string, config: IconConfig): void {
        this.iconLibrary.set(name, config);
    }

    /**
     * Проверка существования иконки в библиотеке
     */
    public hasIcon(name: string): boolean {
        return this.iconLibrary.has(name);
    }
}
import IElementHolder from '../foundation/api/ElementHolder.js';
import { UniHtmlComponent } from '../foundation/component_api/UniHtml.js';

export default class ReButton extends UniHtmlComponent {
    private button?: HTMLButtonElement;
    private iconSlot?: HTMLElement;

    static get observedAttributes() {
        return [
            'variant', 'size', 'color', 'icon', 'disabled',
            'loading', 'full-width', 'type', 'href'
        ];
    }

    protected preLoad(holder: IElementHolder): Promise<void> {
        //this.handleClick = this.handleClick.bind(this);

        this.button = holder.element.querySelector('.btn') as HTMLButtonElement;
        this.iconSlot = holder.element.querySelector('#icon-slot') as HTMLElement;

        if (this.button) {
            this.addEventListener('click', this.handleClick);
            this.updateButton();
        }

        // Обработка изменений атрибутов
        this.onAttributeChangedCallback((name, oldValue, newValue) => {
            this.updateButton();
        });
        return Promise.resolve();
    }

    private updateButton() {
        if (!this.button) return;

        // Обновляем классы кнопки
        this.updateClasses();

        // Обновляем атрибуты кнопки
        this.updateAttributes();

        // Обновляем иконку
        this.updateIcon();
    }

    private updateClasses() {
        const classes = ['btn'];

        // Вариант кнопки (filled, outlined, text)
        const variant = this.getAttribute('variant') || 'filled';
        if (variant !== 'filled') {
            classes.push(variant);
        }

        // Цвет
        const color = this.getAttribute('color') || 'primary';
        classes.push(color);

        // Размер
        const size = this.getAttribute('size');
        if (size && size !== 'medium') {
            classes.push(size);
        }

        // Состояние загрузки
        if (this.hasAttribute('loading')) {
            classes.push('loading');
        }

        // Только иконка
        if (this.hasAttribute('icon') && !this.textContent.trim()) {
            classes.push('icon-only');
        }

        this.button!.className = classes.join(' ');
    }

    private updateAttributes() {
        // Тип кнопки
        const type = this.getAttribute('type') || 'button';
        this.button!.setAttribute('type', type);

        // Отключенное состояние
        if (this.hasAttribute('disabled')) {
            this.button!.setAttribute('disabled', '');
        } else {
            this.button!.removeAttribute('disabled');
        }

        // Ссылка (превращаем в ссылку, если есть href)
        const href = this.getAttribute('href');
        if (href) {
            this.button!.setAttribute('href', href);
            this.button!.removeAttribute('type');
        }
    }

    private updateIcon() {
        const iconName = this.getAttribute('icon');
        const color = this.getAttribute('color') || 'primary';
        const variant = this.getAttribute('variant') || 'filled';

        if (iconName) {
            // Проверяем, есть ли уже svg-icon
            let existingIcon = this.iconSlot!.querySelector('svg-icon');

            if (existingIcon) {
                existingIcon.setAttribute('icon', iconName);
            } else {
                // Создаем новую иконку
                const svgIcon = document.createElement('svg-icon');
                svgIcon.setAttribute('icon', iconName);
                svgIcon.setAttribute('size', 'sm');
                if (variant !== 'filled')
                    svgIcon.setAttribute('color', color);
                this.iconSlot!.appendChild(svgIcon);
            }

            this.iconSlot!.classList.add('has-icon');
        } else {
            this.iconSlot!.innerHTML = '';
            this.iconSlot!.classList.remove('has-icon');
        }
    }

    private handleClick(event: MouseEvent) {
        // Предотвращаем клик если кнопка отключена или загружается
        if (this.hasAttribute('disabled') || this.hasAttribute('loading')) {
            event.preventDefault();
            event.stopPropagation();
            return;
        }

        // Если это ссылка с data-link, используем SPA навигацию
        /*const href = this.getAttribute('href');
        if (href && this.hasAttribute('data-link')) {
            Router.routeTo(href);
        }*/

        // Эмитируем кастомное событие
        this.dispatchEvent(new CustomEvent('button-click', {
            detail: {
                variant: this.getAttribute('variant'),
                color: this.getAttribute('color'),
                size: this.getAttribute('size')
            },
            bubbles: true,
            cancelable: true
        }));
    }

    // Публичные методы для управления состоянием кнопки

    /**
     * Показать состояние загрузки
     */
    public showLoading() {
        this.setAttribute('loading', '');
    }

    /**
     * Скрыть состояние загрузки
     */
    public hideLoading() {
        this.removeAttribute('loading');
    }

    /**
     * Отключить кнопку
     */
    public disable() {
        this.setAttribute('disabled', '');
    }

    /**
     * Включить кнопку
     */
    public enable() {
        this.removeAttribute('disabled');
    }

    /**
     * Установить иконку
     * @param {string} iconName - название иконки
     */
    public setIcon(iconName: string) {
        if (iconName) {
            this.setAttribute('icon', iconName);
        } else {
            this.removeAttribute('icon');
        }
    }

    /**
     * Установить вариант кнопки
     * @param {'filled'|'outlined'|'text'} variant - вариант кнопки
     */
    public setVariant(variant: 'filled' | 'outlined' | 'text') {
        this.setAttribute('variant', variant);
    }

    /**
     * Установить цвет кнопки
     * @param {'primary'|'secondary'|'tertiary'|'additional'|'success'|'warning'|'error'|'info'} color - цвет кнопки
     */
    public setColor(color: 'primary' | 'secondary' | 'tertiary' | 'additional' | 'success' | 'warning' | 'error' | 'info') {
        this.setAttribute('color', color);
    }

    /**
     * Установить размер кнопки
     * @param {'small'|'medium'|'large'} size - размер кнопки
     */
    public setSize(size: 'small' | 'medium' | 'large') {
        this.setAttribute('size', size);
    }

    /**
     * Программный клик по кнопке
     */
    public click() {
        if (this.button && !this.hasAttribute('disabled') && !this.hasAttribute('loading')) {
            this.button.click();
        }
    }

    /**
     * Фокус на кнопке
     */
    public focus() {
        if (this.button) {
            this.button.focus();
        }
    }

    /**
     * Снять фокус с кнопки
     */
    public blur() {
        if (this.button) {
            this.button.blur();
        }
    }
}

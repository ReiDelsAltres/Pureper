import Page from '../foundation/component_api/Page.js';

export default class ButtonsPage extends Page {
    constructor() {
        super();
        this.colorIndex = 0;
        this.variantIndex = 0;
        this.colors = ['primary', 'secondary', 'tertiary', 'success', 'warning', 'error', 'info'];
        this.variants = ['filled', 'outlined', 'text'];
    }

    async postLoadJS(element) {
        this.setupInteractiveButtons(element);
        this.setupButtonEventListeners(element);
    }

    setupInteractiveButtons(element) {
        const toggleLoadingBtn = element.querySelector('#toggle-loading');
        const toggleDisabledBtn = element.querySelector('#toggle-disabled');
        const changeColorBtn = element.querySelector('#change-color');
        const changeVariantBtn = element.querySelector('#change-variant');
        const demoButton = element.querySelector('#demo-button');
        const logContent = element.querySelector('#log-content');

        if (!logContent) return;

        // Helper функция для логирования
        const log = (message) => {
            const timestamp = new Date().toLocaleTimeString();
            const currentLog = logContent.textContent;
            const newLog = `[${timestamp}] ${message}\n${currentLog}`;
            logContent.textContent = newLog;
        };

        // Toggle Loading
        if (toggleLoadingBtn && demoButton) {
            toggleLoadingBtn.addEventListener('button-click', () => {
                if (demoButton.hasAttribute('loading')) {
                    demoButton.hideLoading();
                    log('Demo Button: Загрузка отключена');
                } else {
                    demoButton.showLoading();
                    log('Demo Button: Включена загрузка');
                }
            });
        }

        // Toggle Disabled
        if (toggleDisabledBtn && demoButton) {
            toggleDisabledBtn.addEventListener('button-click', () => {
                if (demoButton.hasAttribute('disabled')) {
                    demoButton.enable();
                    log('Demo Button: Кнопка включена');
                } else {
                    demoButton.disable();
                    log('Demo Button: Кнопка отключена');
                }
            });
        }

        // Change Color
        if (changeColorBtn && demoButton) {
            changeColorBtn.addEventListener('button-click', () => {
                this.colorIndex = (this.colorIndex + 1) % this.colors.length;
                const newColor = this.colors[this.colorIndex];
                demoButton.setColor(newColor);
                log(`Demo Button: Цвет изменен на ${newColor}`);
            });
        }

        // Change Variant
        if (changeVariantBtn && demoButton) {
            changeVariantBtn.addEventListener('button-click', () => {
                this.variantIndex = (this.variantIndex + 1) % this.variants.length;
                const newVariant = this.variants[this.variantIndex];
                demoButton.setVariant(newVariant);
                log(`Demo Button: Вариант изменен на ${newVariant}`);
            });
        }

        // Demo Button clicks
        if (demoButton) {
            demoButton.addEventListener('button-click', () => {
                log('Demo Button: Клик по демо-кнопке');
            });
        }

        log('Интерактивные кнопки готовы к использованию');
    }

    setupButtonEventListeners(element) {
        const logContent = element.querySelector('#log-content');
        if (!logContent) return;

        const log = (message) => {
            const timestamp = new Date().toLocaleTimeString();
            const currentLog = logContent.textContent;
            const newLog = `[${timestamp}] ${message}\n${currentLog}`;
            logContent.textContent = newLog;
        };

        // Добавляем слушатели ко всем кнопкам для демонстрации событий
        const allButtons = element.querySelectorAll('custom-button');
        allButtons.forEach((button, index) => {
            button.addEventListener('button-click', (event) => {
                const buttonText = button.textContent.trim() || `Кнопка ${index + 1}`;
                const details = event.detail;
                
                let logMessage = `Клик: "${buttonText}"`;
                if (details.variant && details.variant !== 'filled') {
                    logMessage += ` (${details.variant})`;
                }
                if (details.color && details.color !== 'primary') {
                    logMessage += ` [${details.color}]`;
                }
                if (details.size && details.size !== 'medium') {
                    logMessage += ` {${details.size}}`;
                }
                
                // Не логируем клики по интерактивным кнопкам дважды
                if (!button.id || !['toggle-loading', 'toggle-disabled', 'change-color', 'change-variant', 'demo-button'].includes(button.id)) {
                    log(logMessage);
                }
            });

            // Дополнительные события для демонстрации
            button.addEventListener('focus', () => {
                if (!button.id || !['toggle-loading', 'toggle-disabled', 'change-color', 'change-variant', 'demo-button'].includes(button.id)) {
                    const buttonText = button.textContent.trim() || `Кнопка ${index + 1}`;
                    log(`Фокус: "${buttonText}"`);
                }
            });
        });
    }
}

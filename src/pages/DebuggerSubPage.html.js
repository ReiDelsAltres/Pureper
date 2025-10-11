import Page from '../foundation/component_api/Page.js';

export default class DebuggerSubPage extends Page {

    constructor() {
        super();
        this.currentComponent = null;
        this.componentConfig = {};
        this.isOptionsOpen = false;
        this.activeTab = 'demo';
        this.componentRegistry = null; // Will be loaded from JSON
    }

    async postLoad(element) {
        await super.postLoad(element);
        await this.loadComponentRegistry();
        
        this.initializeDebugger();
        this.setupEventListeners();
        this.loadComponentFromHash();
    }

    async loadComponentRegistry() {
        try {
            const response = await fetch('./data/componentRegistry.json');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            this.componentRegistry = await response.json();
            console.log('Component registry loaded:', this.componentRegistry);
        } catch (error) {
            console.error('Failed to load component registry:', error);
            // Fallback to empty registry
            this.componentRegistry = {};
            this.showError('Не удалось загрузить реестр компонентов');
        }
    }

    initializeDebugger() {
        this.elements = {
            // Navigation elements
            showOptionsBtn: document.getElementById('showOptionsBtn'),
            componentTitle: document.getElementById('componentTitle'),
            
            // Demo tabs
            demoTabs: document.querySelectorAll('.demo-tab'),
            demoContent: document.getElementById('demoContent'),
            codeContent: document.getElementById('codeContent'),
            
            // Component showcase
            componentShowcase: document.getElementById('componentShowcase'),
            generatedCode: document.getElementById('generatedCode'),
            copyCodeBtn: document.getElementById('copyCodeBtn'),
            
            // Options panel
            optionsPanel: document.getElementById('optionsPanel'),
            closeOptionsBtn: document.getElementById('closeOptionsBtn'),
            demoArea: document.querySelector('.demo-area'),
            
            // Option controls
            filterInput: document.getElementById('filterInput'),
            maxWidthSelect: document.getElementById('maxWidthSelect'),
            maxHeightInput: document.getElementById('maxHeightInput'),
            animationDurationInput: document.getElementById('animationDurationInput'),
            
            // Checkboxes
            closeOnEscapeKey: document.getElementById('closeOnEscapeKey'),
            noHeader: document.getElementById('noHeader'),
            fullScreen: document.getElementById('fullScreen'),
            keepMaxSizeConstraints: document.getElementById('keepMaxSizeConstraints'),
            animateClose: document.getElementById('animateClose'),
            maximizeButton: document.getElementById('maximizeButton'),
            keepRelations: document.getElementById('keepRelations'),
            modal: document.getElementById('modal'),
            minimizeButton: document.getElementById('minimizeButton'),
            resizeable: document.getElementById('resizeable'),
            fullHeight: document.getElementById('fullHeight'),
            
            // Error boundary
            errorBoundary: document.getElementById('errorBoundary'),
            errorText: document.getElementById('errorText')
        };
    }

    setupEventListeners() {
        // Hash change for component loading
        window.addEventListener('hashchange', () => {
            this.loadComponentFromHash();
        });

        // Options panel toggle
        this.elements.showOptionsBtn?.addEventListener('click', () => {
            this.toggleOptionsPanel();
        });

        this.elements.closeOptionsBtn?.addEventListener('click', () => {
            this.toggleOptionsPanel();
        });

        // Demo tabs
        this.elements.demoTabs.forEach((tab, index) => {
            tab.addEventListener('click', () => {
                this.switchTab(index === 0 ? 'demo' : 'code');
            });
        });

        // Copy code button
        this.elements.copyCodeBtn?.addEventListener('click', () => {
            this.copyGeneratedCode();
        });

        // Option controls
        this.setupOptionListeners();

        // Sample buttons
        this.setupSampleButtons();
    }

    setupOptionListeners() {
        // Setup listeners for dynamically created elements
        const optionsContent = document.getElementById('optionsContent');
        if (!optionsContent) return;

        // Use event delegation for dynamic elements
        optionsContent.addEventListener('change', (e) => {
            if (e.target.matches('.option-select, .option-checkbox')) {
                this.updateComponentFromOptions();
            }
        });

        optionsContent.addEventListener('input', (e) => {
            if (e.target.matches('.option-input')) {
                this.updateComponentFromOptions();
            }
        });
    }

    setupSampleButtons() {
        const sampleButtons = document.querySelectorAll('.demo-sample-btn');
        sampleButtons.forEach((btn, index) => {
            btn.addEventListener('click', () => {
                this.showSample(index + 1);
            });
        });
    }

    loadComponentFromHash() {
        const hash = window.location.hash.replace('#', '') || 'DebuggerSubPage';
        const parts = hash.split('/');
        const componentName = parts[1] || 'ReButton';
        
        console.log('Loading component from hash:', hash, 'Component:', componentName);
        
        this.switchComponent(componentName);
    }

    switchComponent(componentName) {
        console.log('Switching to component:', componentName);
        
        if (!this.componentRegistry) {
            console.log('Component registry not loaded yet');
            this.showError('Реестр компонентов еще не загружен');
            return;
        }
        
        if (!this.componentRegistry[componentName]) {
            console.log('Component not found in registry:', componentName);
            this.showError(`Компонент "${componentName}" не найден`);
            return;
        }

        const component = this.componentRegistry[componentName];
        this.currentComponent = component;
        
        // Update URL hash
        window.location.hash = `DebuggerSubPage/${componentName}`;
        
        console.log('Current component set to:', this.currentComponent);
        
        this.setupComponentInterface();
    }

    setupComponentInterface() {
        const component = this.currentComponent;
        
        // Update title
        this.elements.componentTitle.textContent = component.name || 'Dialog_Appearance';
        
        // Hide error
        this.elements.errorBoundary?.classList.add('hidden');
        
        // Generate dynamic options panel
        this.generateOptionsPanel(component);
        
        // Setup initial component config
        this.componentConfig = {};
        Object.entries(component.attributes || {}).forEach(([attr, config]) => {
            this.componentConfig[attr] = config.default;
        });

        // Force render component immediately
        console.log('Setting up component interface for:', component.name);
        console.log('Component config:', this.componentConfig);
        
        this.renderComponent();
        this.updateGeneratedCode();
    }

    generateOptionsPanel(component) {
        const optionsContent = document.getElementById('optionsContent');
        if (!optionsContent) return;

        // Clear existing options
        optionsContent.innerHTML = '';

        // Add filter first
        const filterSection = this.createOptionSection('Фильтр', 'text', 'filter', {
            placeholder: 'Filter...',
            description: 'Фильтр компонентов'
        });
        optionsContent.appendChild(filterSection);

        // Generate options for each attribute
        Object.entries(component.attributes || {}).forEach(([attrName, attrConfig]) => {
            const section = this.createOptionSection(
                this.capitalizeFirst(attrName.replace(/[-_]/g, ' ')),
                attrConfig.type,
                attrName,
                attrConfig
            );
            optionsContent.appendChild(section);
        });

        // Setup event listeners for new options
        this.setupOptionListeners();
    }

    createOptionSection(label, type, attrName, config) {
        const section = document.createElement('div');
        section.className = 'option-section';

        const labelElement = document.createElement('label');
        labelElement.className = 'option-label';
        labelElement.textContent = label;
        section.appendChild(labelElement);

        if (type === 'select' && config.options) {
            const control = this.createSelectControl(attrName, config);
            section.appendChild(control);
        } else if (type === 'checkbox') {
            const control = this.createCheckboxControl(attrName, config);
            section.appendChild(control);
        } else if (type === 'text' || type === 'number') {
            const control = this.createTextControl(attrName, type, config);
            section.appendChild(control);
        }

        return section;
    }

    createSelectControl(attrName, config) {
        const control = document.createElement('div');
        control.className = 'option-control';

        const select = document.createElement('select');
        select.className = 'option-select';
        select.id = `${attrName}Select`;

        // Add empty option if no default
        if (!config.default) {
            const emptyOption = document.createElement('option');
            emptyOption.value = '';
            emptyOption.textContent = '-- Не выбрано --';
            select.appendChild(emptyOption);
        }

        config.options.forEach(option => {
            const optionElement = document.createElement('option');
            optionElement.value = option;
            optionElement.textContent = this.capitalizeFirst(option);
            if (option === config.default) {
                optionElement.selected = true;
            }
            select.appendChild(optionElement);
        });

        control.appendChild(select);

        // Add clear button
        const clearBtn = document.createElement('button');
        clearBtn.className = 'option-clear-btn';
        clearBtn.innerHTML = '<svg-icon icon="close" size="xs" color="secondary"></svg-icon>';
        clearBtn.addEventListener('click', () => {
            select.value = '';
            this.updateComponentFromOptions();
        });
        control.appendChild(clearBtn);

        return control;
    }

    createCheckboxControl(attrName, config) {
        const control = document.createElement('div');
        control.className = 'checkbox-group';

        const label = document.createElement('label');
        label.className = 'checkbox-item';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'option-checkbox';
        checkbox.id = `${attrName}Checkbox`;
        checkbox.checked = config.default || false;

        const span = document.createElement('span');
        span.className = 'checkbox-label';
        span.textContent = this.capitalizeFirst(attrName.replace(/[-_]/g, ' '));

        label.appendChild(checkbox);
        label.appendChild(span);
        control.appendChild(label);

        return control;
    }

    createTextControl(attrName, type, config) {
        const control = document.createElement('div');
        control.className = 'option-control';

        const input = document.createElement('input');
        input.type = type;
        input.className = 'option-input';
        input.id = `${attrName}Input`;
        input.placeholder = config.placeholder || `Enter ${attrName}...`;
        if (config.default) {
            input.value = config.default;
        }

        control.appendChild(input);

        // Add clear button
        const clearBtn = document.createElement('button');
        clearBtn.className = 'option-clear-btn';
        clearBtn.innerHTML = '<svg-icon icon="close" size="xs" color="secondary"></svg-icon>';
        clearBtn.addEventListener('click', () => {
            input.value = '';
            this.updateComponentFromOptions();
        });
        control.appendChild(clearBtn);

        return control;
    }

    capitalizeFirst(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    toggleOptionsPanel() {
        this.isOptionsOpen = !this.isOptionsOpen;
        
        if (this.isOptionsOpen) {
            this.elements.optionsPanel?.classList.add('open');
            this.elements.demoArea?.classList.add('with-options');
            this.elements.showOptionsBtn.textContent = 'СКРЫТЬ ОПЦИИ';
        } else {
            this.elements.optionsPanel?.classList.remove('open');
            this.elements.demoArea?.classList.remove('with-options');
            this.elements.showOptionsBtn.textContent = 'ПОКАЗАТЬ ОПЦИИ';
        }
    }

    switchTab(tab) {
        this.activeTab = tab;
        
        // Update tab buttons
        this.elements.demoTabs.forEach((tabBtn, index) => {
            if ((index === 0 && tab === 'demo') || (index === 1 && tab === 'code')) {
                tabBtn.classList.add('active');
            } else {
                tabBtn.classList.remove('active');
            }
        });

        // Switch content
        if (tab === 'demo') {
            this.elements.demoContent?.classList.remove('hidden');
            this.elements.codeContent?.classList.add('hidden');
        } else {
            this.elements.demoContent?.classList.add('hidden');
            this.elements.codeContent?.classList.remove('hidden');
        }
    }

    updateComponentFromOptions() {
        // Simply re-render the component with current options
        // The renderComponent method will read current values from the form
        this.renderComponent();
    }

    renderComponent() {
        console.log('renderComponent called');
        console.log('currentComponent:', this.currentComponent);
        console.log('elements.componentShowcase:', this.elements.componentShowcase);
        
        if (!this.currentComponent) {
            console.log('No current component');
            return;
        }

        const showcase = this.elements.componentShowcase;
        if (!showcase) {
            console.log('No showcase element found');
            return;
        }

        // Get current config from options panel
        const config = this.getConfigFromOptions();
        console.log('Config from options:', config);

        // Clear previous content
        showcase.innerHTML = '';
        console.log('Cleared showcase content');

        // Show only the current component with current config
        try {
            const componentElement = this.createComponentElement(
                config, 
                'Тестовый компонент'
            );
            console.log('Created component element:', componentElement);
            showcase.appendChild(componentElement);
        } catch (error) {
            console.error('Error creating component:', error);
            const errorElement = document.createElement('div');
            errorElement.textContent = 'Ошибка создания компонента: ' + error.message;
            errorElement.style.color = 'red';
            showcase.appendChild(errorElement);
        }
        
        console.log('renderComponent completed, showcase content:', showcase.innerHTML);
    }

    getConfigFromOptions() {
        const config = {};
        
        if (!this.currentComponent || !this.currentComponent.attributes) {
            return config;
        }

        // Iterate through all component attributes and get their values
        Object.keys(this.currentComponent.attributes).forEach(attrName => {
            const attrConfig = this.currentComponent.attributes[attrName];
            
            if (attrConfig.type === 'select') {
                const selectElement = document.getElementById(`${attrName}Select`);
                const value = selectElement?.value;
                if (value) config[attrName] = value;
                
            } else if (attrConfig.type === 'checkbox') {
                const checkboxElement = document.getElementById(`${attrName}Checkbox`);
                if (checkboxElement?.checked) {
                    config[attrName] = true;
                }
                
            } else if (attrConfig.type === 'text' || attrConfig.type === 'number') {
                const inputElement = document.getElementById(`${attrName}Input`);
                const value = inputElement?.value;
                if (value) {
                    config[attrName] = attrConfig.type === 'number' ? Number(value) : value;
                }
            }
        });
        
        return config;
    }

    showSample(sampleNumber) {
        const component = this.currentComponent;
        if (!component || !component.examples) return;

        const example = component.examples[sampleNumber - 1];
        if (!example) return;

        // Apply example configuration to component config
        this.componentConfig = { ...this.componentConfig, ...example.config };
        
        // Update options panel controls if they exist
        this.applyExampleToOptions(example);
        
        // Re-render the component with new config
        this.renderComponent();
        this.updateGeneratedCode();
        
        // Show notification
        this.showNotification(`Применена конфигурация: ${example.name}`);
    }

    renderSingleComponent(example) {
        // This method is no longer needed, but keeping for compatibility
        this.showSample(this.currentComponent.examples.indexOf(example) + 1);
    }

    applyExampleToOptions(example) {
        // Apply example config to component config
        this.componentConfig = { ...this.componentConfig, ...example.config };
        
        // Update options panel controls if they exist
        Object.entries(example.config).forEach(([key, value]) => {
            const element = document.getElementById(key) || 
                           document.getElementById(key + 'Select') || 
                           document.getElementById(key + 'Input');
            
            if (element) {
                if (element.type === 'checkbox') {
                    element.checked = value;
                } else {
                    element.value = value;
                }
            }
        });

        this.updateGeneratedCode();
    }

    updateGeneratedCode() {
        if (!this.currentComponent) return;

        const component = this.currentComponent;
        let code = `<${component.tag}`;
        
        Object.entries(this.componentConfig).forEach(([attr, value]) => {
            if (value === true) {
                code += ` ${attr}`;
            } else if (value !== false && value !== '' && value !== null && value !== undefined) {
                code += ` ${attr}="${value}"`;
            }
        });

        code += `>\n`;
        
        if (component.slots?.icon) {
            code += `    <span slot="icon">\n        <!-- Иконка -->\n    </span>\n`;
        }
        
        code += `    Содержимое компонента\n</${component.tag}>`;

        if (this.elements.generatedCode) {
            this.elements.generatedCode.textContent = code;
        }
    }

    copyGeneratedCode() {
        const code = this.elements.generatedCode?.textContent;
        if (!code) return;

        if (navigator.clipboard) {
            navigator.clipboard.writeText(code).then(() => {
                this.showNotification('Код скопирован в буфер обмена!');
            });
        }
    }

    showNotification(message) {
        const notification = document.createElement('div');
        notification.className = 'notification success';
        notification.textContent = message;
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    showError(message) {
        if (this.elements.errorBoundary) {
            this.elements.errorBoundary.classList.remove('hidden');
        }
        if (this.elements.errorText) {
            this.elements.errorText.textContent = message;
        }
    }

    createComponentElement(config, content = '', icon = '') {
        const component = this.currentComponent;
        console.log('Creating component element:', component.tag, config);
        
        // Try to create custom element first
        try {
            const element = document.createElement(component.tag);
            
            Object.entries(config).forEach(([attr, value]) => {
                if (value === true) {
                    element.setAttribute(attr, '');
                } else if (value !== false && value !== '' && value !== null && value !== undefined) {
                    element.setAttribute(attr, value);
                }
            });

            if (icon && component.slots?.icon) {
                const iconSlot = document.createElement('span');
                iconSlot.slot = 'icon';
                iconSlot.innerHTML = icon;
                element.appendChild(iconSlot);
            }

            if (content) {
                element.appendChild(document.createTextNode(content));
            }

            console.log('Created custom element successfully:', element);
            return element;
        } catch (error) {
            console.warn('Failed to create custom element, using fallback:', error);
            
            // Fallback: create a regular button or div that looks like the component
            const fallbackElement = document.createElement('button');
            fallbackElement.textContent = content || `${component.name} компонент`;
            fallbackElement.style.cssText = `
                background: var(--color-primary);
                color: white;
                border: none;
                padding: 12px 24px;
                border-radius: 6px;
                cursor: pointer;
                font-size: 1rem;
                transition: background-color 0.2s;
                margin: 8px;
            `;
            
            // Apply some config-based styling
            if (config.color === 'secondary') {
                fallbackElement.style.background = 'var(--color-secondary)';
            } else if (config.color === 'tertiary') {
                fallbackElement.style.background = 'var(--color-tertiary)';
            }
            
            if (config.size === 'small') {
                fallbackElement.style.padding = '8px 16px';
                fallbackElement.style.fontSize = '0.875rem';
            } else if (config.size === 'large') {
                fallbackElement.style.padding = '16px 32px';
                fallbackElement.style.fontSize = '1.125rem';
            }
            
            if (config.disabled) {
                fallbackElement.disabled = true;
                fallbackElement.style.opacity = '0.6';
                fallbackElement.style.cursor = 'not-allowed';
            }
            
            console.log('Created fallback element:', fallbackElement);
            return fallbackElement;
        }
    }
}
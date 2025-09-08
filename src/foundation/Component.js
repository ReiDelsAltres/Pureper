export default class Component extends HTMLElement {
  static get observedAttributes() {
    return ["hidden"];
  }

  constructor(filePath) {
    super();
    const shadow = this.attachShadow({ mode: 'open' });

    // Определяем правильный путь для GitHub Pages
    const basePath = window.location.hostname.includes('github.io') ? '/Pureper/' : './';
    const fullPath = filePath.startsWith('./') ? filePath : basePath + filePath;

    fetch(fullPath)
      .then(response => {
        if (!response.ok) {
          throw new Error(`Failed to load ${fullPath}: ${response.status}`);
        }
        return response.text();
      })
      .then(html => {
        // Create a wrapper div to hold the HTML
        const wrapper = document.createElement('div');
        wrapper.innerHTML = html;
        // Переносим все <link> (и другие служебные) теги в shadowRoot
        const linkTags = wrapper.querySelectorAll('link[rel="stylesheet"], link[rel="import"], link[rel="preload"], link[rel="icon"]');
        linkTags.forEach(link => {
          wrapper.removeChild(link);
          // Корректируем путь к CSS файлу для GitHub Pages
          if (link.rel === 'stylesheet') {
            const href = link.getAttribute('href');
            if (href && !href.startsWith('http') && !href.startsWith('//')) {
              const basePath = window.location.hostname.includes('github.io') ? '/Pureper/' : './';
              const correctedHref = href.startsWith('./') ? href : basePath + href;
              link.setAttribute('href', correctedHref);
            }
          }
          shadow.appendChild(link);
        });
        // Вставляем только содержимое <template> в shadowRoot
        const template = wrapper.querySelector('template');
        if (template) {
          shadow.appendChild(template.content.cloneNode(true));
        }

        this.init();
      })
      .catch(error => {
        console.error('Error loading component:', error);
      });
  }

  init() {
    // Переопределяется в наследниках
  }

  /**
   * Зарегистрировать callback, вызываемый при любом изменении атрибута
   * @param {function} fn
   */
  onAttributeChanged(fn) {
    if (!this._attributeChangedCallbacks) {
      this._attributeChangedCallbacks = [];
    }
    if (typeof fn === 'function' && !this._attributeChangedCallbacks.includes(fn)) {
      this._attributeChangedCallbacks.push(fn);
    }
  }

  /**
   * Удалить callback
   * @param {function} fn
   */
  offAttributeChanged(fn) {
    if (this._attributeChangedCallbacks) {
      this._attributeChangedCallbacks = this._attributeChangedCallbacks.filter(cb => cb !== fn);
    }
  }

  attributeChangedCallback(name, oldValue, newValue) {
    //
    if (this._attributeChangedCallbacks) {
      for (const cb of this._attributeChangedCallbacks) {
        if (typeof cb === 'function') {
          cb.call(this, name, oldValue, newValue);
        }
      }
    }
    // Для отладки
    // console.log(`Attribute ${name} has changed from ${oldValue} to ${newValue}.`);
  }
}

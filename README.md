# Pureper (личный)

Vanilla SPA (Web Components). Нужные шпаргалки ниже.

## Запуск
```bash
npm start   # порт 3000
```

## Добавить страницу
```js
let foo = new Page('./pages/FooPage.html', pageHolder);
window.ROUTES['/foo'] = foo; // до подключения spa-router.js
// ссылка: <a href="/foo" data-link>Foo</a>
```

## Добавить компонент
`MyBox.html`, `MyBox.html.css`, `MyBox.html.js`:
```js
import Component from '../src/foundation/Component.js';
class MyBox extends Component { constructor(){ super('./components/MyBox.html'); } init(){} }
customElements.define('my-box', MyBox);
```

## Router
`window.RouterConfig`: BASE_PATH / ASSET_PATH / IS_GITHUB_PAGES. Не трогать history напрямую.

## Theme
`initThemeCssVariables()` один раз. Палитры см. `theme/ColorPalettes.js`.

## Напоминания
- Всегда `data-link` для внутренних ссылок.
- Пути строить через `RouterConfig.ASSET_PATH`.
- Логику пути держать в `spa-router.js`.

## TODO
 - Всё
END

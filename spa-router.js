
// SPA Router for Pureper (vanilla JS)
// Now uses Page class for page loading and script execution

// Определяем среду и тип роутинга
const IS_GITHUB_PAGES = window.location.hostname.includes('github.io');
const BASE_PATH = IS_GITHUB_PAGES ? '/Pureper' : '';
const USE_HASH_ROUTING = !IS_GITHUB_PAGES; // Используем хеш-роутинг в локальной среде

function normalizePath(path) {
  // Убираем базовый путь для внутренней маршрутизации
  if (BASE_PATH && path.startsWith(BASE_PATH)) {
    path = path.substring(BASE_PATH.length);
  }
  return path || '/';
}

function getCurrentPath() {
  if (USE_HASH_ROUTING) {
    // В локальной среде читаем путь из хеша
    return window.location.hash.slice(1) || '/';
  } else {
    // На GitHub Pages используем обычный pathname
    return normalizePath(window.location.pathname);
  }
}

function getPage(path) {
  const routes = window.ROUTES;
  
  // Проверяем точное совпадение маршрута
  if (routes[path]) {
    return routes[path];
  }
  
  // Если маршрут не найден, показываем главную страницу
  console.warn(`Route "${path}" not found, redirecting to home`);
  return routes['/'];
}

function navigate(path) {
  if (USE_HASH_ROUTING) {
    // В локальной среде используем хеш
    window.location.hash = path;
  } else {
    // На GitHub Pages используем history API
    const fullPath = BASE_PATH + path;
    if (location.pathname !== fullPath) {
      history.pushState({}, '', fullPath);
      loadPage(path);
    }
  }
}

async function loadPage(path) {
  const app = document.getElementById('app');
  const page = getPage(path);
  await page.preLoadJS(app);
  await page.render(app);
  await page.postLoadJS(app);
  window.scrollTo(0, 0);
}

// Обработчики событий
if (USE_HASH_ROUTING) {
  // В локальной среде слушаем изменения хеша
  window.addEventListener('hashchange', () => {
    const currentPath = getCurrentPath();
    loadPage(currentPath);
  });
} else {
  // На GitHub Pages слушаем popstate
  window.addEventListener('popstate', () => {
    const currentPath = getCurrentPath();
    loadPage(currentPath);
  });
}

document.addEventListener('click', e => {
  const link = e.target.closest('a[data-link]');
  if (link) {
    e.preventDefault();
    navigate(link.getAttribute('href'));
  }
});

// Initial load
window.addEventListener('DOMContentLoaded', () => {
  // Добавляем отладочную информацию
  console.log('Router: DOMContentLoaded');
  console.log('Router: hostname =', window.location.hostname);
  console.log('Router: IS_GITHUB_PAGES =', IS_GITHUB_PAGES);
  console.log('Router: USE_HASH_ROUTING =', USE_HASH_ROUTING);
  console.log('Router: BASE_PATH =', BASE_PATH);
  
  const currentPath = getCurrentPath();
  console.log('Router: current path =', currentPath);
  
  const routes = window.ROUTES;
  console.log('Router: available routes =', Object.keys(routes));
  
  if (!routes[currentPath] && currentPath !== '/') {
    // Если маршрут не найден и это не главная страница,
    // перенаправляем на главную
    console.warn(`Unknown route "${currentPath}", redirecting to home`);
    navigate('/');
  } else {
    console.log('Router: loading page for path =', currentPath);
    loadPage(currentPath);
  }
});

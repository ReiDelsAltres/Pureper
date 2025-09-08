
// SPA Router for Pureper (vanilla JS)
// Now uses Page class for page loading and script execution

// Определяем среду и тип роутинга
const IS_GITHUB_PAGES = window.location.hostname.includes('github.io');
const BASE_PATH = IS_GITHUB_PAGES ? '/Pureper' : '';
const USE_HASH_ROUTING = false; // Всегда используем обычную маршрутизацию

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
    // Используем обычный pathname
    return normalizePath(window.location.pathname);
  }
}

function getPage(path) {
  const routes = window.ROUTES;
  
  // Проверяем, что routes определен
  if (!routes) {
    console.error('Routes not defined');
    return null;
  }
  
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
    // Используем history API
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
  
  if (!page) {
    console.error('Page not found for path:', path);
    return;
  }
  
  try {
    await page.preLoadJS(app);
    await page.render(app);
    await page.postLoadJS(app);
    window.scrollTo(0, 0);
  } catch (error) {
    console.error('Error loading page:', error);
  }
}

// Обработчики событий
if (USE_HASH_ROUTING) {
  // В локальной среде слушаем изменения хеша
  window.addEventListener('hashchange', () => {
    const currentPath = getCurrentPath();
    loadPage(currentPath);
  });
} else {
  // Слушаем popstate для обычной маршрутизации
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
  console.log('Router: location.pathname =', window.location.pathname);
  console.log('Router: location.search =', window.location.search);
  
  const currentPath = getCurrentPath();
  console.log('Router: current path =', currentPath);
  
  // Ждем, пока ROUTES будет определен
  const checkRoutes = () => {
    const routes = window.ROUTES;
    if (routes) {
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
    } else {
      console.log('Router: waiting for ROUTES to be defined...');
      setTimeout(checkRoutes, 10);
    }
  };
  
  checkRoutes();
});

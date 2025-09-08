
// SPA Router for Pureper (vanilla JS)
// Now uses Page class for page loading and script execution


function getPage(path) {
  const routes = window.ROUTES;
  return routes[path] || routes['/'];
}

function navigate(path) {
  if (location.pathname !== path) {
    history.pushState({}, '', path);
    loadPage(path);
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

window.addEventListener('popstate', () => loadPage(location.pathname));

document.addEventListener('click', e => {
  const link = e.target.closest('a[data-link]');
  if (link) {
    e.preventDefault();
    navigate(link.getAttribute('href'));
  }
});

// Initial load
window.addEventListener('DOMContentLoaded', () => {
  loadPage(location.pathname);
});

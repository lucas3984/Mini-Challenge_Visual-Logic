import { Router } from './core/router.js';
import { setAppRouter } from './core/router-state.js';
import { render as renderHome } from './pages/home.js';
import { render as renderSnake } from './pages/snake.js';
import { render as renderLevelSelector } from './pages/level-selector.js';
import { TopAppBar } from './components/top-app-bar.js';
import { BottomNav } from './components/bottom-nav.js';

const mountEl = document.getElementById('app');
if (!mountEl) {
  throw new Error('Missing #app element for SPA mounting');
}

/*
 * Semantic SPA shell — three persistent zones:
 *   app-header → TopAppBar (branding, dark mode, profile)
 *   page-content → router target (only inner page content is swapped)
 *   app-footer → BottomNav (site navigation)
 *
 * TopAppBar and BottomNav are mounted once and survive route transitions.
 * Pages no longer create their own TopAppBar; the shell provides it.
 */
const appHeader = document.createElement('header');
appHeader.id = 'app-header';
mountEl.appendChild(appHeader);

const pageContainer = document.createElement('main');
pageContainer.id = 'page-content';
mountEl.appendChild(pageContainer);

const appFooter = document.createElement('footer');
appFooter.id = 'app-footer';
mountEl.appendChild(appFooter);

const bottomNav = new BottomNav();
appFooter.appendChild(bottomNav.render());

/*
 * Snake pages create their own TopAppBar (not yet refactored).
 * Hide the shell header on those routes so only one TopAppBar is visible.
 */
function isSnakeRoute(hash) {
  return /^#\/levels\/snake/.test(hash);
}

let topAppBar = new TopAppBar();
appHeader.appendChild(topAppBar.render());

/* Router drives the SPA — hash-based routing maps each path to a page render */
const router = new Router(pageContainer);
setAppRouter(router);

/*
 * Route table: home → /, level selector → /levels (with optional :gameId),
 * snake game → /levels/snake/:levelId.
 */
router.addRoute('/', renderHome);
router.addRoute('/levels', () => renderLevelSelector({ gameId: 'snake' }));
router.addRoute('/levels/:gameId', (params) => renderLevelSelector(params));
router.addRoute('/levels/snake/:levelId', (params) => renderSnake({
  levelId: params.levelId
}));

/*
 * On every route change: slide the BottomNav indicator and toggle shell
 * header visibility for snake routes (which provide their own TopAppBar).
 */
router.onRouteChange = (hash) => {
  bottomNav.setActiveIndex(BottomNav.getActiveIndex(hash));
  appHeader.hidden = isSnakeRoute(hash);
};

/*
 * Prevent a paint-frame flash when the initial URL is a snake route.
 * Without this, both the shell TopAppBar and the snake page's own TopAppBar
 * would be visible for one frame before onRouteChange hides the shell.
 */
appHeader.hidden = isSnakeRoute(location.hash);

/*
 * TopAppBar is persistent — when the active profile changes, re-render it
 * so the username pill reflects the new profile. Re-check visibility in case
 * the route changed in the meantime.
 */
window.addEventListener('profile-changed', () => {
  appHeader.innerHTML = '';
  topAppBar = new TopAppBar();
  appHeader.appendChild(topAppBar.render());
  appHeader.hidden = isSnakeRoute(location.hash);
  router.refresh();
});

/* Start listening to hash changes and render the initial route */
router.start();

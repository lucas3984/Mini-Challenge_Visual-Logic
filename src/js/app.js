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

const topAppBar = new TopAppBar();
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
 * On every route change: slide the BottomNav indicator to the correct tab.
 */
router.onRouteChange = (hash) => {
  bottomNav.setActiveIndex(BottomNav.getActiveIndex(hash));
};

/*
 * TopAppBar is persistent — when the active profile changes, re-render it
 * so the username pill reflects the new profile.
 */
window.addEventListener('profile-changed', () => {
  appHeader.innerHTML = '';
  appHeader.appendChild(new TopAppBar().render());
  router.refresh();
});

/* Start listening to hash changes and render the initial route */
router.start();

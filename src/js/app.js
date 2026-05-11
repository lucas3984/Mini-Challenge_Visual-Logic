/**
 * Main application entry point.
 *
 * Imports the theme manager (side-effect: applies data-theme attribute on load),
 * assembles the SPA shell (TopAppBar + BottomNav + router), and wires
 * persistent UI components that survive route transitions.
 */
import { Router } from './core/router.js';
import { setAppRouter } from './core/router-state.js';
import { render as renderHome } from './pages/home.js';
import { render as renderSnake } from './pages/snake.js';
import { render as renderLevelSelector } from './pages/level-selector.js';
import { TopAppBar } from './components/top-app-bar.js';
import { render as renderCreator } from './pages/creator.js';
import { render as renderCreatorTest } from './pages/creator-test.js';
import { BottomNav } from './components/bottom-nav.js';
import './core/theme.js';

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
router.addRoute('/creator', renderCreator);
router.addRoute('/creator/test', renderCreatorTest);
router.addRoute('/levels/snake/:levelId', (params) => renderSnake({
  levelId: params.levelId
}));
router.addRoute('/levels/:gameId/custom/:levelId', (params) => renderSnake({
  ...params,
  custom: 'true'
}));

/*
 * On every route change: slide the BottomNav indicator to the correct tab.
 */
router.onRouteChange = (hash) => {
  bottomNav.setActiveIndex(BottomNav.getActiveIndex(hash));
  bottomNav.updateGameLink();

  const main = document.querySelector('main');
  if (main) {
    main.setAttribute('tabindex', '-1');
    main.focus({ preventScroll: true });
  }
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

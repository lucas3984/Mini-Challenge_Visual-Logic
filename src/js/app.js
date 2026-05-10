import { Router } from './core/router.js';
import { setAppRouter } from './core/router-state.js';
import { render as renderHome } from './pages/home.js';
import { render as renderSnake } from './pages/snake.js';
import { render as renderLevelSelector } from './pages/level-selector.js';
import { render as renderCreator } from './pages/creator.js';
import { BottomNav } from './components/bottom-nav.js';

/*
 * Guarantee the SPA mount point exists — without it the whole UI is a blank page,
 * so fail early with a clear message instead of silent nothingness.
 */
const mountEl = document.getElementById('app');
if (!mountEl) {
  throw new Error('Missing #app element for SPA mounting');
}

/*
 * Dedicated container for page content so the BottomNav (mounted on mountEl,
 * outside this container) persists across SPA navigations while only the
 * inner content is swapped on route change.
 */
const pageContainer = document.createElement('div');
pageContainer.id = 'page-content';
mountEl.appendChild(pageContainer);

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
router.addRoute('/levels/snake/:levelId', (params) => renderSnake({
  levelId: params.levelId
}));

/*
 * BottomNav is persistent — mounted outside #page-content so it doesn't get
 * destroyed/recreated on every route change, preserving the continuous
 * indicator-glide CSS transition.
 */
const bottomNav = new BottomNav();
mountEl.appendChild(bottomNav.render());

/*
 * Wire up the onRouteChange callback so the nav indicator slides to the
 * correct position whenever the hash changes.
 */
router.onRouteChange = (hash) => {
  bottomNav.setActiveIndex(BottomNav.getActiveIndex(hash));
};

/* Re-render the current page when the user profile is edited elsewhere */
window.addEventListener('profile-changed', () => {
  router.refresh();
});

/* Start listening to hash changes and render the initial route */
router.start();

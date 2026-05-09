import { Router } from './core/router.js';
import { render as renderHome } from './pages/home.js';
import { render as renderSnake } from './pages/snake.js';
import { render as renderLevelSelector } from './pages/level-selector.js';
import { BottomNav } from './components/bottom-nav.js';

const mountEl = document.getElementById('app');
if (!mountEl) {
  throw new Error('Missing #app element for SPA mounting');
}

const pageContainer = document.createElement('div');
pageContainer.id = 'page-content';
mountEl.appendChild(pageContainer);

const router = new Router(pageContainer);

router.addRoute('/', renderHome);
router.addRoute('/levels', () => renderLevelSelector({ gameId: 'snake' }));
router.addRoute('/levels/:gameId', (params) => renderLevelSelector(params));
router.addRoute('/levels/snake/:levelId', (params) => renderSnake({
  levelId: params.levelId
}));

const bottomNav = new BottomNav();
mountEl.appendChild(bottomNav.render());

router.onRouteChange = (hash) => {
  bottomNav.setActiveIndex(BottomNav.getActiveIndex(hash));
};

window.addEventListener('profile-changed', () => {
  router.refresh();
});

router.start();

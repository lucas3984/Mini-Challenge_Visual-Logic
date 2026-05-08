/**
 * Application entry point.
 * Wires the hash-based Router to page render functions and bootstraps the SPA.
 * The <div id="app"> from index.html serves as the mounting point for all pages.
 */
import { Router } from './core/router.js';
import { render as renderHome } from './pages/home.js';
import { render as renderSnake } from './pages/snake.js';
import { render as renderLevelSelector } from './pages/level-selector.js';

const mountEl = document.getElementById('app');
if (!mountEl) {
  throw new Error('Missing #app element for SPA mounting');
}

const router = new Router(mountEl);

router.addRoute('/', renderHome);
// SPA route definitions for game selection and level browsing
router.addRoute('/levels', () => renderLevelSelector({ gameId: 'snake' }));
router.addRoute('/levels/:gameId', (params) => renderLevelSelector(params));
// Snake game uses explicit route under /levels namespace for consistent URL hierarchy
router.addRoute('/levels/snake/:levelId', (params) => renderSnake({
  levelId: params.levelId
}));

router.start();

/**
 * Application entry point.
 * Wires the hash-based Router to page render functions and bootstraps the SPA.
 * The <div id="app"> from index.html serves as the mounting point for all pages.
 */
import { Router } from './core/router.js';
import { render as renderHome } from './pages/home.js';
import { render as renderSnake } from './pages/snake.js';
// TODO: import { render as renderLevels } from './pages/levels.js'; — add when levels page is ready

const mountEl = document.getElementById('app');
if (!mountEl) {
  throw new Error('Missing #app element for SPA mounting');
}

const router = new Router(mountEl);

router.addRoute('/', renderHome);
// TODO: router.addRoute('/levels', renderLevels); — uncomment when levels page is added
router.addRoute('/snake', renderSnake);
router.addRoute('/snake/:level', (params) => renderSnake(params));

router.start();

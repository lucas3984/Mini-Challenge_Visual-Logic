/**
 * Application entry point.
 * Wires the hash-based Router to page render functions and bootstraps the SPA.
 * A single &lt;main&gt; element serves as the mounting point for all pages.
 */
import { Router } from './core/router.js';
import { render as renderSnake } from './pages/snake.js';
import { render as renderHub } from './pages/hub.js';

const mainEl = document.getElementById('main');
// Fail fast if the mounting element is missing — the app cannot function without it
if (!mainEl) {
  throw new Error('Missing <main> element for SPA mounting');
}

const router = new Router(mainEl);

router.addRoute('/', renderHub);
router.addRoute('/snake', renderSnake);
// :level captures a numeric level ID for the snake game page
router.addRoute('/snake/:level', (params) => renderSnake(params));

router.start();

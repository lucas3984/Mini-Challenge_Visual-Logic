import { render } from './pages/home.js';

/*
 * DOMContentLoaded ensures the DOM tree is fully built before we query #app.
 * The entry point delegates to the home page renderer (SPA routing convention:
 * one file per page, each exporting render(): HTMLElement).
 */
document.addEventListener('DOMContentLoaded', () => {
  const app = document.getElementById('app');
  const homePage = render();
  app.appendChild(homePage);
});
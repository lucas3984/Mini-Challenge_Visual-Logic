import { render } from './pages/home.js';

document.addEventListener('DOMContentLoaded', () => {
  const app = document.getElementById('app');
  const homePage = render();
  app.appendChild(homePage);
});
import { Component } from './base.js';

/*
 * Fixed top bar with app branding and dark-mode toggle.
 * The <header> semantic tag identifies the page banner region for
 * accessibility tools. Dark mode is toggled via a CSS class on <html>
 * so all CSS variable overrides cascade reactively across the page.
 */
export class TopAppBar extends Component {
  render() {
    const header = document.createElement('header');
    header.className = 'top-app-bar';
    /*
     * aria-label on the icon-only toggle button is mandatory — screen
     * readers have no other way to identify its purpose.
     */
    header.innerHTML = `
      <div class="top-app-bar__brand">
        <div class="top-app-bar__logo">
          <span class="material-symbols-outlined top-app-bar__icon">extension</span>
        </div>
        <span class="top-app-bar__title">LogicForge</span>
      </div>
      <div class="top-app-bar__actions">
        <button id="darkModeToggle" class="top-app-bar__btn" aria-label="Alternar modo escuro">
          <span class="material-symbols-outlined top-app-bar__btn-icon">dark_mode</span>
        </button>
        <div class="top-app-bar__user">
          <span class="material-symbols-outlined top-app-bar__user-icon">account_circle</span>
          Testador
        </div>
      </div>
    `;

    /*
     * Dark mode logic is a private method — internal concern, no external
     * code should call it directly. Toggling the class on the root element
     * triggers CSS variable re-evaluation across the entire page.
     */
    this.addListener(header.querySelector('#darkModeToggle'), 'click', this.#handleDarkModeToggle);

    return header;
  }

  #handleDarkModeToggle() {
    const html = document.documentElement;
    const isDark = html.classList.contains('dark');
    const btn = document.getElementById('darkModeToggle');

    if (isDark) {
      html.classList.remove('dark');
      btn.innerHTML = '<span class="material-symbols-outlined top-app-bar__btn-icon">light_mode</span>';
    } else {
      html.classList.add('dark');
      btn.innerHTML = '<span class="material-symbols-outlined top-app-bar__btn-icon">dark_mode</span>';
    }
  }
}
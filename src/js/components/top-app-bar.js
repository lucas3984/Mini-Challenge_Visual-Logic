import { Component } from './base.js';

export class TopAppBar extends Component {
  render() {
    const header = document.createElement('header');
    header.className = 'top-app-bar';
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
        </div>
      </div>
    `;

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
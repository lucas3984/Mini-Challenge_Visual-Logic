import { Component } from './base.js';

/*
 * Fixed bottom navigation bar for the home screen.
 * Default items provide a sensible fallback when no config is passed;
 * callers can override via constructor to customize navigation structure.
 */
export class BottomNav extends Component {
  #items = [];
  #activeIndex = 0;

  constructor(items = [], activeIndex = 0) {
    super();
    this.#items = items.length > 0 ? items : [
      { id: 'home', label: 'Início', icon: 'home', href: '#' },
      { id: 'map', label: 'Mapa', icon: 'map', href: '#' },
      { id: 'stats', label: 'Estatísticas', icon: 'leaderboard', href: '#' },
      { id: 'store', label: 'Loja', icon: 'shopping_bag', href: '#' }
    ];
    this.#activeIndex = activeIndex;
  }

  render() {
    const nav = document.createElement('nav');
    nav.className = 'bottom-nav';
    /*
     * aria-label identifies the navigation landmark for screen readers.
     * aria-current="page" on the active item tells assistive tech which
     * section the user is currently viewing.
     */
    nav.setAttribute('aria-label', 'Main navigation');

    /*
     * InnerHTML with map/join builds all nav items in a single DOM write
     * to avoid layout thrashing from multiple appendChild calls.
     * Material Symbols use the FILL axis to distinguish active (filled)
     * from inactive (outlined) icons — a single-icon-font approach that
     * avoids toggling between separate icon elements.
     */
    nav.innerHTML = this.#items.map((item, index) => {
      const isActive = index === this.#activeIndex;
      const iconFilled = isActive ? "style='font-variation-settings: \"FILL\" 1'" : '';
      return `
        <a class="bottom-nav__item bottom-nav__item--${isActive ? 'active' : 'inactive'}"
           href="${item.href}"
           aria-current="${isActive ? 'page' : 'false'}"
           data-id="${item.id}">
          <span class="material-symbols-outlined" ${iconFilled}>${item.icon}</span>
          <span class="bottom-nav__label">${item.label}</span>
        </a>
      `;
    }).join('');

    return nav;
  }
}
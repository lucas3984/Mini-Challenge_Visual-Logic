import { Component } from './base.js';

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
    nav.setAttribute('aria-label', 'Main navigation');

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
import { Component } from './base.js';

export class BottomNav extends Component {
  #items = [];
  #activeIndex = 0;
  #el = null;
  #indicatorEl = null;
  #initialized = false;
  #resizeRaf = null;

  constructor(items, activeIndex) {
    super();
    this.#items = items && items.length > 0 ? items : [
      {
        id: 'home',
        label: 'HOME',
        hash: '#/',
        icon: `<svg class="nav-icon" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M2.5 7.5L10 1.66667L17.5 7.5V16.6667C17.5 17.5871 16.7538 18.3333 15.8333 18.3333H4.16667C3.24619 18.3333 2.5 17.5871 2.5 16.6667V7.5" stroke="currentColor" stroke-width="2.08333" stroke-linecap="round" stroke-linejoin="round"/><rect x="7.5" y="10" width="5" height="8.33333" stroke="currentColor" stroke-width="2.08333" stroke-linecap="round" stroke-linejoin="round"/></svg>`
      },
      {
        id: 'fases',
        label: 'FASES',
        hash: '#/levels',
        icon: `<svg class="nav-icon" viewBox="0 -960 960 960" xmlns="http://www.w3.org/2000/svg"><path d="M760-120q-39 0-70-22.5T647-200H440q-66 0-113-47t-47-113q0-66 47-113t113-47h80q33 0 56.5-23.5T600-600q0-33-23.5-56.5T520-680H313q-13 35-43.5 57.5T200-600q-50 0-85-35t-35-85q0-50 35-85t85-35q39 0 69.5 22.5T313-760h207q66 0 113 47t47 113q0 66-47 113t-113 47h-80q-33 0-56.5 23.5T360-360q0 33 23.5 56.5T440-280h207q13-35 43.5-57.5T760-360q50 0 85 35t35 85q0 50-35 85t-85 35ZM228.5-691.5Q240-703 240-720t-11.5-28.5Q217-760 200-760t-28.5 11.5Q160-737 160-720t11.5 28.5Q183-680 200-680t28.5-11.5Z" fill="currentColor"/></svg>`
      },
      {
        id: 'game',
        label: 'GAME',
        hash: '#/levels/snake/1',
        icon: `<svg class="nav-icon" viewBox="0 -960 960 960" xmlns="http://www.w3.org/2000/svg"><path d="m384-336 56-57-87-87 87-87-56-57-144 144 144 144Zm192 0 144-144-144-144-56 57 87 87-87 87 56 57ZM200-120q-33 0-56.5-23.5T120-200v-560q0-33 23.5-56.5T200-840h560q33 0 56.5 23.5T840-760v560q0 33-23.5 56.5T760-120H200Zm0-80h560v-560H200v560Zm0-560v560-560Z" fill="currentColor"/></svg>`
      },
      {
        id: 'ranking',
        label: 'RANKING',
        hash: '#/ranking',
        icon: `<svg class="nav-icon" viewBox="0 -960 960 960" xmlns="http://www.w3.org/2000/svg"><path d="M607.5-212.5Q660-265 660-340t-52.5-127.5Q555-520 480-520t-127.5 52.5Q300-415 300-340t52.5 127.5Q405-160 480-160t127.5-52.5ZM363-572q20-11 42.5-17.5T451-598L350-800H250l113 228Zm234 0 114-228H610l-85 170 19 38q14 4 27 8.5t26 11.5ZM256-208q-17-29-26.5-62.5T220-340q0-36 9.5-69.5T256-472q-42 14-69 49.5T160-340q0 47 27 82.5t69 49.5Zm448 0q42-14 69-49.5t27-82.5q0-47-27-82.5T704-472q17 29 26.5 62.5T740-340q0 36-9.5 69.5T704-208ZM403.5-91.5Q367-103 336-123q-9 2-18 2.5t-19 .5q-91 0-155-64T80-339q0-87 58-149t143-69L120-880h280l80 160 80-160h280L680-559q85 8 142.5 70T880-340q0 92-64 156t-156 64q-9 0-18.5-.5T623-123q-31 20-67 31.5T480-80q-40 0-76.5-11.5ZM480-340ZM363-572 250-800l113 228Zm234 0 114-228-114 228ZM406-230l28-91-74-53h91l29-96 29 96h91l-74 53 28 91-74-56-74 56Z" fill="currentColor"/></svg>`
      }
    ];
    this.#activeIndex = activeIndex ?? 0;
  }

  static getActiveIndex(hash) {
    const path = hash.replace(/^#/, '') || '/';
    if (path === '/') return 0;
    if (path.match(/^\/levels\/snake\/\d+$/)) return 2;
    if (path.startsWith('/levels')) return 1;
    if (path.startsWith('/ranking')) return 3;
    return 0;
  }

  render() {
    const nav = document.createElement('nav');
    nav.className = 'bottom-nav';
    nav.setAttribute('aria-label', 'Main navigation');

    const indicator = document.createElement('div');
    indicator.className = 'bottom-nav__indicator';
    nav.appendChild(indicator);
    this.#indicatorEl = indicator;

    nav.insertAdjacentHTML('beforeend', this.#items.map((item, index) => {
      const isActive = index === this.#activeIndex;
      return `
        <a class="bottom-nav__item bottom-nav__item--${isActive ? 'active' : 'inactive'}"
           href="${item.hash}"
           aria-current="${isActive ? 'page' : 'false'}"
           data-id="${item.id}">
          <span class="bottom-nav__icon-wrapper">${item.icon}</span>
          <span class="bottom-nav__label">${item.label}</span>
        </a>
      `;
    }).join(''));

    this.#el = nav;

    this.addListener(window, 'resize', () => this.#handleResize());

    return nav;
  }

  setActiveIndex(index) {
    if (index === this.#activeIndex && this.#initialized) return;
    if (index < 0 || index >= this.#items.length) return;

    const items = this.#el?.querySelectorAll('.bottom-nav__item');
    if (!items || items.length !== this.#items.length) return;

    const prevItem = items[this.#activeIndex];
    if (prevItem) {
      prevItem.classList.replace('bottom-nav__item--active', 'bottom-nav__item--inactive');
      prevItem.setAttribute('aria-current', 'false');
    }

    const nextItem = items[index];
    if (nextItem) {
      nextItem.classList.replace('bottom-nav__item--inactive', 'bottom-nav__item--active');
      nextItem.setAttribute('aria-current', 'page');
    }

    this.#activeIndex = index;
    this.#positionIndicator();
  }

  #positionIndicator() {
    if (!this.#el || !this.#indicatorEl) return;

    const activeItem = this.#el.querySelector('.bottom-nav__item--active');
    if (!activeItem) return;

    const wrapper = activeItem.querySelector('.bottom-nav__icon-wrapper');
    if (!wrapper) return;

    const navRect = this.#el.getBoundingClientRect();
    const wrapperRect = wrapper.getBoundingClientRect();

    const x = wrapperRect.left - navRect.left;
    const y = wrapperRect.top - navRect.top;
    const width = wrapperRect.width;
    const height = wrapperRect.height;

    if (!this.#initialized) {
      this.#indicatorEl.classList.add('bottom-nav__indicator--no-transition');
    }

    this.#el.style.setProperty('--indicator-x', `${x}px`);
    this.#el.style.setProperty('--indicator-y', `${y}px`);
    this.#el.style.setProperty('--indicator-width', `${width}px`);
    this.#el.style.setProperty('--indicator-height', `${height}px`);

    if (!this.#initialized) {
      void this.#indicatorEl.offsetHeight;
      this.#indicatorEl.classList.remove('bottom-nav__indicator--no-transition');
      this.#initialized = true;
    }
  }

  #handleResize() {
    if (this.#resizeRaf) return;
    this.#resizeRaf = requestAnimationFrame(() => {
      this.#resizeRaf = null;
      this.#positionIndicator();
    });
  }

  onUnmount() {
    if (this.#resizeRaf) {
      cancelAnimationFrame(this.#resizeRaf);
      this.#resizeRaf = null;
    }
    this.#el = null;
    this.#indicatorEl = null;
  }
}

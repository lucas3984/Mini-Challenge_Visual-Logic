import { Component } from './base.js';
import { getActiveProfile } from '../core/profile.js';
import { getGameCurrentLevel, getLastGameType } from '../core/profile-data.js';
import { getCustomLevelData } from '../core/custom-level-storage.js';

export class BottomNav extends Component {
  #items = [];
  #activeIndex = 0;
  #el = null;
  #indicatorEl = null;
  #initialized = false;
  #resizeRaf = null;

  /*
   * @param {Array<{id:string, label:string, hash:string, icon:string}>} [items]
   *   Navigation items. Falls back to the default four (HOME, FASES, GAME, RANKING)
   *   when omitted or empty.
   * @param {number} [activeIndex=0] — Zero-based index of the initially active item.
   *
   * Default items provide our four primary destinations. The constructor stores
   * them so the nav can be re-rendered without re-declaring the config.
   */
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
        id: 'creator',
        label: 'CRIAR',
        hash: '#/creator',
        icon: `<svg class="nav-icon" viewBox="0 -960 960 960" xmlns="http://www.w3.org/2000/svg"><path d="M200-120q-33 0-56.5-23.5T120-200v-560q0-33 23.5-56.5T200-840h357l-80 80H200v560h560v-278l80-80v358q0 33-23.5 56.5T760-120H200Zm120-160v-170l364-364q11-11 28-11t28 11l74 74q11 11 11 28t-11 28L450-280H320Zm80-80h56l232-232-28-28-28-28-232 232v56Zm268-268-56-56 56 56Zm-84 28-28-28 56 56-28-28Z" fill="currentColor"/></svg>`
      }
    ];
    this.#activeIndex = activeIndex ?? 0;
  }

  /*
   * Map a hash fragment to the index it represents.
   * Used by the onRouteChange callback in app.js to sync the indicator.
   * Falls back to 0 (home) for unrecognised or empty paths.
   *
   * @param {string} hash — e.g. '#/levels/snake/3'
   * @returns {number} — index in the #items array
   */
  static getActiveIndex(hash) {
    const path = hash.replace(/^#/, '') || '/';
    if (path === '/') return 0;
    if (path.match(/^\/levels\/snake\/\d+$/) || path.match(/^\/levels\/snake\/custom\/\d+$/)) return 2;
    if (path.startsWith('/levels')) return 1;
    if (path.startsWith('/creator')) return 3;
    return 0;
  }

  /*
   * Build the nav DOM: indicator element followed by anchor items.
   * Uses insertAdjacentHTML so existing child references (the indicator) are
   * preserved — innerHTML += would destroy and recreate them.
   *
   * @returns {HTMLElement} — the nav element
   */
  render() {
    const profile = getActiveProfile();
    let gameHash;
    if (profile) {
      const lastType = getLastGameType(profile, 'snake');
      if (lastType === 'custom') {
        const customData = getCustomLevelData(profile);
        gameHash = customData.currentLevel
          ? `#/levels/snake/custom/${customData.currentLevel}`
          : '#/levels/snake';
      } else {
        const currentLevel = getGameCurrentLevel(profile, 'snake');
        gameHash = `#/levels/snake/${currentLevel + 1}`;
      }
    } else {
      gameHash = '#/levels/snake/1';
    }

    const nav = document.createElement('nav');
    nav.className = 'bottom-nav';
    nav.setAttribute('aria-label', 'Main navigation');

    const indicator = document.createElement('div');
    indicator.className = 'bottom-nav__indicator';
    nav.appendChild(indicator);
    this.#indicatorEl = indicator;

    nav.insertAdjacentHTML('beforeend', this.#items.map((item, index) => {
      const isActive = index === this.#activeIndex;
      const hash = index === 2 ? gameHash : item.hash;
      return `
        <a class="bottom-nav__item bottom-nav__item--${isActive ? 'active' : 'inactive'}"
           href="${hash}"
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

  /*
   * Switch the active nav item and reposition the indicator.
   * Short-circuits if the index hasn't changed (avoids redundant layout work)
   * or is out of range.
   *
   * @param {number} index — target item index
   */
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

  updateGameLink() {
    const profile = getActiveProfile();
    if (!profile) return;
    const items = this.#el?.querySelectorAll('.bottom-nav__item');
    if (!items || items.length < 3) return;

    const lastType = getLastGameType(profile, 'snake');
    let href;
    if (lastType === 'custom') {
      const customData = getCustomLevelData(profile);
      href = customData.currentLevel
        ? `#/levels/snake/custom/${customData.currentLevel}`
        : '#/levels/snake';
    } else {
      const currentLevel = getGameCurrentLevel(profile, 'snake');
      href = `#/levels/snake/${currentLevel + 1}`;
    }
    items[2].setAttribute('href', href);
  }

  /*
   * Read the active item's icon-wrapper bounding rect and set CSS custom
   * properties on the nav element so the indicator pill can position itself
   * via transform/width/height without JS-commanded style recalc.
   *
   * On first call (#initialized = false) we apply a no-transition class to
   * suppress the initial "snap from top-left" animation, force a synchronous
   * style flush (offsetHeight), then remove the class so subsequent calls
   * animate smoothly.
   */
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

  /*
   * RAF-throttled resize handler — avoids layout thrashing by batching all
   * indicator repositioning into the next paint frame.
   */
  #handleResize() {
    if (this.#resizeRaf) return;
    this.#resizeRaf = requestAnimationFrame(() => {
      this.#resizeRaf = null;
      this.#positionIndicator();
    });
  }

  /*
   * Clean up: cancel any pending resize frame and nullify references so the
   * component can be GC'd. Called by the Component base class when the nav
   * is removed from the DOM.
   */
  onUnmount() {
    if (this.#resizeRaf) {
      cancelAnimationFrame(this.#resizeRaf);
      this.#resizeRaf = null;
    }
    this.#el = null;
    this.#indicatorEl = null;
  }
}

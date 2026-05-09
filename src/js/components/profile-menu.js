/**
 * ProfileMenu — floating dropdown / bottom-sheet for profile switching.
 *
 * On desktop: a compact dropdown card anchored below the user area.
 * On mobile: a full-width bottom-sheet that slides up with a backdrop.
 *
 * Extends Component for lifecycle sanity (listener cleanup). The open()
 * / close() methods manage mounting and unmounting to document.body so
 * the menu sits above all page content while avoiding permanent DOM
 * pollution.
 *
 * @extends Component
 */
import { Component } from './base.js';
import { escapeHtml } from '../utils/sanitize.js';
import { getAllProfiles, getActiveProfile } from '../core/profile.js';

export class ProfileMenu extends Component {
  /** @type {HTMLElement|null} Reference to the anchor (user area) element */
  #anchorEl = null;

  /** @type {boolean} Whether the menu is currently open */
  #isOpen = false;

  /** @type {Function|null} Callback invoked when a profile is clicked */
  #onSelect = null;

  /** @type {Function|null} Callback invoked when the "+" button is clicked */
  #onCreate = null;

  /** @type {Function|null} Callback invoked after the menu fully closes */
  #onClose = null;

  /* --- Cached DOM references (cleared in onUnmount) --- */
  /** @type {HTMLElement|null} */
  #menuEl = null;

  /** @type {HTMLElement|null} */
  #backdropEl = null;

  /** @type {HTMLInputElement|null} */
  #searchInputEl = null;

  /** @type {HTMLElement|null} */
  #listEl = null;

  /* --- External (document-level) listener references for manual cleanup --- */
  /** @type {Function|null} */
  #boundClickOutside = null;

  /** @type {Function|null} */
  #boundKeyDown = null;

  /** @type {Function|null} */
  #boundResize = null;

  /**
   * @param {{ onSelect?: (name: string) => void, onCreate?: () => void, onClose?: () => void }} [options]
   */
  constructor({ onSelect, onCreate, onClose } = {}) {
    super();
    this.#onSelect = typeof onSelect === 'function' ? onSelect : null;
    this.#onCreate = typeof onCreate === 'function' ? onCreate : null;
    this.#onClose = typeof onClose === 'function' ? onClose : null;
  }

  /** @returns {boolean} */
  get isOpen() {
    return this.#isOpen;
  }

  /**
   * Builds the menu, positions it, and mounts it to document.body.
   * @param {HTMLElement} anchorEl - The user-area element for positioning.
   */
  open(anchorEl) {
    if (this.#isOpen) return;
    this.#anchorEl = anchorEl;

    // mount() calls render() then appends to document.body
    this.mount(document.body);

    // Trigger the entrance animation in the next frame so the initial
    // "hidden" styles are painted before the class change transitions in.
    requestAnimationFrame(() => {
      this.#menuEl?.classList.add('profile-menu--open');
    });

    this.#positionMenu();
    this.#setupExternalListeners();
    this.#isOpen = true;
  }

  /**
   * Animates out, cleans up listeners, and unmounts the menu.
   */
  close() {
    if (!this.#isOpen) return;
    this.#isOpen = false;

    // Remove document-level listeners immediately so no stale handler
    // fires while the close animation runs.
    this.#removeExternalListeners();

    const el = this.#menuEl;
    const finish = () => {
      // Double-check that this menu instance is still the one closing
      // (prevent race from rapid open/close cycles).
      if (this.#menuEl === el) {
        this.unmount();
        if (this.#onClose) this.#onClose();
      }
    };

    if (el) {
      el.classList.remove('profile-menu--open');
      el.classList.add('profile-menu--closing');

      // Wait for the exit animation then unmount. A fallback timeout
      // guards against the unlikely case that animationend never fires.
      el.addEventListener('animationend', finish, { once: true });
      setTimeout(finish, 300);
    } else {
      this.unmount();
      if (this.#onClose) this.#onClose();
    }
  }

  /**
   * Toggles the menu open/closed.
   * @param {HTMLElement} anchorEl
   */
  toggle(anchorEl) {
    if (this.#isOpen) {
      this.close();
    } else {
      this.open(anchorEl);
    }
  }

  /**
   * Builds the entire menu DOM tree. Called by mount().
   * @returns {HTMLElement}
   */
  render() {
    const profiles = getAllProfiles();
    const activeProfile = getActiveProfile();

    // --- Root wrapper ---
    const wrapper = document.createElement('div');
    wrapper.className = 'profile-menu';
    wrapper.setAttribute('role', 'dialog');
    wrapper.setAttribute('aria-label', 'Selecionar perfil');
    wrapper.setAttribute('aria-modal', 'true');
    this.#menuEl = wrapper;

    // --- Backdrop (visible on mobile) ---
    const backdrop = document.createElement('div');
    backdrop.className = 'profile-menu__backdrop';
    backdrop.setAttribute('aria-hidden', 'true');
    wrapper.appendChild(backdrop);
    this.#backdropEl = backdrop;

    // backdrop click = close
    this.addListener(backdrop, 'click', () => this.close());

    // --- Header with search ---
    const header = document.createElement('div');
    header.className = 'profile-menu__header';
    header.innerHTML = `
      <span class="material-symbols-outlined profile-menu__search-icon">search</span>
      <input class="profile-menu__search"
             type="text"
             placeholder="Pesquisar perfil..."
             aria-label="Pesquisar perfis"
             autocomplete="off"
             autocapitalize="off"
             spellcheck="false">
    `;
    wrapper.appendChild(header);
    this.#searchInputEl = header.querySelector('.profile-menu__search');

    this.addListener(this.#searchInputEl, 'input', () => this.#filterList());

    // --- Scrollable profile list ---
    const list = document.createElement('div');
    list.className = 'profile-menu__list';
    list.setAttribute('role', 'listbox');
    list.setAttribute('aria-label', 'Perfis disponíveis');
    wrapper.appendChild(list);
    this.#listEl = list;

    this.#renderList(profiles, activeProfile);

    // Delegate click on list items
    this.addListener(list, 'click', (e) => {
      const item = e.target.closest('.profile-menu__item');
      if (!item) return;
      const name = item.dataset.profileName;
      if (name && this.#onSelect) {
        this.#onSelect(name);
      }
    });

    // --- "+" Create button ---
    const actions = document.createElement('div');
    actions.className = 'profile-menu__actions';
    actions.innerHTML = `
      <button class="profile-menu__add-btn" type="button" aria-label="Criar novo perfil">
        <span class="material-symbols-outlined">add</span>
        Criar novo perfil
      </button>
    `;
    wrapper.appendChild(actions);

    this.addListener(
      actions.querySelector('.profile-menu__add-btn'),
      'click',
      () => {
        if (this.#onCreate) this.#onCreate();
      }
    );

    // Auto-focus the search input after the DOM is inserted.
    requestAnimationFrame(() => this.#searchInputEl?.focus());

    return wrapper;
  }

  // ── Lifecycle ──────────────────────────────────────────────────────────

  onUnmount() {
    // Guard: if close() wasn't called (e.g. forced unmount), clean up
    // external listeners so they don't leak.
    this.#removeExternalListeners();

    this.#menuEl = null;
    this.#backdropEl = null;
    this.#searchInputEl = null;
    this.#listEl = null;
    this.#anchorEl = null;
  }

  // ── Private methods ────────────────────────────────────────────────────

  /**
   * Fills (or refills) the profile list inside the menu.
   * @param {string[]} profiles
   * @param {string|null} activeProfile
   */
  #renderList(profiles, activeProfile) {
    this.#listEl.innerHTML = '';

    if (profiles.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'profile-menu__empty';
      empty.textContent = 'Nenhum perfil encontrado';
      this.#listEl.appendChild(empty);
      return;
    }

    profiles.forEach((name) => {
      const isActive = name === activeProfile;
      const item = document.createElement('div');
      item.className = `profile-menu__item${isActive ? ' profile-menu__item--active' : ''}`;
      item.setAttribute('role', 'option');
      item.setAttribute('aria-selected', String(isActive));
      item.setAttribute('tabindex', '-1');
      item.dataset.profileName = name;

      item.innerHTML = `
        <span class="material-symbols-outlined profile-menu__item-icon">account_circle</span>
        <span class="profile-menu__item-name">${escapeHtml(name)}</span>
        ${isActive ? '<span class="material-symbols-outlined profile-menu__item-check">check</span>' : ''}
      `;

      this.#listEl.appendChild(item);
    });
  }

  /**
   * Filters the profile list based on the search input value.
   */
  #filterList() {
    const query = (this.#searchInputEl?.value || '').toLowerCase().trim();
    const allProfiles = getAllProfiles();
    const activeProfile = getActiveProfile();

    const filtered = query
      ? allProfiles.filter((p) => p.toLowerCase().includes(query))
      : allProfiles;

    this.#renderList(filtered, activeProfile);
  }

  /**
   * Positions the menu based on viewport width.
   * - Mobile (≤768px): bottom-sheet (full-width, bottom-aligned)
   * - Desktop (>768px): compact dropdown anchored near the user element
   */
  #positionMenu() {
    if (!this.#menuEl) return;

    const isMobile = window.innerWidth <= 768;

    // Reset inline styles so the CSS classes take precedence for positioning.
    this.#menuEl.style.top = '';
    this.#menuEl.style.left = '';
    this.#menuEl.style.right = '';
    this.#menuEl.style.bottom = '';

    if (isMobile) {
      // Bottom-sheet: the CSS `position: fixed; bottom: 0; left: 0; right: 0`
      // on .profile-menu handles layout; nothing more needed.
      this.#menuEl.style.bottom = '0';
      this.#menuEl.style.left = '0';
      this.#menuEl.style.right = '0';
      this.#menuEl.style.top = 'auto';
    } else {
      // Dropdown: position below the anchor, right-aligned.
      const rect = this.#anchorEl?.getBoundingClientRect();
      if (!rect) return;

      const spaceBelow = window.innerHeight - rect.bottom;
      const dropdownWidth = 280; // max-width in CSS

      if (spaceBelow < 320) {
        // Not enough room below → open upward.
        this.#menuEl.style.bottom = `${window.innerHeight - rect.top + 8}px`;
        this.#menuEl.style.top = 'auto';
      } else {
        this.#menuEl.style.top = `${rect.bottom + 8}px`;
        this.#menuEl.style.bottom = 'auto';
      }

      // Right-align: the menu's right edge aligns with the anchor's right edge.
      const rightOffset = document.documentElement.clientWidth - rect.right;
      // Clamp so the menu doesn't overflow the left viewport edge.
      const clampedLeft = Math.max(8, rect.right - dropdownWidth);
      this.#menuEl.style.right = `${Math.min(rightOffset, document.documentElement.clientWidth - clampedLeft - dropdownWidth)}px`;
      this.#menuEl.style.left = `${clampedLeft}px`;
    }
  }

  /**
   * Registers document-level listeners that are NOT managed by addListener()
   * (because they target document, not elements inside the menu).
   */
  #setupExternalListeners() {
    // Click-outside: closes the menu when clicking anywhere outside both
    // the menu and the anchor element. Registered in the capture phase so
    // it fires before bubbling handlers could interfere.
    this.#boundClickOutside = (e) => {
      const target = e.target;
      const isMenuClick = this.#menuEl?.contains(target);
      const isAnchorClick = this.#anchorEl?.contains(target);
      if (!isMenuClick && !isAnchorClick) {
        this.close();
      }
    };

    // Delay registration so the click that opened the menu does not
    // immediately trigger the outside handler.
    requestAnimationFrame(() => {
      document.addEventListener('click', this.#boundClickOutside, true);
    });

    // Escape → close and restore focus to the anchor.
    this.#boundKeyDown = (e) => {
      if (e.key === 'Escape') {
        this.close();
        this.#anchorEl?.focus();
      }
    };
    document.addEventListener('keydown', this.#boundKeyDown);

    // Re-position on resize / orientation change.
    this.#boundResize = () => this.#positionMenu();
    window.addEventListener('resize', this.#boundResize);
  }

  /**
   * Removes document-level listeners. Safe to call multiple times.
   */
  #removeExternalListeners() {
    if (this.#boundClickOutside) {
      document.removeEventListener('click', this.#boundClickOutside, true);
      this.#boundClickOutside = null;
    }
    if (this.#boundKeyDown) {
      document.removeEventListener('keydown', this.#boundKeyDown);
      this.#boundKeyDown = null;
    }
    if (this.#boundResize) {
      window.removeEventListener('resize', this.#boundResize);
      this.#boundResize = null;
    }
  }
}

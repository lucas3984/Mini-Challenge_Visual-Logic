/**
 * Fixed top bar with app branding, dark-mode toggle, and profile switcher.
 *
 * Reads the active profile from the profile module and displays the user's
 * name. Clicking the user area opens a ProfileMenu (dropdown / bottom-sheet)
 * that allows switching or creating profiles.
 *
 * @extends Component
 */
import { Component } from './base.js';
import { escapeHtml } from '../utils/sanitize.js';
import { getActiveProfile, setActiveProfile } from '../core/profile.js';
import { ProfileMenu } from './profile-menu.js';
import { ProfileModal } from './profile-modal.js';
import { getTheme, toggleTheme } from '../core/theme.js';

export class TopAppBar extends Component {
  /** @type {ProfileMenu|null} */
  #profileMenu = null;

  /** @type {HTMLElement|null} */
  #userEl = null;

  /** @type {HTMLElement|null} */
  #el = null;

  render() {
    const header = document.createElement('div');
    header.className = 'top-app-bar';

    const activeProfile = getActiveProfile() || 'Visitante';
    const themeIcon = getTheme() === 'dark' ? 'dark_mode' : 'light_mode';
    const themeLabel = getTheme() === 'dark' ? 'Alternar modo claro' : 'Alternar modo escuro';

    header.innerHTML = `
      <div class="top-app-bar__brand">
        <div class="top-app-bar__logo">
          <span class="material-symbols-outlined top-app-bar__icon">extension</span>
        </div>
        <span class="top-app-bar__title">LogicForge</span>
      </div>
      <div class="top-app-bar__actions">
        <button id="darkModeToggle" class="top-app-bar__btn" aria-label="${themeLabel}">
          <span class="material-symbols-outlined top-app-bar__btn-icon">${themeIcon}</span>
        </button>
        <div class="top-app-bar__user"
             tabindex="0"
             role="button"
             aria-haspopup="dialog"
             aria-label="Trocar perfil">
          <span class="material-symbols-outlined top-app-bar__user-icon">account_circle</span>
          <span class="top-app-bar__username">${escapeHtml(activeProfile)}</span>
          <span class="material-symbols-outlined top-app-bar__user-arrow">arrow_drop_down</span>
        </div>
      </div>
    `;

    this.#el = header;
    this.#userEl = header.querySelector('.top-app-bar__user');

    this.addListener(header.querySelector('#darkModeToggle'), 'click', this.#handleDarkModeToggle);

    // Keep icon in sync when theme changes externally (e.g. system preference sync)
    this.addListener(document, 'theme-changed', (e) => {
      const btn = this.#el?.querySelector('#darkModeToggle');
      if (btn) {
        const icon = e.detail.theme === 'dark' ? 'dark_mode' : 'light_mode';
        const label = e.detail.theme === 'dark' ? 'Alternar modo claro' : 'Alternar modo escuro';
        btn.innerHTML = `<span class="material-symbols-outlined top-app-bar__btn-icon">${icon}</span>`;
        btn.setAttribute('aria-label', label);
      }
    });

    // Profile menu toggle
    this.addListener(this.#userEl, 'click', (e) => {
      e.stopPropagation();
      this.#toggleProfileMenu();
    });

    return header;
  }

  // ── Profile menu ─────────────────────────────────────────────────────

  /**
   * Opens or closes the profile selection menu.
   */
  #toggleProfileMenu() {
    if (this.#profileMenu && this.#profileMenu.isOpen) {
      this.#setUserExpanded(false);
      this.#profileMenu.close();
      return;
    }
    this.#setUserExpanded(true);
    this.#openProfileMenu();
  }

  /**
   * Creates (lazily) and opens the ProfileMenu anchored to the user element.
   */
  #openProfileMenu() {
    if (!this.#profileMenu) {
      this.#profileMenu = new ProfileMenu({
        onSelect: (name) => this.#handleProfileSelect(name),
        onCreate: () => this.#handleCreateProfile(),
        onClose: () => this.#setUserExpanded(false),
      });
    }
    this.#profileMenu.open(this.#userEl);
  }

  /**
   * Switches to a different profile and causes the page to re-render.
   * @param {string} name
   */
  #handleProfileSelect(name) {
    setActiveProfile(name);
    this.#setUserExpanded(false);
    this.#profileMenu?.close();
    window.dispatchEvent(new CustomEvent('profile-changed'));
  }

  /**
   * Syncs the aria-expanded attribute on the user button for accessibility
   * and to drive the arrow icon rotation in CSS.
   * @param {boolean} expanded
   */
  #setUserExpanded(expanded) {
    if (this.#userEl) {
      this.#userEl.setAttribute('aria-expanded', String(expanded));
    }
  }

  /**
   * Opens the profile creation modal. After the profile is created and
   * confirmed, activates it and refreshes the page.
   */
  #handleCreateProfile() {
    // Close the menu before opening the modal to keep the UI clean.
    this.#profileMenu?.close();

    const modal = new ProfileModal({
      onSubmit: (name) => {
        // ProfileModal.createProfile() already saved the profile.
        setActiveProfile(name);
        modal.close();
        window.dispatchEvent(new CustomEvent('profile-changed'));
      },
      closable: true,
    });
    modal.mount(document.body);
  }

  // ── Dark mode ────────────────────────────────────────────────────────

  #handleDarkModeToggle() {
    const next = toggleTheme();
    const btn = this.#el?.querySelector('#darkModeToggle');
    if (btn) {
      const icon = next === 'dark' ? 'dark_mode' : 'light_mode';
      const label = next === 'dark' ? 'Alternar modo claro' : 'Alternar modo escuro';
      btn.innerHTML = `<span class="material-symbols-outlined top-app-bar__btn-icon">${icon}</span>`;
      btn.setAttribute('aria-label', label);
    }
  }

  // ── Lifecycle ────────────────────────────────────────────────────────

  onUnmount() {
    if (this.#profileMenu) {
      this.#profileMenu.unmount();
      this.#profileMenu = null;
    }
    this.#userEl = null;
    this.#el = null;
  }
}

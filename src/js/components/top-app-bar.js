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

export class TopAppBar extends Component {
  /** @type {ProfileMenu|null} */
  #profileMenu = null;

  /** @type {HTMLElement|null} */
  #userEl = null;

  render() {
    const header = document.createElement('header');
    header.className = 'top-app-bar';

    const activeProfile = getActiveProfile() || 'Visitante';

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
        <div class="top-app-bar__user"
             tabindex="0"
             role="button"
             aria-haspopup="dialog"
             aria-label="Trocar perfil">
          <span class="material-symbols-outlined top-app-bar__user-icon">account_circle</span>
          <span class="top-app-bar__username top-app-bar__username--desktop">${escapeHtml(activeProfile)}</span>
          <span class="material-symbols-outlined top-app-bar__user-arrow">arrow_drop_down</span>
        </div>
      </div>
    `;

    this.#userEl = header.querySelector('.top-app-bar__user');

    // Dark mode toggle
    this.addListener(header.querySelector('#darkModeToggle'), 'click', this.#handleDarkModeToggle);

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
    const html = document.documentElement;
    const isDark = html.classList.contains('dark');
    const btn = document.getElementById('darkModeToggle');

    if (isDark) {
      html.classList.remove('dark');
      if (btn) {
        btn.innerHTML = '<span class="material-symbols-outlined top-app-bar__btn-icon">light_mode</span>';
      }
    } else {
      html.classList.add('dark');
      if (btn) {
        btn.innerHTML = '<span class="material-symbols-outlined top-app-bar__btn-icon">dark_mode</span>';
      }
    }
  }

  // ── Lifecycle ────────────────────────────────────────────────────────

  onUnmount() {
    if (this.#profileMenu) {
      this.#profileMenu.unmount();
      this.#profileMenu = null;
    }
    this.#userEl = null;
  }
}

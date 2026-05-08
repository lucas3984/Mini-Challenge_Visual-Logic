/**
 * Profile creation modal — full-screen overlay for first-time access.
 *
 * Extends Component for lifecycle and listener cleanup. Renders a dialog
 * with a name input and submit button. On valid submit it creates the
 * profile via the profile module and calls the onSubmit callback with the
 * chosen name. The caller is responsible for unmounting the modal after
 * the callback fires.
 */
import { Component } from './base.js';
import { escapeHtml } from '../utils/sanitize.js';
import { validateProfileName, createProfile } from '../core/profile.js';

export class ProfileModal extends Component {
  /** @type {Function|null} */
  #onSubmit = null;
  /** @type {HTMLInputElement|null} */
  #inputEl = null;
  /** @type {HTMLElement|null} */
  #errorEl = null;
  /** @type {HTMLButtonElement|null} */
  #submitEl = null;
  /** @type {HTMLElement|null} */
  #overlayEl = null;

  /**
   * @param {{ onSubmit?: (name: string) => void }} [options]
   */
  constructor(options = {}) {
    super();
    this.#onSubmit = typeof options.onSubmit === 'function' ? options.onSubmit : null;
  }

  render() {
    const overlay = document.createElement('div');
    overlay.className = 'profile-modal';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'Criar perfil');

    overlay.innerHTML = `
      <div class="profile-modal__card">
        <div class="profile-modal__icon-wrapper">
          <div class="profile-modal__glow"></div>
          <span class="material-symbols-outlined profile-modal__icon" style="font-variation-settings: 'FILL' 1;">assignment_ind</span>
        </div>
        <h1 class="profile-modal__title">Bem-vindo ao LogicForge</h1>
        <p class="profile-modal__subtitle">
          Crie um perfil para acompanhar seu progresso e salvar suas conquistas nos desafios de lógica.
        </p>
        <div class="profile-modal__form">
          <label class="profile-modal__label" for="profile-name-input">Seu nome</label>
          <input
            id="profile-name-input"
            class="profile-modal__input"
            type="text"
            placeholder="Digite seu nome"
            maxlength="30"
            autocomplete="off"
            autocapitalize="off"
            spellcheck="false"
          />
          <p class="profile-modal__error" id="profile-error" role="alert" aria-live="polite"></p>
          <button class="profile-modal__submit" type="button">
            COMEÇAR
          </button>
        </div>
      </div>
    `;

    this.#inputEl = overlay.querySelector('#profile-name-input');
    this.#errorEl = overlay.querySelector('#profile-error');
    this.#submitEl = overlay.querySelector('.profile-modal__submit');

    this.#inputEl.setAttribute('aria-describedby', 'profile-error');

    // Submit on button click
    this.addListener(this.#submitEl, 'click', () => this.#handleSubmit());

    // Submit on Enter key
    this.addListener(this.#inputEl, 'keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        this.#handleSubmit();
      }
    });

    // Auto-focus input after DOM insertion
    requestAnimationFrame(() => this.#inputEl?.focus());

    this.#overlayEl = overlay;
    return overlay;
  }

  /**
   * Triggers the exit animation then unmounts.
   * Returns a promise that resolves after the animation completes.
   * @returns {Promise<void>}
   */
  async close() {
    if (!this.#overlayEl) {
      this.unmount();
      return;
    }
    this.#overlayEl.classList.add('profile-modal--closing');
    await new Promise((resolve) => {
      this.#overlayEl.addEventListener('animationend', resolve, { once: true });
    });
    this.unmount();
  }

  /**
   * Reads the input value, validates it, creates the profile, and fires
   * the onSubmit callback on success.
   */
  #handleSubmit() {
    const name = this.#inputEl?.value || '';

    const validation = validateProfileName(name);
    if (!validation.valid) {
      this.#showError(validation.error);
      return;
    }

    const result = createProfile(name);
    if (!result.ok) {
      this.#showError(result.error);
      return;
    }

    // Clear any prior error
    this.#clearError();

    if (this.#onSubmit) {
      this.#onSubmit(name.trim());
    }
  }

  /**
   * Displays an error message under the input.
   * @param {string} msg
   */
  #showError(msg) {
    if (this.#errorEl) {
      this.#errorEl.textContent = escapeHtml(msg);
    }
    // Mark input as invalid for accessibility
    if (this.#inputEl) {
      this.#inputEl.setAttribute('aria-invalid', 'true');
    }
  }

  /**
   * Clears the error message and removes the invalid state.
   */
  #clearError() {
    if (this.#errorEl) {
      this.#errorEl.textContent = '';
    }
    if (this.#inputEl) {
      this.#inputEl.removeAttribute('aria-invalid');
    }
  }

  onUnmount() {
    // Clean up references to avoid memory leaks
    this.#onSubmit = null;
    this.#inputEl = null;
    this.#errorEl = null;
    this.#submitEl = null;
    this.#overlayEl = null;
  }
}

import { Component } from './base.js';

/*
 * Clickable card representing a playable game/puzzle.
 * Constructor destructures with defaults so partial game data won't crash
 * the render — the card degrades gracefully to placeholder values.
 */
export class GameCard extends Component {
  #game = null;

  constructor(game) {
    super();
    this.#game = {
      id: game.id || '',
      title: game.title || '',
      description: game.description || '',
      icon: game.icon || 'extension',
      difficulty: game.difficulty || 'EASY',
      difficultyColor: game.difficultyColor || 'var(--color-secondary)',
      difficultyShadow: game.difficultyShadow || 'var(--color-secondary-fixed)',
      backgroundIcon: game.backgroundIcon || 'extension',
      onStart: game.onStart || (() => {})
    };
  }

  render() {
    const card = document.createElement('div');
    card.className = 'game-card';
    /*
     * role="button" + tabindex="0" make the non-interactive <div> behave
     * like a button for both assistive tech and keyboard navigation.
     * The onClick handler lives on the inner <button> (stopPropagation
     * prevents double-firing); keyboard activation (Enter/Space) is caught
     * at the card level so the whole card is keyboard-accessible.
     */
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '0');

    const difficultyLabel = this.#game.difficulty.toUpperCase();

    /*
     * CSS custom properties --badge-color and --badge-shadow are set inline
     * so each game instance can carry its own difficulty color scheme without
     * creating a CSS class per difficulty level. The CSS consumes these vars
     * via var(--badge-color) etc.
     */
    card.innerHTML = `
      <div class="game-card__gradient-border">
        <div class="game-card__content">
          <div class="game-card__header">
            <div class="game-card__icon-wrapper">
              <span class="material-symbols-outlined game-card__icon" style="font-variation-settings: 'FILL' 1;">${this.#game.icon}</span>
            </div>
            <span class="game-card__difficulty" style="--badge-color: ${this.#game.difficultyColor}; --badge-shadow: ${this.#game.difficultyShadow}">${difficultyLabel}</span>
          </div>
          <div class="game-card__body">
            <h2 class="game-card__title">${this.#game.title}</h2>
            <p class="game-card__description">${this.#game.description}</p>
          </div>
          <div class="game-card__footer">
            <button class="game-card__btn">Iniciar Jogo</button>
          </div>
          <!-- Decorative background icon: absolute positioned, pointer-events: none in CSS so it never blocks clicks. -->
          <span class="material-symbols-outlined game-card__bg-icon">${this.#game.backgroundIcon}</span>
        </div>
      </div>
    `;

    /*
     * Click on the inner button: stopPropagation so the card-level click
     * (if any) doesn't fire too. Tracked via addListener so unmount()
     * cleans it up automatically.
     */
    this.addListener(card.querySelector('.game-card__btn'), 'click', (e) => {
      e.stopPropagation();
      this.#game.onStart(this.#game.id);
    });

    /*
     * Keyboard activation: Enter and Space should activate the card just
     * like a native button would. preventDefault on Space avoids scrolling.
     */
    this.addListener(card, 'keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        this.#game.onStart(this.#game.id);
      }
    });

    return card;
  }
}
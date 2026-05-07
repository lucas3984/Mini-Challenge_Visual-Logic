import { Component } from './base.js';

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
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '0');

    const difficultyLabel = this.#game.difficulty.toUpperCase();

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
          <span class="material-symbols-outlined game-card__bg-icon">${this.#game.backgroundIcon}</span>
        </div>
      </div>
    `;

    this.addListener(card.querySelector('.game-card__btn'), 'click', (e) => {
      e.stopPropagation();
      this.#game.onStart(this.#game.id);
    });

    this.addListener(card, 'keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        this.#game.onStart(this.#game.id);
      }
    });

    return card;
  }
}
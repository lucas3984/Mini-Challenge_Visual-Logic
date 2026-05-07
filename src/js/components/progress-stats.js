import { Component } from './base.js';

export class ProgressStats extends Component {
  #level = null;
  #progress = 0;

  constructor(level = { current: 42, title: 'Logic Wizard' }, progress = 85) {
    super();
    this.#level = level;
    this.#progress = Math.min(100, Math.max(0, progress));
  }

  render() {
    const container = document.createElement('div');
    container.className = 'progress-stats';
    container.innerHTML = `
      <div class="progress-stats__info">
        <span class="material-symbols-outlined progress-stats__icon">leaderboard</span>
        <div class="progress-stats__level">
          <p class="progress-stats__label">NÍVEL_ATUAL</p>
          <p class="progress-stats__value">Nível ${this.#level.current}: ${this.#level.title}</p>
        </div>
      </div>
      <div class="progress-stats__bar-container">
        <div class="progress-stats__bar-header">
          <span class="progress-stats__bar-label">PROGRESSO_XP</span>
          <span class="progress-stats__bar-value">${this.#progress}%</span>
        </div>
        <div class="progress-stats__bar">
          <div class="progress-stats__bar-fill" style="width: ${this.#progress}%"></div>
        </div>
      </div>
    `;

    return container;
  }
}
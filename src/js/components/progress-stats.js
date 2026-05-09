import { Component } from './base.js';

/*
 * Displays player level and XP progress bar.
 * Progress is clamped 0-100 at the constructor level (input validation at
 * the edge) so the bar never renders an invalid width.
 * Default values make the component self-contained — it can be instantiated
 * with no arguments and still show meaningful dummy content.
 */
export class ProgressStats extends Component {
  #level = null;
  #progress = 0;
  #startWidth = 0;

  constructor(level = { current: 42, title: 'Logic Wizard' }, progress = 85, startWidth = 0) {
    super();
    this.#level = level;
    /* Clamp prevents negative or >100% values from corrupting the bar. */
    this.#progress = Math.min(100, Math.max(0, progress));
    this.#startWidth = Math.min(100, Math.max(0, startWidth));
  }

  render() {
    const container = document.createElement('div');
    container.className = 'progress-stats';

    /*
     * The progress bar width is set via inline style because it's dynamic
     * runtime data, not a design token — the CSS owns the bar's appearance
     * (height, colors, transitions), the JS only sets the current percentage.
     * startWidth is provided by the page to animate from the previous progress
     * value (e.g. when switching profiles), keeping the component stateless.
     */
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
          <div class="progress-stats__bar-fill" style="width: ${this.#startWidth}%"></div>
        </div>
      </div>
    `;

    requestAnimationFrame(() => {
      const fill = container.querySelector('.progress-stats__bar-fill');
      if (fill) {
        fill.style.width = `${this.#progress}%`;
      }
    });

    return container;
  }
}
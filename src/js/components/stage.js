/**
 * Stage (game board) renderer component.
 *
 * Responsible for drawing the 8x8 grid: clearing all cells, then painting the
 * snake body, head, apples, and walls. Keeps the DOM and the Snake actor in
 * sync — the Snake owns the data model, and Stage translates it into visual
 * cell classes and sprite images.
 *
 * @extends Component
 */

import { getCellElement } from '../utils/dom.js';
import { Component } from './base.js';

// Maps logical direction to the CSS modifier class name that rotates the
// head sprite to face the correct direction.
const DIRECTION_CLASS = {
  right: 'snake-head-inner--right',
  down:  'snake-head-inner--down',
  left:  'snake-head-inner--left',
  up:    'snake-head-inner--up',
};

export class Stage extends Component {
  #gridEl;
  #snake;

  /**
   * @param {HTMLElement} gridEl - The .grid element in the DOM.
   * @param {Snake} snake - The snake actor instance (data model).
   */
  constructor(gridEl, snake) {
    super();
    this.#gridEl = gridEl;
    this.#snake = snake;
  }

  /**
   * Fully re-renders the grid based on the current snake state.
   * This is a complete repaint (clear + draw) rather than an incremental
   * diff because the grid is small (64 cells) and full repaint eliminates
   * the risk of stale cells from state transitions between frames.
   *
   * @returns {HTMLElement} The grid element (for chaining).
   */
  render() {
    const rows = this.#snake.rows;
    const cols = this.#snake.cols;

    // Phase 1: clear every cell of snake/apple/wall classes and sprite content.
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const cell = getCellElement(this.#gridEl, r, c);
        if (!cell) continue;

        cell.classList.remove(
          'grid__cell--snake-head',
          'grid__cell--snake-body',
          'grid__cell--apple',
          'grid__cell--wall'
        );
        cell.innerHTML = '';
      }
    }

    // Phase 2: draw walls — rendered first so they appear behind the snake.
    for (const { row, col } of this.#snake.walls) {
      const cell = getCellElement(this.#gridEl, row, col);
      if (!cell) continue;
      cell.classList.add('grid__cell--wall');
      cell.innerHTML = `<img src="src/assets/images/sprites/wall.svg" alt="parede" class="sprite sprite--wall">`;
    }

    // Phase 3: draw apples — rendered before the snake so they sit underneath.
    for (const { row, col } of this.#snake.apples) {
      const cell = getCellElement(this.#gridEl, row, col);
      if (!cell) continue;
      cell.classList.add('grid__cell--apple');
      cell.innerHTML = `<img src="src/assets/images/sprites/apple.svg" alt="maçã" class="sprite sprite--apple">`;
    }

    // Phase 4: draw the snake body from tail to head so that later segments
    // visually overlap earlier ones — this ensures the head is always on top.
    const body = this.#snake.body;
    const totalBody = body.length;
    for (let i = totalBody - 1; i >= 0; i--) {
      const { row, col } = body[i];
      const cell = getCellElement(this.#gridEl, row, col);
      if (!cell) continue;

      if (i === 0) {
        cell.classList.add('grid__cell--snake-head');
        const headClass = DIRECTION_CLASS[this.#snake.direction];
        cell.innerHTML = `<img src="src/assets/images/sprites/snake-head.svg" alt="cabeça da cobra" class="sprite sprite--snake-head ${headClass}">`;
      } else {
        cell.classList.add('grid__cell--snake-body');
        // Distance from the head determines the body segment opacity class —
        // farther segments are more transparent, giving a trailing fade effect.
        const pos = totalBody - 1 - i;
        const opacityClass = pos >= 3 ? 'sprite--snake-body--far' : pos === 2 ? 'sprite--snake-body--mid' : '';
        cell.innerHTML = `<img src="src/assets/images/sprites/snake-body.svg" alt="" class="sprite sprite--snake-body ${opacityClass}">`;
      }
    }

    this.#updateFooter();
    return this.#gridEl;
  }

  /**
   * Updates the stage footer with the current snake position, apple count,
   * and game status. Walks up from the grid element to find the page root so
   * this component doesn't need a direct reference to the footer elements.
   */
  #updateFooter() {
    const root = this.#gridEl.closest('.page--snake');
    const posEl = root ? root.querySelector('#stage-position') : null;
    const statusEl = root ? root.querySelector('#stage-status') : null;
    const appleEl = root ? root.querySelector('#apple-counter') : null;
    const head = this.#snake.head;
    if (posEl && head) {
      posEl.textContent = `Pos: (${head.row}, ${head.col}) direção ${this.#snake.direction}`;
    }
    if (appleEl) {
      appleEl.textContent = `\uD83C\uDF4E ${this.#snake.collectedApples}/${this.#snake.totalApples}`;
    }
    if (statusEl) {
      if (this.#snake.isGameOver) statusEl.textContent = 'Fim de Jogo';
      else if (this.#snake.isComplete) statusEl.textContent = 'Vitória!';
      else statusEl.textContent = 'Pronto';
    }
  }
}

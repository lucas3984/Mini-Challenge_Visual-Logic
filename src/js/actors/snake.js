/**
 * Snake actor (game logic model).
 *
 * Owns all mutable game state: body segments, direction, apples collected,
 * walls, and game-over status. Exposes movement and turning methods that
 * the Runner invokes during execution, and sensor methods (checkAppleAhead,
 * checkWallAhead, checkSnakeAhead) that the if-block evaluator queries.
 *
 * This class is deliberately free of any DOM or rendering logic — the Stage
 * component reads its state and paints accordingly, keeping display and logic
 * fully separated.
 */

import { delay } from '../utils/dom.js';

// Maps a direction name to its row/column delta per step.
// Treating the grid as (row, col) with origin at top-left, down = +row.
const DIRECTION_MAP = {
  right: { dr: 0, dc: 1 },
  down:  { dr: 1, dc: 0 },
  left:  { dr: 0, dc: -1 },
  up:    { dr: -1, dc: 0 },
};

// Ordered list used for circular turn logic: turning left means (index + 3) % 4,
// turning right means (index + 1) % 4. This avoids branching on direction names.
const DIRECTION_ORDER = ['right', 'down', 'left', 'up'];

export class Snake {
  #rows;
  #cols;
  #body;
  #direction;
  #apples;
  #walls;
  #collectedApples;
  #gameOver;
  #audio;

  /**
   * @param {number} [rows=8] - Grid row count.
   * @param {number} [cols=8] - Grid column count.
   * @param {AudioFX|null} [audio=null] - AudioFX instance for move/eat/turn sounds.
   */
  constructor(rows = 8, cols = 8, audio = null) {
    this.#rows = rows;
    this.#cols = cols;
    this.#gameOver = false;
    this.#collectedApples = 0;
    this.#audio = audio;
    this.#body = [];
    this.#apples = [];
    this.#walls = [];
    this.#direction = 'right';
  }

  /**
   * Resets the snake's state to match a given level definition.
   * All arrays are deep-copied to prevent the level config object from being
   * mutated during gameplay (e.g., if apples are spliced out).
   *
   * @param {Object} level - Level configuration from levels.js.
   */
  loadLevel(level) {
    this.#rows = level.gridSize || 8;
    this.#cols = level.gridSize || 8;
    this.#body = level.snake.map((s) => ({ row: s.row, col: s.col }));
    this.#direction = level.direction || 'right';
    this.#walls = level.walls.map((w) => ({ row: w.row, col: w.col }));
    this.#apples = level.apples.map((a) => ({ row: a.row, col: a.col }));
    this.#collectedApples = 0;
    this.#gameOver = false;
  }

  get isGameOver() {
    return this.#gameOver;
  }

  get isComplete() {
    return this.#apples.length === 0;
  }

  get collectedApples() {
    return this.#collectedApples;
  }

  get totalApples() {
    // totalApples = remaining + collected, so it stays constant throughout
    // the level and the display counter reads "collected / total".
    return this.#apples.length + this.#collectedApples;
  }

  get head() {
    if (this.#body.length === 0) return null;
    return { row: this.#body[0].row, col: this.#body[0].col };
  }

  get direction() {
    return this.#direction;
  }

  get body() {
    return this.#body;
  }

  get apples() {
    return this.#apples;
  }

  get walls() {
    return this.#walls;
  }

  get rows() {
    return this.#rows;
  }

  get cols() {
    return this.#cols;
  }

  /**
   * Advances the snake one step in its current direction.
   *
   * Collision checks run in order of severity:
   *   1. Out of bounds (walks off the grid)
   *   2. Wall collision
   *   3. Self-collision (any body segment except the tail, which will move away)
   *   4. Apple collection (grows the snake by not popping the tail)
   *
   * @param {boolean} [animate=true] - Whether to insert a 300ms delay for visual pacing.
   * @returns {Promise<'gameover'|'apple'|'ok'>} The outcome of the move.
   */
  async moveForward(animate = true) {
    // If the game is already over, every subsequent move is a no-op.
    if (this.#gameOver) return 'gameover';

    const dir = DIRECTION_MAP[this.#direction];
    const newHead = {
      row: this.#body[0].row + dir.dr,
      col: this.#body[0].col + dir.dc,
    };

    if (this.#isOutOfBounds(newHead)) {
      this.#gameOver = true;
      return 'gameover';
    }

    if (this.#isWall(newHead)) {
      this.#gameOver = true;
      return 'gameover';
    }

    // Exclude the tail segment from body collision because in a normal move
    // (without eating an apple) the tail will be removed, freeing that cell.
    // Without this exclusion, the snake would falsely collide with its own
    // tail when following itself in a straight line.
    const bodyCheck = this.#body.length > 1 ? this.#body.slice(0, -1) : [];
    if (bodyCheck.some((s) => s.row === newHead.row && s.col === newHead.col)) {
      this.#gameOver = true;
      return 'gameover';
    }

    this.#body.unshift(newHead);

    if (this.#isApple(newHead)) {
      // Apple eaten: don't pop the tail so the snake grows by one.
      this.#apples = this.#apples.filter((a) => !(a.row === newHead.row && a.col === newHead.col));
      this.#collectedApples++;
      if (animate) await delay(300);
      this.#audio?.play('eat');
      return 'apple';
    }

    // Normal move: pop the tail to keep the same length.
    this.#body.pop();
    if (animate) await delay(300);
    this.#audio?.play('move');
    return 'ok';
  }

  /**
   * Rotates the snake 90 degrees counter-clockwise.
   *
   * @param {boolean} [animate=true] - Whether to insert a short delay.
   */
  async turnLeft(animate = true) {
    const idx = DIRECTION_ORDER.indexOf(this.#direction);
    // (idx + 3) % 4 walks counter-clockwise through the direction order.
    this.#direction = DIRECTION_ORDER[(idx + 3) % 4];
    if (animate) await delay(150);
    this.#audio?.play('turn');
  }

  /**
   * Rotates the snake 90 degrees clockwise.
   *
   * @param {boolean} [animate=true] - Whether to insert a short delay.
   */
  async turnRight(animate = true) {
    const idx = DIRECTION_ORDER.indexOf(this.#direction);
    // (idx + 1) % 4 walks clockwise through the direction order.
    this.#direction = DIRECTION_ORDER[(idx + 1) % 4];
    if (animate) await delay(150);
    this.#audio?.play('turn');
  }

  /**
   * Returns true if there is an apple directly ahead of the snake's head.
   * Used by the if-block condition evaluator during execution.
   *
   * @returns {boolean}
   */
  checkAppleAhead() {
    return this.#checkAhead('apple');
  }

  /**
   * Returns true if a wall or grid boundary is directly ahead.
   *
   * @returns {boolean}
   */
  checkWallAhead() {
    return this.#checkAhead('wall') || this.#checkAhead('bounds');
  }

  /**
   * Returns true if the snake's own body is directly ahead.
   *
   * @returns {boolean}
   */
  checkSnakeAhead() {
    return this.#checkAhead('snake');
  }

  /**
   * Central check-ahead dispatcher. All sensor methods delegate to this so
   * the ahead-coordinate computation is defined once and reused.
   *
   * @param {'apple'|'wall'|'bounds'|'snake'} type
   * @returns {boolean}
   */
  #checkAhead(type) {
    const dir = DIRECTION_MAP[this.#direction];
    const ahead = {
      row: this.#body[0].row + dir.dr,
      col: this.#body[0].col + dir.dc,
    };
    switch (type) {
      case 'apple': return this.#isApple(ahead);
      case 'wall': return this.#isWall(ahead);
      case 'bounds': return this.#isOutOfBounds(ahead);
      case 'snake': {
        // Same tail-exclusion logic as moveForward: the tail will move away.
        const bodyCheck = this.#body.length > 1 ? this.#body.slice(0, -1) : [];
        return bodyCheck.some((s) => s.row === ahead.row && s.col === ahead.col);
      }
    }
    return false;
  }

  /**
   * @param {{row: number, col: number}} position
   * @returns {boolean}
   */
  #isOutOfBounds({ row, col }) {
    return row < 0 || row >= this.#rows || col < 0 || col >= this.#cols;
  }

  /**
   * @param {{row: number, col: number}} position
   * @returns {boolean}
   */
  #isWall({ row, col }) {
    return this.#walls.some((w) => w.row === row && w.col === col);
  }

  /**
   * @param {{row: number, col: number}} position
   * @returns {boolean}
   */
  #isApple({ row, col }) {
    return this.#apples.some((a) => a.row === row && a.col === col);
  }
}

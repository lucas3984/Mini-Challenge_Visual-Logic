/**
 * Async AST executor for the visual programming game.
 *
 * Iterates over the AST produced by the parser and dispatches each node
 * (action, loop, conditional) to the Snake instance. Supports pause,
 * resume, and abort so the user can control execution flow at runtime.
 *
 * Execution is deliberately async with delays between steps so the
 * player can visually follow which block is currently running.
 */

import { delay } from '../utils/dom.js';

export class Runner {
  #snake;
  #stage;
  #paused;
  #pausedResolve;
  #aborted;

  /**
   * @param {Object} snake - Snake game instance with move/turn/check methods.
   * @param {Object} stage - Stage renderer with a `render()` method.
   */
  constructor(snake, stage) {
    this.#snake = snake;
    this.#stage = stage;
    this.#paused = false;
    this.#pausedResolve = null;
    this.#aborted = false;
  }

  get paused() {
    return this.#paused;
  }

  /**
   * Executes an AST from top to bottom.
   *
   * Checks abort before and after each pause so that an abort signal
   * during a paused state terminates execution immediately rather than
   * resuming into the next node.
   *
   * @param {Object[]} ast - Array of AST nodes from the parser.
   * @returns {Promise<{status: string}>} 'win', 'gameover', or 'aborted'.
   */
  async execute(ast) {
    this.#aborted = false;
    this.#paused = false;
    this.#pausedResolve = null;

    for (const node of ast) {
      if (this.#aborted) break;
      await this.#checkPause();
      if (this.#aborted) break; // Guard: pause may have been aborted while waiting.
      await this.#executeNode(node);
    }

    if (this.#snake.isComplete) return { status: 'win' };
    if (this.#snake.isGameOver) return { status: 'gameover' };
    return { status: 'aborted' };
  }

  pause() {
    this.#paused = true;
  }

  /**
   * Resumes execution. Does nothing if not paused — prevents
   * double-resolve bugs where an extra call would corrupt state.
   */
  resume() {
    if (!this.#paused) return;
    this.#paused = false;
    if (this.#pausedResolve) {
      this.#pausedResolve();
      this.#pausedResolve = null;
    }
  }

  /**
   * Aborts execution and forces resume so the paused promise is
   * resolved and the while-loop in #checkPause exits cleanly.
   */
  abort() {
    this.#aborted = true;
    this.resume();
  }

  async #executeNode(node) {
    switch (node.type) {
      case 'action': await this.#executeAction(node); break;
      case 'loop': await this.#executeLoop(node); break;
      case 'conditional': await this.#executeConditional(node); break;
    }
  }

  async #executeAction(node) {
    const cmd = node.command;
    // Guard: skip if the snake doesn't implement the command —
    // prevents crash when DOM has a block type not mapped in the parser.
    if (typeof this.#snake[cmd] !== 'function') return;
    if (this.#aborted) return;

    this.#highlight(node, true);

    const result = await this.#snake[cmd]();

    // Render after every action so the grid updates in real time
    // as each block executes, giving visual feedback to the player.
    this.#stage.render();

    this.#highlight(node, false);

    if (result === 'gameover' || this.#snake.isGameOver) {
      this.#aborted = true;
    }
  }

  async #executeLoop(node) {
    for (let i = 0; i < node.iterations; i++) {
      if (this.#aborted) break;

      this.#highlight(node, true);

      await this.#checkPause();
      if (this.#aborted) break;

      // Re-check pause before each child so that the user can pause
      // mid-loop and resume without skipping iterations.
      for (const child of node.children) {
        if (this.#aborted) break;
        await this.#checkPause();
        if (this.#aborted) break;
        await this.#executeNode(child);
      }

      this.#highlight(node, false);
    }
  }

  async #executeConditional(node) {
    this.#highlight(node, true);

    const method = node.condition;
    let conditionMet = false;

    if (typeof this.#snake[method] === 'function') {
      conditionMet = this.#snake[method]();
    }

    if (conditionMet && !this.#aborted) {
      for (const child of node.children) {
        if (this.#aborted) break;
        await this.#checkPause();
        if (this.#aborted) break;
        await this.#executeNode(child);
      }
    }

    this.#highlight(node, false);

    // When the condition is false, add a brief delay so the user sees
    // the block light up briefly before it's skipped — otherwise it
    // would flash too fast to notice.
    if (!conditionMet) await delay(200);
  }

  /**
   * Toggles the visual highlight class on the block's DOM element.
   *
   * Uses classList rather than inline style so CSS handles the
   * animation/color, keeping concerns separated.
   *
   * @param {Object} node - AST node with a `.node` DOM reference.
   * @param {boolean} on - Whether to add or remove the highlight.
   */
  #highlight(node, on) {
    if (!node || !node.node) return;
    if (on) {
      node.node.classList.add('block--executing');
    } else {
      node.node.classList.remove('block--executing');
    }
  }

  /**
   * Suspends execution while paused and not aborted.
   *
   * The promise pattern avoids busy-waiting: the loop sleeps on the
   * promise until resume() resolves it. Re-creates the promise on each
   * iteration so that pause/resume can be toggled multiple times.
   */
  async #checkPause() {
    while (this.#paused && !this.#aborted) {
      await new Promise((resolve) => {
        this.#pausedResolve = resolve;
      });
    }
  }
}

/**
 * DOM utility functions used across the application.
 *
 * Provides helpers for grid cell lookup, XSS sanitization, async delay,
 * block counting, and workspace block cloning. All functions are pure
 * DOM operations with no side-effects beyond their return values.
 */

/**
 * Returns the .grid__cell element at coordinates (row, col).
 * @param {HTMLElement} gridEl — .grid container
 * @param {number} row
 * @param {number} col
 * @returns {HTMLElement|null}
 */
export function getCellElement(gridEl, row, col) {
  return gridEl.querySelector(`[data-row="${row}"][data-col="${col}"]`);
}

/**
 * Promise that resolves after ms milliseconds.
 *
 * Wraps setTimeout so it can be awaited in async execution flows
 * (e.g. the Runner pauses between actions).
 *
 * @param {number} ms
 * @returns {Promise<void>}
 */
export function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Counts top-level blocks inside the container (action, loop, and if blocks).
 * Each top-level block counts as 1 toward maxBlocks regardless of type.
 * Blocks nested inside loop/if dropzones are NOT counted here — they do not
 * consume the maxBlocks budget.
 *
 * Used to measure program complexity and enforce block limits
 * before the user submits their solution.
 *
 * @param {HTMLElement} container
 * @returns {number}
 */
export function countAllBlocks(container) {
  let count = 0;
  for (const child of container.children) {
    if (
      child.classList.contains('block--action') ||
      child.classList.contains('c-block--loop') ||
      child.classList.contains('c-block--event')
    ) {
      count++;
    }
    // Do NOT recurse into dropzones — nested blocks inside if/loop
    // containers do not count toward maxBlocks.
  }
  return count;
}

/**
 * Recursively counts loop blocks (.c-block--loop) inside the container,
 * including those nested inside dropzones.
 * @param {HTMLElement} container
 * @returns {number}
 */
export function countLoopBlocks(container) {
  let count = 0;
  for (const child of container.children) {
    if (child.classList.contains('c-block--loop')) {
      count++;
    }
    const dropzone = child.querySelector('.c-block__dropzone');
    if (dropzone) {
      count += countLoopBlocks(dropzone);
    }
  }
  return count;
}

/**
 * Recursively counts IF blocks (.c-block--event) inside the container,
 * including those nested inside dropzones.
 * @param {HTMLElement} container
 * @returns {number}
 */
export function countIfBlocks(container) {
  let count = 0;
  for (const child of container.children) {
    if (child.classList.contains('c-block--event')) {
      count++;
    }
    const dropzone = child.querySelector('.c-block__dropzone');
    if (dropzone) {
      count += countIfBlocks(dropzone);
    }
  }
  return count;
}

/**
 * Counts how many direct children exist in an IF block's dropzone.
 *
 * Separate from countIfBlocks because the user needs to know how many
 * blocks are placed inside a specific conditional (used for level
 * completion checks).
 *
 * @param {HTMLElement} ifBlock — .c-block--event element
 * @returns {number}
 */
export function countIfChildren(ifBlock) {
  const dropzone = ifBlock.querySelector('.c-block__dropzone');
  if (!dropzone) return 0;
  return dropzone.children.length;
}

/**
 * Counts how many direct children exist in a LOOP block's dropzone.
 *
 * Used to enforce the limit of 1 action block per loop.
 *
 * @param {HTMLElement} loopBlock — .c-block--loop element
 * @returns {number}
 */
export function countLoopChildren(loopBlock) {
  const dropzone = loopBlock.querySelector('.c-block__dropzone');
  if (!dropzone) return 0;
  return dropzone.children.length;
}

/**
 * Counts how many loop blocks (.c-block--loop) exist inside an IF block's dropzone.
 *
 * Used to enforce the limit of 1 loop per if.
 *
 * @param {HTMLElement} ifBlock — .c-block--event element
 * @returns {number}
 */
export function countLoopsInIf(ifBlock) {
  const dropzone = ifBlock.querySelector('.c-block__dropzone');
  if (!dropzone) return 0;
  return dropzone.querySelectorAll('.c-block--loop').length;
}

/**
 * Clones a sidebar block for placement in the workspace.
 *
 * Strips sidebar-specific identifiers and classes so the clone behaves
 * as a standalone workspace block. Adds a delete button so the user
 * can remove it from the workspace without affecting the sidebar.
 *
 * @param {HTMLElement} block - Original block element from the sidebar.
 * @returns {HTMLElement} Cleaned clone ready for workspace insertion.
 */
export function cloneBlockForWorkspace(block) {
  const clone = block.cloneNode(true);

  // Remove the block ID so the workspace copy is treated as a new, independent block.
  clone.removeAttribute('data-block-id');

  // Strip sidebar and transient state classes — these only apply to
  // the original sidebar block or in the context of drag operations.
  clone.classList.remove(
    'block--dragging',
    'block--executing',
    'block--selected',
    'sidebar__block'
  );

  clone.draggable = true;
  clone.tabIndex = 0;
  clone.style.opacity = '';

  // Also clean any nested elements that may have inherited transient classes.
  clone.querySelectorAll('.block--executing, .block--dragging, .block--selected').forEach((el) => {
    el.classList.remove('block--executing', 'block--dragging', 'block--selected');
  });

  // Workspace blocks need a delete button; sidebar blocks don't.
  // This is added on clone rather than in the HTML template so the
  // sidebar source blocks remain clean.
  const btn = document.createElement('button');
  btn.className = 'block__delete-btn';
  btn.setAttribute('aria-label', 'Remover bloco');
  btn.textContent = '\u2715';
  clone.appendChild(btn);

  return clone;
}

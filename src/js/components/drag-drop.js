/**
 * Drag-and-drop block assembly component.
 *
 * Handles both mouse (native HTML5 drag-and-drop) and touch interactions for
 * moving code blocks from the sidebar palette into the workspace. Manages block
 * insertion order, container nesting (loop/if bodies), and enforces per-level
 * block limits via callback guards. Designed to work via event delegation on a
 * single container element so that all sidebar and workspace blocks are handled
 * uniformly without per-block listener registration.
 *
 * @extends Component
 */

import { cloneBlockForWorkspace } from '../utils/dom.js';
import { Component } from './base.js';

export class DragDrop extends Component {
  #dragContainer;
  #draggedBlock;
  #sourceContainer;
  #longPressTimer;
  #longPressActive;
  #touchClone;
  #startX;
  #startY;
  #canAddBlock;
  #canAddLoop;
  #canAddIf;
  #canAddToIf;
  #onBlockChanged;
  #audio;

  /**
   * @param {HTMLElement} container - The root element for event delegation
   *   (typically the main app container).
   * @param {Object} [options]
   * @param {Function} [options.canAddBlock] - Returns true if another block may be added.
   * @param {Function} [options.canAddLoop] - Returns true if another loop block may be added.
   * @param {Function} [options.canAddIf] - Returns true if another if block may be added.
   * @param {Function} [options.canAddToIf] - Returns true for a given if block if a child may be added.
   * @param {Function} [options.onBlockChanged] - Called after any block add/remove.
   * @param {Object} [options.audio] - AudioFX instance for snap/error sounds.
   */
  constructor(container, { canAddBlock, canAddLoop, canAddIf, canAddToIf, onBlockChanged, audio } = {}) {
    super();
    this.#dragContainer = container;
    this.#draggedBlock = null;
    this.#sourceContainer = null;
    this.#longPressActive = false;
    this.#touchClone = null;
    // Default allow-all guards so the component doesn't break if no limits are provided.
    this.#canAddBlock = canAddBlock || (() => true);
    this.#canAddLoop = canAddLoop || (() => true);
    this.#canAddIf = canAddIf || (() => true);
    this.#canAddToIf = canAddToIf || (() => true);
    this.#onBlockChanged = onBlockChanged || (() => {});
    this.#audio = audio || null;
    this.#bindEvents();
  }

  /**
   * Binds all DOM event listeners. Each listener reference is stored on `this`
   * so `unmount()` can remove them by identity — avoids the pitfall of
   * anonymous functions that can't be cleanly detached.
   */
  #bindEvents() {
    this._onDragStartBound = (e) => this.#onDragStart(e);
    this._onDragOverBound = (e) => this.#onDragOver(e);
    this._onDragEnterBound = (e) => this.#onDragEnter(e);
    this._onDragLeaveBound = (e) => this.#onDragLeave(e);
    this._onDropBound = (e) => this.#onDrop(e);
    this._onDragEndBound = (e) => this.#onDragEnd(e);
    this._onTouchStartBound = (e) => this.#onTouchStart(e);
    this._onTouchMoveBound = (e) => this.#onTouchMove(e);
    this._onTouchEndBound = (e) => this.#onTouchEnd(e);
    this._onKeyDownBound = (e) => this.#onKeyDown(e);
    this._onClickBound = (e) => this.#onClickDelete(e);

    this.#dragContainer.addEventListener('dragstart', this._onDragStartBound);
    this.#dragContainer.addEventListener('dragover', this._onDragOverBound);
    this.#dragContainer.addEventListener('dragenter', this._onDragEnterBound);
    this.#dragContainer.addEventListener('dragleave', this._onDragLeaveBound);
    this.#dragContainer.addEventListener('drop', this._onDropBound);
    this.#dragContainer.addEventListener('dragend', this._onDragEndBound);

    // Touch events use passive:false because the handlers call
    // preventDefault() to stop the page from scrolling during a drag.
    this.#dragContainer.addEventListener('touchstart', this._onTouchStartBound, { passive: false });
    this.#dragContainer.addEventListener('touchmove', this._onTouchMoveBound, { passive: false });
    this.#dragContainer.addEventListener('touchend', this._onTouchEndBound);

    // Keyboard listener is registered on document (not the container) so that
    // Delete/Escape work even when focus is inside the sidebar or workspace.
    document.addEventListener('keydown', this._onKeyDownBound);

    this.#dragContainer.addEventListener('click', this._onClickBound);
  }

  /**
   * Cleans up all listeners registered in #bindEvents. Must be called before
   * the component's DOM is removed to prevent memory leaks from detached
   * element references.
   */
  unmount() {
    this.#dragContainer.removeEventListener('dragstart', this._onDragStartBound);
    this.#dragContainer.removeEventListener('dragover', this._onDragOverBound);
    this.#dragContainer.removeEventListener('dragenter', this._onDragEnterBound);
    this.#dragContainer.removeEventListener('dragleave', this._onDragLeaveBound);
    this.#dragContainer.removeEventListener('drop', this._onDropBound);
    this.#dragContainer.removeEventListener('dragend', this._onDragEndBound);
    this.#dragContainer.removeEventListener('touchstart', this._onTouchStartBound);
    this.#dragContainer.removeEventListener('touchmove', this._onTouchMoveBound);
    this.#dragContainer.removeEventListener('touchend', this._onTouchEndBound);
    document.removeEventListener('keydown', this._onKeyDownBound);
    this.#dragContainer.removeEventListener('click', this._onClickBound);
    super.unmount();
  }

  /**
   * Handles click on the delete button inside workspace blocks (the X button
   * that appears on hover). Only removes blocks that are NOT in the sidebar —
   * sidebar palette blocks are immutable.
   *
   * @param {MouseEvent} e
   */
  #onClickDelete(e) {
    const btn = e.target.closest('.block__delete-btn');
    if (!btn) return;
    e.preventDefault();
    e.stopPropagation();
    const block = btn.closest('.block, .c-block');
    if (block && !block.closest('.sidebar')) {
      block.remove();
      this.#onBlockChanged();
    }
  }

  /**
   * Walks up the DOM tree to find the nearest draggable block element.
   * Returns the element itself or null if none is found before hitting the
   * container boundary.
   *
   * @param {HTMLElement} el - Starting element (usually event.target).
   * @returns {HTMLElement|null} The draggable block or null.
   */
  #isDraggable(el) {
    while (el && el !== this.#dragContainer && el !== document.body) {
      // A block may not have draggable=true explicitly set (e.g. c-block
      // children), so we also check class names as a fallback.
      if (el.draggable === true || el.classList.contains('block') || el.classList.contains('c-block')) {
        return el;
      }
      el = el.parentElement;
    }
    return null;
  }

  /**
   * Walks up the DOM to find the nearest valid drop target (stack, dropzone,
   * or workspace area). This is the inverse of #isDraggable but for the
   * insertion side of the interaction.
   *
   * @param {HTMLElement} el
   * @returns {HTMLElement|null}
   */
  #isDropzone(el) {
    while (el && el !== this.#dragContainer && el !== document.body) {
      if (
        el.classList.contains('c-block__dropzone') ||
        el.classList.contains('workspace__stack') ||
        el.classList.contains('workspace__area')
      ) {
        return el;
      }
      el = el.parentElement;
    }
    return null;
  }

  /**
   * Returns true if the element is inside the sidebar palette.
   * This distinction matters because sidebar-originated blocks must be
   * cloned rather than moved.
   *
   * @param {HTMLElement} el
   * @returns {boolean}
   */
  #isFromSidebar(el) {
    return el && el.closest('.sidebar') !== null;
  }

  // ── Native Drag Events ──────────────────────────────────────────────

  /**
   * Initiates a drag operation. Stores the source block and its parent
   * container so we know whether to clone or move on drop.
   *
   * @param {DragEvent} e
   */
  #onDragStart(e) {
    const block = this.#isDraggable(e.target);
    if (!block) return;

    this.#draggedBlock = block;
    this.#sourceContainer = block.parentElement;

    // Set a custom data type so external drops (e.g., from the OS) are ignored.
    e.dataTransfer.setData('application/x-snake-block', 'true');
    e.dataTransfer.effectAllowed = 'copyMove';
  }

  /**
   * Allows the drop by preventing the default (which would reject it) and
   * highlights the nearest valid dropzone with a snap-preview class.
   *
   * @param {DragEvent} e
   */
  #onDragOver(e) {
    if (!this.#draggedBlock) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

    // Use elementFromPoint as a fallback when the mousemove target is not
    // itself a dropzone (e.g., when dragging over block text).
    const dropzone = this.#isDropzone(e.target) || this.#findNearestDropzone(e.clientX, e.clientY);
    if (!dropzone) return;

    this.#clearSnapPreviews();
    dropzone.classList.add('dropzone--snap-preview');
  }

  /**
   * @param {DragEvent} e
   */
  #onDragEnter(e) {
    if (!this.#draggedBlock) return;
    const dropzone = this.#isDropzone(e.target);
    if (dropzone) dropzone.classList.add('dropzone--snap-preview');
  }

  /**
   * Removes snap preview when the cursor leaves a dropzone. The
   * `contains(e.relatedTarget)` check prevents flickering when the cursor
   * moves between child elements inside the same dropzone.
   *
   * @param {DragEvent} e
   */
  #onDragLeave(e) {
    const dropzone = this.#isDropzone(e.target);
    if (dropzone && !dropzone.contains(e.relatedTarget)) {
      dropzone.classList.remove('dropzone--snap-preview');
    }
  }

  /**
   * Executes the drop: clones or moves the block, enforces limits, inserts at
   * the correct vertical position, and fires the change callback.
   *
   * @param {DragEvent} e
   */
  #onDrop(e) {
    e.preventDefault();
    if (!this.#draggedBlock) return;

    this.#clearSnapPreviews();

    const targetDropzone = this.#findNearestDropzone(e.clientX, e.clientY);
    if (!targetDropzone) return;
    // Never allow dropping back into the sidebar.
    if (targetDropzone.closest('.sidebar')) return;

    const isSidebarSource = this.#isFromSidebar(this.#sourceContainer || this.#draggedBlock);

    let blockToInsert;
    if (isSidebarSource) {
      // Sidebar blocks are templates — clone them so the palette stays intact.
      blockToInsert = cloneBlockForWorkspace(this.#draggedBlock);
    } else {
      // Workspace blocks are moved (re-parented), not cloned.
      blockToInsert = this.#draggedBlock;
    }

    // Prevent dropping a block onto itself (no-op).
    if (targetDropzone === blockToInsert || targetDropzone.contains(blockToInsert)) return;

    // --- Limit enforcement ---
    if (!this.#canAddBlock()) {
      this.#showLimitWarning('block');
      if (isSidebarSource) {
        this.#draggedBlock.classList.remove('block--dragging');
        this.#draggedBlock.style.opacity = '';
        this.#draggedBlock = null;
        this.#sourceContainer = null;
      }
      return;
    }

    if (blockToInsert.classList.contains('c-block--loop') && !this.#canAddLoop()) {
      this.#showLimitWarning('loop');
      if (isSidebarSource) {
        this.#draggedBlock.classList.remove('block--dragging');
        this.#draggedBlock.style.opacity = '';
        this.#draggedBlock = null;
        this.#sourceContainer = null;
      }
      return;
    }

    if (blockToInsert.classList.contains('c-block--event') && !this.#canAddIf()) {
      this.#showLimitWarning('if');
      if (isSidebarSource) {
        this.#draggedBlock.classList.remove('block--dragging');
        this.#draggedBlock.style.opacity = '';
        this.#draggedBlock = null;
        this.#sourceContainer = null;
      }
      return;
    }

    if (targetDropzone.classList.contains('c-block__dropzone')) {
      const parentBlock = targetDropzone.closest('.c-block--event');
      if (parentBlock && !this.#canAddToIf(parentBlock)) {
        this.#showLimitWarning('ifchildren');
        if (isSidebarSource) {
          this.#draggedBlock.classList.remove('block--dragging');
          this.#draggedBlock.style.opacity = '';
          this.#draggedBlock = null;
          this.#sourceContainer = null;
        }
        return;
      }
      targetDropzone.appendChild(blockToInsert);
    } else {
      // Dropping onto the workspace area or stack — insert at the nearest
      // vertical position between existing blocks.
      const stack = targetDropzone.classList.contains('workspace__area')
        ? targetDropzone.querySelector('.workspace__stack')
        : targetDropzone;

      if (!stack) return;

      const reference = this.#findClosestBlock(stack, e.clientY);
      if (reference) {
        const rect = reference.getBoundingClientRect();
        const midY = rect.top + rect.height / 2;
        if (e.clientY < midY) {
          stack.insertBefore(blockToInsert, reference);
        } else {
          stack.insertBefore(blockToInsert, reference.nextSibling);
        }
      } else {
        stack.appendChild(blockToInsert);
      }
    }

    this.#onBlockChanged();
    this.#audio?.play('snap');

    // Clean up the sidebar source block visual state (the clone already holds
    // the workspace copy).
    if (isSidebarSource) {
      this.#draggedBlock.classList.remove('block--dragging');
      this.#draggedBlock.style.opacity = '';
      this.#draggedBlock = null;
      this.#sourceContainer = null;
    }
  }

  /**
   * @param {DragEvent} _e
   */
  #onDragEnd(_e) {
    this.#clearSnapPreviews();
    if (this.#draggedBlock) {
      this.#draggedBlock = null;
    }
    this.#sourceContainer = null;
  }

  // ── Touch Events (mobile drag simulation) ───────────────────────────

  /**
   * Begins a potential touch drag. Uses a 500ms long-press threshold to
   * distinguish between a drag intent and a simple tap/scroll. The timer is
   * cleared if the user lifts their finger before the threshold.
   *
   * @param {TouchEvent} e
   */
  #onTouchStart(e) {
    const block = this.#isDraggable(e.target);
    if (!block) return;

    this.#startX = e.touches[0].clientX;
    this.#startY = e.touches[0].clientY;

    clearTimeout(this.#longPressTimer);
    // 500ms balances responsiveness with false-positive avoidance — shorter
    // would risk triggering drags on accidental long taps.
    this.#longPressTimer = setTimeout(() => {
      this.#longPressActive = true;
      this.#draggedBlock = block;
      this.#sourceContainer = block.parentElement;

      // Create a visual clone that follows the finger; pointer-events:none
      // ensures the clone itself doesn't intercept touch events.
      this.#touchClone = block.cloneNode(true);
      this.#touchClone.style.position = 'fixed';
      this.#touchClone.style.pointerEvents = 'none';
      this.#touchClone.style.zIndex = '1000';
      this.#touchClone.style.opacity = '1';
      this.#touchClone.style.width = block.offsetWidth + 'px';
      document.body.appendChild(this.#touchClone);
    }, 500);
  }

  /**
   * Moves the touch clone and updates dropzone previews. Calls
   * preventDefault() to suppress page scrolling while a drag is active.
   *
   * @param {TouchEvent} e
   */
  #onTouchMove(e) {
    if (!this.#longPressActive || !this.#draggedBlock) return;
    e.preventDefault();

    const x = e.touches[0].clientX;
    const y = e.touches[0].clientY;

    if (this.#touchClone) {
      // Center the clone horizontally under the finger, offset upward so the
      // user can see what's below the touch point.
      this.#touchClone.style.left = x - this.#touchClone.offsetWidth / 2 + 'px';
      this.#touchClone.style.top = y - 20 + 'px';
    }

    this.#clearSnapPreviews();
    const dropzone = this.#findNearestDropzone(x, y);
    if (dropzone) dropzone.classList.add('dropzone--snap-preview');
  }

  /**
   * Finalizes the touch drag: determines the drop target, applies the same
   * clone/move + limit logic as the native drag path, and cleans up.
   *
   * @param {TouchEvent} e
   */
  #onTouchEnd(e) {
    clearTimeout(this.#longPressTimer);

    // If the long press never activated, this was a regular tap — do nothing.
    if (!this.#longPressActive || !this.#draggedBlock) {
      this.#longPressActive = false;
      return;
    }

    this.#longPressActive = false;

    const x = e.changedTouches[0].clientX;
    const y = e.changedTouches[0].clientY;

    // Remove the visual clone from the DOM immediately.
    if (this.#touchClone) {
      this.#touchClone.remove();
      this.#touchClone = null;
    }

    this.#clearSnapPreviews();

    const targetDropzone = this.#findNearestDropzone(x, y);
    if (!targetDropzone) {
      this.#cleanupDrag();
      return;
    }
    if (targetDropzone.closest('.sidebar')) {
      this.#cleanupDrag();
      return;
    }

    const isSidebarSource = this.#isFromSidebar(this.#sourceContainer || this.#draggedBlock);

    let blockToInsert;
    if (isSidebarSource) {
      blockToInsert = cloneBlockForWorkspace(this.#draggedBlock);
    } else {
      blockToInsert = this.#draggedBlock;
    }

    if (targetDropzone === blockToInsert || targetDropzone.contains(blockToInsert)) {
      this.#cleanupDrag();
      return;
    }

    // --- Limit enforcement (same guards as native drag) ---
    if (!this.#canAddBlock()) {
      this.#showLimitWarning('block');
      this.#cleanupDrag();
      return;
    }

    if (blockToInsert.classList.contains('c-block--loop') && !this.#canAddLoop()) {
      this.#showLimitWarning('loop');
      this.#cleanupDrag();
      return;
    }

    if (blockToInsert.classList.contains('c-block--event') && !this.#canAddIf()) {
      this.#showLimitWarning('if');
      this.#cleanupDrag();
      return;
    }

    if (targetDropzone.classList.contains('c-block__dropzone')) {
      const parentBlock = targetDropzone.closest('.c-block--event');
      if (parentBlock && !this.#canAddToIf(parentBlock)) {
        this.#showLimitWarning('ifchildren');
        this.#cleanupDrag();
        return;
      }
      targetDropzone.appendChild(blockToInsert);
    } else {
      const stack = targetDropzone.classList.contains('workspace__area')
        ? targetDropzone.querySelector('.workspace__stack')
        : targetDropzone;

      if (!stack) { this.#cleanupDrag(); return; }

      const reference = this.#findClosestBlock(stack, y);
      if (reference) {
        const rect = reference.getBoundingClientRect();
        const midY = rect.top + rect.height / 2;
        if (y < midY) {
          stack.insertBefore(blockToInsert, reference);
        } else {
          stack.insertBefore(blockToInsert, reference.nextSibling);
        }
      } else {
        stack.appendChild(blockToInsert);
      }
    }

    this.#onBlockChanged();
    this.#audio?.play('snap');
    this.#cleanupDrag();
  }

  /**
   * Temporarily replaces the block counter text with a limit warning message.
   * This provides in-context feedback without a modal dialog, and restores the
   * original counter text after 1.5s.
   *
   * @param {string} [type='block'] - Which limit was hit ('block', 'loop', 'if', 'ifchildren').
   */
  #showLimitWarning(type = 'block') {
    this.#audio?.play('error');
    const messages = {
      block: 'Limite de blocos atingido!',
      loop: 'Limite de loops atingido!',
      if: 'Limite de Se atingido!',
      ifchildren: 'Maximo 3 comandos dentro do Se!',
    };
    // Walk up to the page root to find the counter element.
    const root = this.#dragContainer.closest('.page--snake');
    const el = root ? root.querySelector('#block-counter') : null;
    if (!el) return;
    el.classList.add('block-counter--limit');
    const current = el.textContent;
    el.textContent = messages[type] || messages.block;
    setTimeout(() => {
      el.textContent = current;
    }, 1500);
  }

  /**
   * Resets internal drag state without inserting anything. Used when a drag
   * operation is cancelled (finger lifted over invalid target, no valid
   * dropzone, limit blocked the insert, etc.).
   */
  #cleanupDrag() {
    if (this.#draggedBlock) {
      this.#draggedBlock.classList.remove('block--dragging');
      this.#draggedBlock = null;
    }
    this.#sourceContainer = null;
  }

  /**
   * Keyboard shortcuts for workspace interactions:
   *   - Escape: cancel any active drag and blur focus.
   *   - Delete/Backspace: remove the focused block from the workspace.
   *
   * Only fires when the focused element is inside the component container.
   *
   * @param {KeyboardEvent} e
   */
  #onKeyDown(e) {
    const active = document.activeElement;
    if (!active || !this.#dragContainer.contains(active)) return;

    if (e.key === 'Escape') {
      if (this.#draggedBlock) this.#cleanupDrag();
      active.blur();
      return;
    }

    if (e.key === 'Delete' || e.key === 'Backspace') {
      // Don't delete when the user is editing text inside an input/select/textarea.
      if (active.matches('input, select, textarea')) return;
      const block = this.#isDraggable(active);
      if (block && !block.closest('.sidebar')) {
        block.remove();
        this.#onBlockChanged();
        e.preventDefault();
      }
    }
  }

  /**
   * Uses document.elementFromPoint to find the element under the cursor,
   * then walks up to the nearest dropzone. This is the fallback for when
   * the drag event target itself is not a dropzone (e.g., text nodes).
   *
   * @param {number} clientX
   * @param {number} clientY
   * @returns {HTMLElement|null}
   */
  #findNearestDropzone(clientX, clientY) {
    const el = document.elementFromPoint(clientX, clientY);
    if (!el) return null;
    return this.#isDropzone(el);
  }

  /**
   * Finds the block closest to a given vertical coordinate within a container.
   * Used for insertion-point positioning: the dragged block is placed above or
   * below the nearest sibling depending on whether the cursor is in the top or
   * bottom half of that sibling.
   *
   * @param {HTMLElement} container - The stack element containing block children.
   * @param {number} clientY - Vertical cursor position.
   * @returns {HTMLElement|null} The nearest block element, or null if container is empty.
   */
  #findClosestBlock(container, clientY) {
    let best = null;
    let bestDist = Infinity;

    for (const child of container.children) {
      // Only consider direct block children; ignore separators, spacers, etc.
      if (!child.classList.contains('block') && !child.classList.contains('c-block')) continue;

      const rect = child.getBoundingClientRect();
      const midY = rect.top + rect.height / 2;
      const dist = Math.abs(clientY - midY);

      if (dist < bestDist) {
        bestDist = dist;
        best = child;
      }
    }

    return best;
  }

  /**
   * Removes the dropzone--snap-preview class from all elements inside the
   * container. Called before applying a new preview to ensure only one
   * dropzone is highlighted at a time.
   */
  #clearSnapPreviews() {
    this.#dragContainer
      .querySelectorAll('.dropzone--snap-preview')
      .forEach((el) => el.classList.remove('dropzone--snap-preview'));
  }
}

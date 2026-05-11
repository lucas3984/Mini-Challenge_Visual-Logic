/**
 * Drag-and-drop block assembly component.
 *
 * Handles both mouse (native HTML5 drag-and-drop) and touch interactions for
 * moving code blocks from the sidebar palette into the workspace. Manages block
 * insertion order, container nesting (loop/if bodies), and enforces per-level
 * block limits for new palette blocks while blocking same-type nesting.
 * Designed to work via event delegation on a
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
  #onBlockChanged;
  #onDragStartCallback;
  #onDragEndCallback;
  #audio;
  #blockSwipeStartX;
  #blockSwipeBlock;
  #blockSwipeActive;
  #deleteModeBlock;
  #trashCan;
  #trashCanActive;

  /**
   * @param {HTMLElement} container - The root element for event delegation
   *   (typically the main app container).
   * @param {Object} [options]
   * @param {Function} [options.canAddBlock] - Returns true if another block may be added.
   * @param {Function} [options.canAddLoop] - Returns true if another loop block may be added.
   * @param {Function} [options.canAddIf] - Returns true if another if block may be added.
   * @param {Function} [options.onBlockChanged] - Called after any block add/remove.
   * @param {Function} [options.onDragStart] - Called when a touch drag starts.
   * @param {Function} [options.onDragEnd] - Called after a touch drag completes.
   * @param {Object} [options.audio] - AudioFX instance for snap/error sounds.
   */
  constructor(container, { canAddBlock, canAddLoop, canAddIf, onBlockChanged, onDragStart, onDragEnd, audio } = {}) {
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
    this.#onBlockChanged = onBlockChanged || (() => {});
    this.#onDragStartCallback = onDragStart || (() => {});
    this.#onDragEndCallback = onDragEnd || (() => {});
    this.#audio = audio || null;
    this.#bindEvents();
    this.#initTrashCan();
  }

  #initTrashCan() {
    this.#trashCan = document.createElement('div');
    this.#trashCan.className = 'trash-can';
    this.#trashCan.innerHTML = `
      <span class="material-symbols-outlined" aria-hidden="true">delete</span>
      <span class="trash-can__label">Solte para excluir</span>
    `;
    this.#trashCan.hidden = true;
    this.#trashCanActive = false;
    document.body.appendChild(this.#trashCan);
  }

  #showTrashCan() {
    if (!this.#trashCan) return;
    this.#trashCan.hidden = false;
    this.#trashCanActive = false;
    requestAnimationFrame(() => {
      this.#trashCan.classList.add('trash-can--visible');
    });
  }

  #hideTrashCan() {
    if (!this.#trashCan || this.#trashCan.hidden) return;
    this.#trashCan.classList.remove('trash-can--visible', 'trash-can--active');
    this.#trashCanActive = false;
    this.#trashCan.hidden = true;
  }

  #isOverTrashCan(x, y) {
    if (!this.#trashCan || this.#trashCan.hidden) return false;
    const rect = this.#trashCan.getBoundingClientRect();
    return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
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
    this._onBlockSwipeStartBound = (e) => this.#onBlockSwipeStart(e);
    this._onBlockSwipeMoveBound = (e) => this.#onBlockSwipeMove(e);
    this._onBlockSwipeEndBound = (e) => this.#onBlockSwipeEnd(e);
    this._onOutsideClickBound = (e) => this.#onOutsideClick(e);

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

    // Swipe-to-delete handlers (separate from drag)
    this.#dragContainer.addEventListener('touchstart', this._onBlockSwipeStartBound, { passive: false });
    this.#dragContainer.addEventListener('touchmove', this._onBlockSwipeMoveBound, { passive: false });
    this.#dragContainer.addEventListener('touchend', this._onBlockSwipeEndBound);

    // Keyboard listener is registered on document (not the container) so that
    // Delete/Escape work even when focus is inside the sidebar or workspace.
    document.addEventListener('keydown', this._onKeyDownBound);
    document.addEventListener('click', this._onOutsideClickBound);

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
    this.#dragContainer.removeEventListener('touchstart', this._onBlockSwipeStartBound);
    this.#dragContainer.removeEventListener('touchmove', this._onBlockSwipeMoveBound);
    this.#dragContainer.removeEventListener('touchend', this._onBlockSwipeEndBound);
    document.removeEventListener('keydown', this._onKeyDownBound);
    document.removeEventListener('click', this._onOutsideClickBound);
    this.#dragContainer.removeEventListener('click', this._onClickBound);
    if (this.#trashCan) {
      this.#trashCan.remove();
      this.#trashCan = null;
    }
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
      this.#clearDeleteMode();
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
    // Only new clones from the sidebar need to respect the level caps.
    // Moving blocks already in the workspace does not change the total count.
    if (isSidebarSource && !this.#canAddBlock()) {
      this.#showLimitWarning('block');
      this.#draggedBlock.classList.remove('block--dragging');
      this.#draggedBlock.style.opacity = '';
      this.#draggedBlock = null;
      this.#sourceContainer = null;
      return;
    }

    if (isSidebarSource && blockToInsert.classList.contains('c-block--loop') && !this.#canAddLoop()) {
      this.#showLimitWarning('loop');
      this.#draggedBlock.classList.remove('block--dragging');
      this.#draggedBlock.style.opacity = '';
      this.#draggedBlock = null;
      this.#sourceContainer = null;
      return;
    }

    if (isSidebarSource && blockToInsert.classList.contains('c-block--event') && !this.#canAddIf()) {
      this.#showLimitWarning('if');
      this.#draggedBlock.classList.remove('block--dragging');
      this.#draggedBlock.style.opacity = '';
      this.#draggedBlock = null;
      this.#sourceContainer = null;
      return;
    }

    if (targetDropzone.classList.contains('c-block__dropzone')) {
      const parentIf = targetDropzone.closest('.c-block--event');
      const parentLoop = targetDropzone.closest('.c-block--loop');

      // Prevent nesting an if-block inside another if-block.
      if (parentIf && blockToInsert.classList.contains('c-block--event')) {
        this.#showLimitWarning('ifnested');
        this.#draggedBlock.classList.remove('block--dragging');
        this.#draggedBlock.style.opacity = '';
        this.#draggedBlock = null;
        this.#sourceContainer = null;
        return;
      }

      // Loop dropzones do not accept nested loops
      if (parentLoop && blockToInsert.classList.contains('c-block--loop')) {
        this.#showLimitWarning('loopnested');
        this.#draggedBlock.classList.remove('block--dragging');
        this.#draggedBlock.style.opacity = '';
        this.#draggedBlock = null;
        this.#sourceContainer = null;
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

      // Notify that a drag started (e.g. to close sidebar)
      this.#onDragStartCallback();

      // Show trash can when dragging a workspace block
      if (!this.#isFromSidebar(block)) {
        this.#showTrashCan();
      }

      // Create a visual clone that follows the finger; pointer-events:none
      // ensures the clone itself doesn't intercept touch events.
      this.#touchClone = block.cloneNode(true);

      // Compute actual styles from original block (CSS vars are scoped to
      // .page--snake, so clone on document.body won't inherit them)
      const computed = getComputedStyle(block);
      this.#touchClone.style.background = computed.background;
      this.#touchClone.style.color = computed.color;
      this.#touchClone.style.borderColor = computed.borderColor;
      this.#touchClone.style.borderRadius = computed.borderRadius;
      this.#touchClone.style.padding = computed.padding;
      this.#touchClone.style.boxShadow = computed.boxShadow;

      this.#touchClone.style.position = 'fixed';
      this.#touchClone.style.pointerEvents = 'none';
      this.#touchClone.style.zIndex = '1000';
      this.#touchClone.style.opacity = '1';
      this.#touchClone.style.width = block.offsetWidth + 'px';
      document.body.appendChild(this.#touchClone);

      // Hide original block so it looks like it's being moved, not cloned
      if (!this.#isFromSidebar(block)) {
        this.#draggedBlock.style.opacity = '0';
      }
    }, 500);
  }

  /**
   * Moves the touch clone and updates dropzone previews. Calls
   * preventDefault() to suppress page scrolling while a drag is active.
   *
   * @param {TouchEvent} e
   */
  #onTouchMove(e) {
    // Always prevent default on touchmove to block browser swipe/scroll
    // This applies even during the long-press wait period
    e.preventDefault();

    if (!this.#longPressActive || !this.#draggedBlock) return;

    const touch = e.touches[0];
    const x = touch.clientX;
    const y = touch.clientY;

    // Edge scroll: accelerate scroll when near viewport boundaries
    const edgeThreshold = 50;
    const maxScrollSpeed = 25;
    const nearTop = y < edgeThreshold;
    const nearBottom = window.innerHeight - y < edgeThreshold;

    if (nearTop) {
      const intensity = 1 - (y / edgeThreshold);
      window.scrollBy(0, -Math.floor(intensity * maxScrollSpeed));
    } else if (nearBottom) {
      const intensity = 1 - ((window.innerHeight - y) / edgeThreshold);
      window.scrollBy(0, Math.floor(intensity * maxScrollSpeed));
    }

    if (this.#touchClone) {
      // Center the clone horizontally under the finger, offset upward so the
      // user can see what's below the touch point.
      this.#touchClone.style.left = x - this.#touchClone.offsetWidth / 2 + 'px';
      this.#touchClone.style.top = y - 20 + 'px';
    }

    // Update trash can hover state
    if (this.#trashCan && !this.#trashCan.hidden) {
      const over = this.#isOverTrashCan(x, y);
      if (over && !this.#trashCanActive) {
        this.#trashCanActive = true;
        this.#trashCan.classList.add('trash-can--active');
      } else if (!over && this.#trashCanActive) {
        this.#trashCanActive = false;
        this.#trashCan.classList.remove('trash-can--active');
      }
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
    // Clear any ongoing swipe state to prevent tap handler from firing after drag
    this.#blockSwipeBlock = null;
    this.#blockSwipeActive = false;

    const x = e.changedTouches[0].clientX;
    const y = e.changedTouches[0].clientY;

    // Check if dropped on trash can
    if (this.#isOverTrashCan(x, y)) {
      const isSidebarSource = this.#isFromSidebar(this.#sourceContainer || this.#draggedBlock);

      // Capture trash can position before hiding it
      if (this.#touchClone && this.#trashCan) {
        const trashRect = this.#trashCan.getBoundingClientRect();
        const tx = trashRect.left + trashRect.width / 2 - this.#touchClone.offsetWidth / 2;
        const ty = trashRect.top + trashRect.height / 2 - this.#touchClone.offsetHeight / 2;
        this.#touchClone.style.transition = 'all 300ms ease';
        this.#touchClone.style.left = tx + 'px';
        this.#touchClone.style.top = ty + 'px';
        this.#touchClone.style.transform = 'scale(0.2) rotate(20deg)';
        this.#touchClone.style.opacity = '0';
      }

      this.#hideTrashCan();

      if (isSidebarSource) {
        // Sidebar source: just cancel after animation
        setTimeout(() => {
          if (this.#touchClone) {
            this.#touchClone.remove();
            this.#touchClone = null;
          }
          this.#cleanupDrag();
        }, 300);
      } else {
        // Workspace source: delete the block after animation
        setTimeout(() => {
          if (this.#touchClone) {
            this.#touchClone.remove();
            this.#touchClone = null;
          }
          if (this.#draggedBlock) {
            this.#draggedBlock.remove();
            this.#onBlockChanged();
          }
          this.#cleanupDrag();
        }, 300);
      }
      return;
    }

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

    // --- Limit enforcement ---
    // Only new clones from the sidebar need to respect the level caps.
    // Moving blocks already in the workspace does not change the total count.
    if (isSidebarSource && !this.#canAddBlock()) {
      this.#showLimitWarning('block');
      this.#cleanupDrag();
      return;
    }

    if (isSidebarSource && blockToInsert.classList.contains('c-block--loop') && !this.#canAddLoop()) {
      this.#showLimitWarning('loop');
      this.#cleanupDrag();
      return;
    }

    if (isSidebarSource && blockToInsert.classList.contains('c-block--event') && !this.#canAddIf()) {
      this.#showLimitWarning('if');
      this.#cleanupDrag();
      return;
    }

    if (targetDropzone.classList.contains('c-block__dropzone')) {
      const parentIf = targetDropzone.closest('.c-block--event');
      const parentLoop = targetDropzone.closest('.c-block--loop');

      if (parentIf && blockToInsert.classList.contains('c-block--event')) {
        this.#showLimitWarning('ifnested');
        this.#cleanupDrag();
        return;
      }

      if (parentLoop && blockToInsert.classList.contains('c-block--loop')) {
        this.#showLimitWarning('loopnested');
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
   * @param {string} [type='block'] - Which limit was hit ('block', 'loop', 'if', 'ifnested', 'loopnested').
   */
  #showLimitWarning(type = 'block') {
    this.#audio?.play('error');
    const messages = {
      block: 'Limite de blocos atingido!',
      loop: 'Limite de loops atingido!',
      if: 'Limite de Se atingido!',
      ifnested: 'Não é permitido colocar um Se dentro de outro Se!',
      loopnested: 'Não é permitido colocar um Loop dentro de outro Loop!',
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
   * dropzone, limit blocked the insert, etc.) or after a successful drop.
   */
  #cleanupDrag() {
    this.#hideTrashCan();
    if (this.#draggedBlock) {
      this.#draggedBlock.classList.remove('block--dragging');
      this.#draggedBlock.style.opacity = '';
      this.#draggedBlock = null;
    }
    this.#sourceContainer = null;
    this.#onDragEndCallback();
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
      this.#clearDeleteMode();
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

  /**
   * Begins tracking a left-swipe gesture on a workspace block.
   * Only tracks blocks outside the sidebar; ignores blocks during active drag.
   */
  #onBlockSwipeStart(e) {
    if (this.#longPressActive) return;
    const block = this.#isDraggable(e.target);
    if (!block || block.closest('.sidebar')) return;

    this.#blockSwipeStartX = e.touches[0].clientX;
    this.#blockSwipeBlock = block;
    this.#blockSwipeActive = false;
  }

  /**
   * Translates the block horizontally following the finger for left-swipe.
   * Applies opacity fade based on distance. Only activates past a 10px dead zone.
   */
  #onBlockSwipeMove(e) {
    if (!this.#blockSwipeBlock || this.#longPressActive) return;

    const deltaX = e.touches[0].clientX - this.#blockSwipeStartX;

    if (deltaX < -10 && deltaX > -200) {
      this.#blockSwipeActive = true;
      this.#blockSwipeBlock.style.transform = `translateX(${deltaX}px)`;
      this.#blockSwipeBlock.style.opacity = 1 - (Math.abs(deltaX) / 300);
    }
  }

  /**
   * Completes the swipe: if the threshold (>60px left) is met, animates the
   * block off-screen and removes it. Otherwise treats it as a tap and
   * triggers delete-mode toggle.
   */
  #onBlockSwipeEnd(e) {
    if (!this.#blockSwipeBlock) return;

    const deltaX = e.changedTouches[0].clientX - this.#blockSwipeStartX;

    if (deltaX < -60 && this.#blockSwipeActive) {
      this.#blockSwipeBlock.style.transition = 'transform 200ms ease, opacity 200ms ease';
      this.#blockSwipeBlock.style.transform = 'translateX(-120%)';
      this.#blockSwipeBlock.style.opacity = '0';
      setTimeout(() => {
        if (this.#blockSwipeBlock && this.#blockSwipeBlock.parentNode) {
          this.#blockSwipeBlock.remove();
          this.#onBlockChanged();
          this.#audio?.play('snap');
        }
        this.#blockSwipeBlock = null;
      }, 200);
    } else {
      // No significant swipe — treat as tap
      if (!this.#blockSwipeActive) {
        e.tapHandled = true;
        this.#onBlockTap(e);
      }
      this.#blockSwipeBlock.style.transition = 'transform 200ms ease, opacity 200ms ease';
      this.#blockSwipeBlock.style.transform = '';
      this.#blockSwipeBlock.style.opacity = '';
      setTimeout(() => {
        if (this.#blockSwipeBlock) this.#blockSwipeBlock.style.transition = '';
      }, 200);
    }

    this.#blockSwipeActive = false;
  }

  /**
   * Toggles delete mode on a workspace block when tapped (mobile only).
   * Shows the existing delete button; clicking the button or tapping outside
   * clears delete mode.
   */
  #onBlockTap(e) {
    if (this.#longPressActive || this.#blockSwipeActive) return;
    const block = this.#isDraggable(e.target);
    if (!block || block.closest('.sidebar')) return;

    // If tapping the delete button itself, let the click handler handle it.
    if (e.target.classList.contains('block__delete-btn')) return;

    this.#clearDeleteMode();
    block.classList.add('block--delete-mode');
    this.#deleteModeBlock = block;
  }

  /**
   * Removes the delete-mode class from the currently active block.
   */
  #clearDeleteMode() {
    if (this.#deleteModeBlock) {
      this.#deleteModeBlock.classList.remove('block--delete-mode');
      this.#deleteModeBlock = null;
    }
  }

  /**
   * Clears delete mode when clicking outside the active block.
   */
  #onOutsideClick(e) {
    if (this.#deleteModeBlock && !this.#deleteModeBlock.contains(e.target)) {
      this.#clearDeleteMode();
    }
  }
}

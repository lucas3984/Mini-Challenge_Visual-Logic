import { Component } from './base.js';

const ROWS = 8;
const COLS = 8;

const SPRITE_PATHS = {
  'snake-head': 'src/assets/images/sprites/snake-sprites/snake-head.svg',
  'snake-body': 'src/assets/images/sprites/snake-sprites/snake-body.svg',
  'apple': 'src/assets/images/sprites/snake-sprites/apple.svg',
  'wall': 'src/assets/images/sprites/snake-sprites/wall.svg',
};

const DIRECTION_ARROWS = {
  right: '\u2192',
  down: '\u2193',
  left: '\u2190',
  up: '\u2191',
};

export class CreatorBoard extends Component {
  #state;
  #gridEl;
  #undoBtn;
  #redoBtn;
  #toastEl;
  #hoverRow;
  #hoverCol;
  #cleanup;
  #touchStartRow;
  #touchStartCol;
  #touchCurrentRow;
  #touchCurrentCol;
  #longPressTimer;
  #longPressActive;
  #touchClone;
  #startX;
  #startY;
  #trashCan;
  #trashCanActive;

  constructor({ state } = {}) {
    super();
    this.#state = state;
    this.#hoverRow = -1;
    this.#hoverCol = -1;
    this.#cleanup = [];
    this.#touchStartRow = -1;
    this.#touchStartCol = -1;
    this.#touchCurrentRow = -1;
    this.#touchCurrentCol = -1;
    this.#longPressActive = false;
    this.#touchClone = null;
    this.#trashCan = null;
    this.#trashCanActive = false;
  }

  // ── Rendering ──

  render() {
    const section = document.createElement('section');
    section.className = 'creator-board';
    section.setAttribute('aria-label', 'Tabuleiro do jogo');

    const grid = document.createElement('div');
    grid.className = 'creator-board__grid';
    grid.setAttribute('role', 'grid');
    grid.setAttribute('aria-label', 'Tabuleiro 8x8');
    this.#gridEl = grid;

    for (let r = 0; r < ROWS; r++) {
      const row = document.createElement('div');
      row.setAttribute('role', 'row');
      for (let c = 0; c < COLS; c++) {
        const cell = this.#buildCell(r, c);
        row.appendChild(cell);
      }
      grid.appendChild(row);
    }

    section.appendChild(grid);

    const controls = document.createElement('div');
    controls.className = 'creator-board__controls';

    this.#undoBtn = this.#ctrlBtn('undo-btn', 'Desfazer', 'src/assets/images/icons/snake-icons/icon-hub.svg');
    this.#undoBtn.disabled = !this.#state.canUndo();
    controls.appendChild(this.#undoBtn);

    this.#redoBtn = this.#ctrlBtn('redo-btn', 'Refazer', 'src/assets/images/icons/snake-icons/icon-reset.svg');
    this.#redoBtn.disabled = !this.#state.canRedo();
    controls.appendChild(this.#redoBtn);

    const tuneFab = document.createElement('button');
    tuneFab.className = 'creator-board__fab creator-board__fab--properties';
    tuneFab.type = 'button';
    tuneFab.setAttribute('aria-label', 'Abrir propriedades');
    tuneFab.setAttribute('aria-expanded', 'false');
    tuneFab.setAttribute('aria-controls', 'drawer-properties');
    tuneFab.dataset.drawer = 'properties';
    const tuneIcon = document.createElement('span');
    tuneIcon.className = 'material-symbols-outlined';
    tuneIcon.textContent = 'tune';
    tuneFab.appendChild(tuneIcon);
    controls.appendChild(tuneFab);

    section.appendChild(controls);

    this.#toastEl = document.createElement('div');
    this.#toastEl.className = 'creator-board__toast';
    this.#toastEl.setAttribute('aria-live', 'polite');
    this.#toastEl.hidden = true;
    section.appendChild(this.#toastEl);

    this.#initTrashCan();
    this.#bindEvents();
    const gridChange = () => this.#syncCells();
    const historyChange = ({ canUndo, canRedo }) => {
      this.#undoBtn.disabled = !canUndo;
      this.#redoBtn.disabled = !canRedo;
    };
    this.#state.on('grid-change', gridChange);
    this.#state.on('history-change', historyChange);
    this.#cleanup.push(() => this.#state.off('grid-change', gridChange));
    this.#cleanup.push(() => this.#state.off('history-change', historyChange));

    return section;
  }

  #buildCell(r, c) {
    const cell = document.createElement('div');
    cell.className = 'creator-board__cell';
    cell.setAttribute('role', 'gridcell');
    cell.setAttribute('tabindex', '0');
    cell.dataset.row = String(r);
    cell.dataset.col = String(c);
    return cell;
  }

  // ── Cell sync ──

  #syncCells() {
    const grid = this.#state.getGrid();
    const cells = this.#gridEl.querySelectorAll('.creator-board__cell');
    cells.forEach((cell) => {
      const r = parseInt(cell.dataset.row, 10);
      const c = parseInt(cell.dataset.col, 10);
      const val = grid[r][c];

      cell.innerHTML = '';
      cell.removeAttribute('style');

      cell.classList.remove(
        'creator-board__cell--wall',
        'creator-board__cell--snake',
        'creator-board__cell--apple',
        'creator-board__cell--occupied',
        'creator-board__cell--dragging',
        'creator-board__cell--drop-target',
        'creator-board__cell--drop-valid',
        'creator-board__cell--drop-invalid'
      );

      cell.removeAttribute('draggable');

      if (!val) return;

      cell.classList.add('creator-board__cell--occupied');

      let typeClass;
      if (val.type === 'wall') typeClass = 'creator-board__cell--wall';
      else if (val.type === 'snake-head' || val.type === 'snake-body') typeClass = 'creator-board__cell--snake';
      else if (val.type === 'apple') typeClass = 'creator-board__cell--apple';
      if (typeClass) cell.classList.add(typeClass);

      cell.draggable = true;

      const img = document.createElement('img');
      img.className = 'creator-board__sprite';
      if (val.type === 'snake-head') {
        img.classList.add(`creator-board__sprite--${val.direction || 'right'}`);
      }
      img.src = SPRITE_PATHS[val.type] || '';
      img.alt = '';
      img.width = 48;
      img.height = 48;
      cell.appendChild(img);

      if (val.type === 'snake-head') {
        const dirIndicator = document.createElement('span');
        dirIndicator.className = 'creator-board__direction-badge';
        dirIndicator.textContent = DIRECTION_ARROWS[val.direction || 'right'] || '';
        dirIndicator.setAttribute('aria-label', `Direção: ${val.direction || 'right'}`);
        cell.appendChild(dirIndicator);
      }
    });
  }

  #ctrlBtn(id, label, iconSrc) {
    const btn = document.createElement('button');
    btn.id = id;
    btn.className = 'creator-board__ctrl-btn';
    btn.type = 'button';
    btn.setAttribute('aria-label', label);
    const img = document.createElement('img');
    img.className = 'creator-board__ctrl-icon';
    img.src = iconSrc;
    img.alt = '';
    img.setAttribute('aria-hidden', 'true');
    img.width = 20;
    img.height = 20;
    btn.appendChild(img);
    return btn;
  }

  #initTrashCan() {
    this.#trashCan = document.createElement('div');
    this.#trashCan.className = 'creator-board__trash-can';
    this.#trashCan.innerHTML = `
      <span class="material-symbols-outlined" aria-hidden="true">delete</span>
      <span class="creator-board__trash-can-label">Solte para excluir</span>
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
      this.#trashCan.classList.add('creator-board__trash-can--visible');
    });
  }

  #hideTrashCan() {
    if (!this.#trashCan || this.#trashCan.hidden) return;
    this.#trashCan.classList.remove('creator-board__trash-can--visible', 'creator-board__trash-can--active');
    this.#trashCanActive = false;
    this.#trashCan.hidden = true;
  }

  #isOverTrashCan(x, y) {
    if (!this.#trashCan || this.#trashCan.hidden) return false;
    const rect = this.#trashCan.getBoundingClientRect();
    return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
  }

  // ── Event binding ──

  #bindEvents() {
    const grid = this.#gridEl;

    this.#trackListener(grid, 'click', (e) => {
      const cell = e.target.closest('.creator-board__cell');
      if (!cell) return;
      const r = parseInt(cell.dataset.row, 10);
      const c = parseInt(cell.dataset.col, 10);
      const val = this.#state.getCell(r, c);

      if (this.#state.selectedAsset && !val) {
        const result = this.#state.setCell(r, c, { type: this.#state.selectedAsset });
        if (!result.success) this.#showToast(result.reason);
      } else if (!this.#state.selectedAsset && val && val.type === 'snake-head') {
        this.#state.rotateHead(r, c);
      }
    });

    this.#trackListener(this.#undoBtn, 'click', () => this.#state.undo());
    this.#trackListener(this.#redoBtn, 'click', () => this.#state.redo());

    // Grid drag = move (cut + paste within the board)
    this.#trackListener(grid, 'dragstart', (e) => {
      const cell = e.target.closest('.creator-board__cell');
      if (!cell) return;
      const r = parseInt(cell.dataset.row, 10);
      const c = parseInt(cell.dataset.col, 10);
      const val = this.#state.getCell(r, c);
      if (!val) return;

      e.dataTransfer.setData('application/x-creator-grid', JSON.stringify({ fromRow: r, fromCol: c, type: val.type }));
      e.dataTransfer.effectAllowed = 'move';
      cell.classList.add('creator-board__cell--dragging');

      const sprite = cell.querySelector('.creator-board__sprite');
      if (sprite) e.dataTransfer.setDragImage(sprite, 24, 24);
    });

    this.#trackListener(grid, 'dragend', (e) => {
      const cell = e.target.closest('.creator-board__cell');
      if (cell) cell.classList.remove('creator-board__cell--dragging');
      this.#clearHover();
    });

    // Two drag sources: grid (move) and palette (copy) — check which one is active
    this.#trackListener(grid, 'dragover', (e) => {
      const cell = e.target.closest('.creator-board__cell');
      if (!cell) return;
      e.preventDefault();
      const r = parseInt(cell.dataset.row, 10);
      const c = parseInt(cell.dataset.col, 10);

      if (r !== this.#hoverRow || c !== this.#hoverCol) {
        this.#clearHover();
        this.#hoverRow = r;
        this.#hoverCol = c;
      }

      const gridData = e.dataTransfer.types.includes('application/x-creator-grid');
      const assetData = e.dataTransfer.types.includes('application/x-creator-asset');

      if (gridData) {
        cell.classList.add('creator-board__cell--drop-target');
        e.dataTransfer.dropEffect = 'move';
      } else if (assetData && !this.#state.getCell(r, c)) {
        const assetType = e.dataTransfer.getData('application/x-creator-asset');
        if (assetType === 'snake-body') {
          const valid = this.#hasAdjacentSnake(r, c);
          cell.classList.add(valid ? 'creator-board__cell--drop-valid' : 'creator-board__cell--drop-invalid');
        } else if (assetType === 'snake-head') {
          const hasHead = this.#hasSnakeHead();
          cell.classList.add(hasHead ? 'creator-board__cell--drop-invalid' : 'creator-board__cell--drop-valid');
        } else {
          cell.classList.add('creator-board__cell--drop-valid');
        }
        e.dataTransfer.dropEffect = 'copy';
      }
    });

    this.#trackListener(grid, 'dragleave', (e) => {
      const cell = e.target.closest('.creator-board__cell');
      if (!cell) return;
      cell.classList.remove('creator-board__cell--drop-target', 'creator-board__cell--drop-valid', 'creator-board__cell--drop-invalid');
    });

    this.#trackListener(grid, 'drop', (e) => {
      e.preventDefault();
      const cell = e.target.closest('.creator-board__cell');
      if (!cell) return;
      const r = parseInt(cell.dataset.row, 10);
      const c = parseInt(cell.dataset.col, 10);

      cell.classList.remove('creator-board__cell--drop-target', 'creator-board__cell--drop-valid', 'creator-board__cell--drop-invalid');
      this.#clearHover();

      // Grid drag = move existing cell; asset drag = place new cell from palette
      const gridData = e.dataTransfer.getData('application/x-creator-grid');
      const assetData = e.dataTransfer.getData('application/x-creator-asset');

      if (gridData) {
        try {
          const { fromRow, fromCol } = JSON.parse(gridData);
          const result = this.#state.moveCell(fromRow, fromCol, r, c);
          if (!result.success) this.#showToast(result.reason);
        } catch (err) {
          console.warn('Failed to parse grid drag data on drop:', err);
        }
      } else if (assetData) {
        const result = this.#state.setCell(r, c, { type: assetData });
        if (!result.success) this.#showToast(result.reason);
      }
    });

    // Touch events for mobile drag-and-drop
    this.#trackListener(grid, 'touchstart', (e) => this.#onTouchStart(e), { passive: false });
    this.#trackListener(grid, 'touchmove', (e) => this.#onTouchMove(e), { passive: false });
    this.#trackListener(grid, 'touchend', (e) => this.#onTouchEnd(e));
  }

  // Delegates to state.canPlaceBody — validates full body placement rules
  #hasAdjacentSnake(row, col) {
    return this.#state.canPlaceBody(row, col).valid;
  }

  // Only one snake head allowed — check existence before placing another
  #hasSnakeHead() {
    const grid = this.#state.getGrid();
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (grid[r][c] && grid[r][c].type === 'snake-head') return true;
      }
    }
    return false;
  }

  #onTouchStart(e) {
    const cell = e.target.closest('.creator-board__cell');
    if (!cell) return;
    const r = parseInt(cell.dataset.row, 10);
    const c = parseInt(cell.dataset.col, 10);
    const val = this.#state.getCell(r, c);
    if (!val) return;

    e.preventDefault();

    this.#startX = e.touches[0].clientX;
    this.#startY = e.touches[0].clientY;
    this.#touchStartRow = r;
    this.#touchStartCol = c;

    clearTimeout(this.#longPressTimer);
    this.#longPressTimer = setTimeout(() => {
      this.#longPressActive = true;
      this.#touchClone = cell.cloneNode(true);
      this.#touchClone.style.position = 'fixed';
      this.#touchClone.style.pointerEvents = 'none';
      this.#touchClone.style.zIndex = '1000';
      this.#touchClone.style.opacity = '0.8';
      this.#touchClone.style.width = cell.offsetWidth + 'px';
      this.#touchClone.style.height = cell.offsetHeight + 'px';
      document.body.appendChild(this.#touchClone);

      cell.classList.add('creator-board__cell--dragging');
      document.body.style.overscrollBehavior = 'none';
      this.#showTrashCan();

      const sprite = cell.querySelector('.creator-board__sprite');
      if (sprite) {
        const img = this.#touchClone.querySelector('.creator-board__sprite');
        if (img) {
          img.style.transform = sprite.style.transform;
        }
      }
    }, 500);
  }

  #onTouchMove(e) {
    if (!this.#longPressActive || !this.#touchClone) return;
    e.preventDefault();

    const touch = e.touches[0];
    const x = touch.clientX;
    const y = touch.clientY;

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

    this.#touchClone.style.left = x - this.#touchClone.offsetWidth / 2 + 'px';
    this.#touchClone.style.top = y - 20 + 'px';

    if (this.#trashCan && !this.#trashCan.hidden) {
      const over = this.#isOverTrashCan(x, y);
      if (over && !this.#trashCanActive) {
        this.#trashCanActive = true;
        this.#trashCan.classList.add('creator-board__trash-can--active');
      } else if (!over && this.#trashCanActive) {
        this.#trashCanActive = false;
        this.#trashCan.classList.remove('creator-board__trash-can--active');
      }
    }

    this.#clearHover();
    this.#clearDropHighlights();
    const targetCell = this.#findCellFromPoint(x, y);
    if (targetCell) {
      const r = parseInt(targetCell.dataset.row, 10);
      const c = parseInt(targetCell.dataset.col, 10);
      this.#touchCurrentRow = r;
      this.#touchCurrentCol = c;

      const sourceVal = this.#state.getCell(this.#touchStartRow, this.#touchStartCol);
      const targetVal = this.#state.getCell(r, c);

      if (sourceVal && !targetVal) {
        targetCell.classList.add('creator-board__cell--drop-valid');
      } else if (sourceVal && targetVal && (r !== this.#touchStartRow || c !== this.#touchStartCol)) {
        targetCell.classList.add('creator-board__cell--drop-target');
      }
    }
  }

  #onTouchEnd(e) {
    clearTimeout(this.#longPressTimer);

    if (!this.#longPressActive || !this.#touchClone) {
      this.#longPressActive = false;
      return;
    }

    this.#longPressActive = false;

    const touch = e.changedTouches[0];
    const x = touch.clientX;
    const y = touch.clientY;

    if (this.#isOverTrashCan(x, y)) {
      if (this.#touchClone) {
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

      setTimeout(() => {
        if (this.#touchClone) {
          this.#touchClone.remove();
          this.#touchClone = null;
        }
        if (this.#touchStartRow >= 0 && this.#touchStartCol >= 0) {
          this.#state.clearCell(this.#touchStartRow, this.#touchStartCol);
        }
        this.#cleanupTouch();
      }, 300);
      return;
    }

    if (this.#touchClone) {
      this.#touchClone.remove();
      this.#touchClone = null;
    }

    this.#clearHover();
    const targetCell = this.#findCellFromPoint(x, y);
    if (!targetCell) {
      this.#cleanupTouch();
      return;
    }

    const r = parseInt(targetCell.dataset.row, 10);
    const c = parseInt(targetCell.dataset.col, 10);

    targetCell.classList.remove('creator-board__cell--drop-target', 'creator-board__cell--drop-valid', 'creator-board__cell--drop-invalid');

    if (r === this.#touchStartRow && c === this.#touchStartCol) {
      this.#cleanupTouch();
      return;
    }

    const result = this.#state.moveCell(this.#touchStartRow, this.#touchStartCol, r, c);
    if (!result.success) {
      this.#showToast(result.reason);
    }

    this.#cleanupTouch();
  }

  #findCellFromPoint(x, y) {
    this.#touchClone.style.display = 'none';
    const el = document.elementFromPoint(x, y);
    this.#touchClone.style.display = '';
    if (!el) return null;
    return el.closest('.creator-board__cell');
  }

  #clearDropHighlights() {
    this.#gridEl.querySelectorAll('.creator-board__cell').forEach(cell => {
      cell.classList.remove('creator-board__cell--drop-target', 'creator-board__cell--drop-valid', 'creator-board__cell--drop-invalid');
    });
  }

  #cleanupTouch() {
    this.#hideTrashCan();
    this.#clearDropHighlights();
    if (this.#touchClone) {
      this.#touchClone.remove();
      this.#touchClone = null;
    }
    const startCell = this.#gridEl.querySelector(`[data-row="${this.#touchStartRow}"][data-col="${this.#touchStartCol}"]`);
    if (startCell) {
      startCell.classList.remove('creator-board__cell--dragging');
    }
    document.body.style.overscrollBehavior = '';
    this.#touchStartRow = -1;
    this.#touchStartCol = -1;
    this.#touchCurrentRow = -1;
    this.#touchCurrentCol = -1;
  }

  #trackListener(target, event, handler) {
    target.addEventListener(event, handler);
    this.#cleanup.push(() => target.removeEventListener(event, handler));
  }

  unmount() {
    this.#cleanup.forEach(fn => fn());
    this.#cleanup = [];
    if (this.#trashCan) {
      this.#trashCan.remove();
      this.#trashCan = null;
    }
    super.unmount();
  }

  #clearHover() {
    this.#hoverRow = -1;
    this.#hoverCol = -1;
  }

  // Store timeout reference on the element to cancel on subsequent calls (prevents stale toasts)
  #showToast(msg) {
    if (!this.#toastEl) return;
    this.#toastEl.textContent = msg;
    this.#toastEl.hidden = false;
    clearTimeout(this.#toastEl._timeout);
    this.#toastEl._timeout = setTimeout(() => {
      this.#toastEl.hidden = true;
    }, 2000);
  }
}

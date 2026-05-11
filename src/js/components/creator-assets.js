import { Component } from './base.js';

// Snake-head and snake-body have tooltips explaining placement rules
// Apple and wall are self-explanatory — no tooltip needed
const ASSETS = [
  {
    id: 'snake-head',
    label: 'Cabeça da Cobra',
    previewClass: 'creator-assets__preview--snake',
    tooltip: 'Gire a cabeça clicando nela dentro do Grid. Apenas uma cabeça, sem Ouroboros.',
    src: 'src/assets/images/sprites/snake-sprites/snake-head.svg',
  },
  {
    id: 'snake-body',
    label: 'Corpo da Cobra',
    previewClass: 'creator-assets__preview--body',
    tooltip: 'Corpo deve ser adjacente à cabeça ou a outro corpo (não diagonal).',
    src: 'src/assets/images/sprites/snake-sprites/snake-body.svg',
  },
  {
    id: 'apple',
    label: 'Maçã',
    previewClass: null,
    tooltip: null,
    src: 'src/assets/images/sprites/snake-sprites/apple.svg',
  },
  {
    id: 'wall',
    label: 'Parede',
    previewClass: null,
    tooltip: null,
    src: 'src/assets/images/sprites/snake-sprites/wall.svg',
  },
];

export class CreatorAssets extends Component {
  #trackListener(target, event, handler) {
    target.addEventListener(event, handler);
    this.#cleanup.push(() => target.removeEventListener(event, handler));
  }

  unmount() {
    this.#cleanup.forEach(fn => fn());
    this.#cleanup = [];
    super.unmount();
  }
  #state;
  #items;
  #listEl;
  #cleanup;
  #longPressTimer;
  #longPressActive;
  #touchClone;
  #startX;
  #startY;
  #currentAssetId;

  constructor({ state } = {}) {
    super();
    this.#state = state;
    this.#items = ASSETS;
    this.#cleanup = [];
    this.#longPressActive = false;
    this.#touchClone = null;
    this.#currentAssetId = null;
  }

  render() {
    const aside = document.createElement('aside');
    aside.className = 'creator-assets';
    aside.setAttribute('aria-label', 'Paleta de elementos');

    const title = document.createElement('h2');
    title.className = 'creator-assets__title';
    title.textContent = 'Elementos';
    aside.appendChild(title);

    const list = document.createElement('div');
    list.className = 'creator-assets__list';
    list.setAttribute('role', 'list');
    this.#listEl = list;

    this.#items.forEach((item) => {
      const btn = document.createElement('button');
      btn.className = 'creator-assets__item';
      btn.type = 'button';
      btn.draggable = true;
      btn.setAttribute('aria-label', item.label);
      btn.setAttribute('role', 'listitem');
      btn.dataset.assetId = item.id;

      const preview = document.createElement('div');
      preview.className = `creator-assets__preview${item.previewClass ? ` ${item.previewClass}` : ''}`;

      const img = document.createElement('img');
      img.className = 'creator-assets__sprite';
      img.src = item.src;
      img.alt = '';
      img.width = 48;
      img.height = 48;
      preview.appendChild(img);
      btn.appendChild(preview);

      const label = document.createElement('span');
      label.className = 'creator-assets__label';
      label.textContent = item.label;
      btn.appendChild(label);

      if (item.tooltip) {
        const tooltip = document.createElement('div');
        tooltip.className = 'creator-assets__tooltip';
        tooltip.setAttribute('role', 'tooltip');
        tooltip.textContent = item.tooltip;
        btn.appendChild(tooltip);
      }

      const onClick = () => {
        if (this.#state) {
          this.#state.selectedAsset = item.id;
        }
      };
      btn.addEventListener('click', onClick);
      this.#cleanup.push(() => btn.removeEventListener('click', onClick));

      const onDragStart = (e) => {
        e.dataTransfer.setData('application/x-creator-asset', item.id);
        e.dataTransfer.effectAllowed = 'copy';
        const preview = btn.querySelector('.creator-assets__preview');
        if (preview) e.dataTransfer.setDragImage(preview, 24, 24);
      };
      btn.addEventListener('dragstart', onDragStart);
      this.#cleanup.push(() => btn.removeEventListener('dragstart', onDragStart));

      const onTouchStart = (e) => this.#onTouchStart(e, item.id);
      btn.addEventListener('touchstart', onTouchStart, { passive: false });
      this.#cleanup.push(() => btn.removeEventListener('touchstart', onTouchStart));

      const onTouchMove = (e) => this.#onTouchMove(e);
      document.addEventListener('touchmove', onTouchMove, { passive: false });
      this.#cleanup.push(() => document.removeEventListener('touchmove', onTouchMove));

      const onTouchEnd = (e) => this.#onTouchEnd(e);
      document.addEventListener('touchend', onTouchEnd);
      this.#cleanup.push(() => document.removeEventListener('touchend', onTouchEnd));

      list.appendChild(btn);
    });

    aside.appendChild(list);

    const tip = document.createElement('div');
    tip.className = 'creator-assets__tip';

    const tipText = document.createElement('p');
    tipText.className = 'creator-assets__tip-text';
    tipText.textContent = 'Dica: Clique num elemento e depois no grid para posicionar, ou arraste da paleta direto para o grid. Arraste elementos dentro do grid para mover. Arraste para esta paleta para remover. Clique na cabeça da cobra para girá-la. Mover a cabeça remove o corpo.';
    tip.appendChild(tipText);

    aside.appendChild(tip);

    if (this.#state) {
      const onSelectionChange = () => this.#syncSelection();
      this.#state.on('selection-change', onSelectionChange);
      this.#cleanup.push(() => this.#state.off('selection-change', onSelectionChange));

      this.#trackListener(aside, 'dragover', (e) => {
        if (e.dataTransfer.types.includes('application/x-creator-grid')) {
          e.preventDefault();
          aside.classList.add('creator-assets--drop-target');
          e.dataTransfer.dropEffect = 'move';
        }
      });

      this.#trackListener(aside, 'dragleave', (e) => {
        if (!aside.contains(e.relatedTarget)) {
          aside.classList.remove('creator-assets--drop-target');
        }
      });

      // Dropping a grid element on the palette acts as a trash zone — deletes it
      this.#trackListener(aside, 'drop', (e) => {
        e.preventDefault();
        aside.classList.remove('creator-assets--drop-target');
        const raw = e.dataTransfer.getData('application/x-creator-grid');
        if (!raw) return;
        try {
          const { fromRow, fromCol } = JSON.parse(raw);
          this.#state.clearCell(fromRow, fromCol);
        } catch (err) {
          console.warn('Failed to parse grid drag data during drop on palette:', err);
        }
      });
    }

    return aside;
  }

  #syncSelection() {
    const selected = this.#state ? this.#state.selectedAsset : null;
    const items = this.#listEl.querySelectorAll('.creator-assets__item');
    items.forEach((btn) => {
      btn.classList.toggle('creator-assets__item--selected', btn.dataset.assetId === selected);
    });
  }

  #onTouchStart(e, assetId) {
    const btn = e.target.closest('.creator-assets__item');
    if (!btn) return;

    e.preventDefault();

    this.#startX = e.touches[0].clientX;
    this.#startY = e.touches[0].clientY;
    this.#currentAssetId = assetId;

    clearTimeout(this.#longPressTimer);
    this.#longPressTimer = setTimeout(() => {
      this.#longPressActive = true;

      const preview = btn.querySelector('.creator-assets__preview');
      if (!preview) return;

      this.#touchClone = preview.cloneNode(true);
      this.#touchClone.style.position = 'fixed';
      this.#touchClone.style.pointerEvents = 'none';
      this.#touchClone.style.zIndex = '1000';
      this.#touchClone.style.opacity = '0.9';
      this.#touchClone.style.width = preview.offsetWidth + 'px';
      this.#touchClone.style.height = preview.offsetHeight + 'px';
      document.body.appendChild(this.#touchClone);

      btn.classList.add('creator-assets__item--dragging');
      document.body.style.overscrollBehavior = 'none';
    }, 300);
  }

  #onTouchMove(e) {
    if (!this.#longPressActive || !this.#touchClone) return;

    e.preventDefault();

    const touch = e.touches[0];
    const x = touch.clientX;
    const y = touch.clientY;

    this.#touchClone.style.left = x - this.#touchClone.offsetWidth / 2 + 'px';
    this.#touchClone.style.top = y - 20 + 'px';
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

    this.#touchClone.style.display = 'none';
    const el = document.elementFromPoint(x, y);
    this.#touchClone.style.display = '';

    const cell = el ? el.closest('.creator-board__cell') : null;

    if (this.#touchClone) {
      this.#touchClone.remove();
      this.#touchClone = null;
    }

    const btn = this.#listEl.querySelector(`[data-asset-id="${this.#currentAssetId}"]`);
    if (btn) {
      btn.classList.remove('creator-assets__item--dragging');
    }
    document.body.style.overscrollBehavior = '';

    if (!cell) {
      this.#currentAssetId = null;
      return;
    }

    const r = parseInt(cell.dataset.row, 10);
    const c = parseInt(cell.dataset.col, 10);

    if (this.#state) {
      const result = this.#state.setCell(r, c, { type: this.#currentAssetId });
      if (!result.success) {
        const board = cell.closest('.creator-board');
        if (board) {
          const toast = board.querySelector('.creator-board__toast');
          if (toast) {
            toast.textContent = result.reason;
            toast.hidden = false;
            clearTimeout(toast._timeout);
            toast._timeout = setTimeout(() => {
              toast.hidden = true;
            }, 2000);
          }
        }
      }
    }

    this.#currentAssetId = null;
  }

}

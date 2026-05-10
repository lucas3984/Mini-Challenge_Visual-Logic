import { Component } from './base.js';

const ROWS = 8;
const COLS = 8;

export class CreatorBoard extends Component {
  #gridEl = null;

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
        const cell = document.createElement('div');
        cell.className = 'creator-board__cell';
        cell.setAttribute('role', 'gridcell');
        cell.setAttribute('tabindex', '0');
        cell.dataset.row = String(r);
        cell.dataset.col = String(c);
        row.appendChild(cell);
      }
      grid.appendChild(row);
    }

    section.appendChild(grid);

    const controls = document.createElement('div');
    controls.className = 'creator-board__controls';

    const undoBtn = this.#ctrlBtn('Desfazer', 'src/assets/images/icons/snake-icons/icon-hub.svg');
    controls.appendChild(undoBtn);

    const redoBtn = this.#ctrlBtn('Refazer', 'src/assets/images/icons/snake-icons/icon-reset.svg');
    controls.appendChild(redoBtn);

    const tuneFab = document.createElement('button');
    tuneFab.className = 'creator-board__fab creator-board__fab--properties';
    tuneFab.type = 'button';
    tuneFab.setAttribute('aria-label', 'Abrir propriedades');
    tuneFab.setAttribute('aria-expanded', 'false');
    tuneFab.setAttribute('aria-controls', 'drawer-properties');
    tuneFab.dataset.drawer = 'properties';
    tuneFab.innerHTML = '<span class="material-symbols-outlined">tune</span>';
    controls.appendChild(tuneFab);

    section.appendChild(controls);

    return section;
  }

  #ctrlBtn(label, iconSrc) {
    const btn = document.createElement('button');
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
}

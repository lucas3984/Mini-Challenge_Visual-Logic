import { Component } from './base.js';

const ASSETS = [
  {
    id: 'snake-head',
    label: 'Cabeça da Cobra',
    previewClass: 'creator-assets__preview--snake',
    spriteClass: null,
    tooltip: 'Gire a cabeça clicando nela dentro do Grid. Apenas uma cabeça, sem Ouroboros.',
    src: '../src/assets/images/sprites/snake-sprites/snake-head.svg',
  },
  {
    id: 'snake-body',
    label: 'Corpo da Cobra',
    previewClass: 'creator-assets__preview--body',
    spriteClass: null,
    tooltip: null,
    src: '../src/assets/images/sprites/snake-sprites/snake-body.svg',
  },
  {
    id: 'apple',
    label: 'Maçã',
    previewClass: null,
    spriteClass: null,
    tooltip: null,
    src: '../src/assets/images/sprites/snake-sprites/apple.svg',
  },
  {
    id: 'wall',
    label: 'Parede',
    previewClass: null,
    spriteClass: null,
    tooltip: null,
    src: '../src/assets/images/sprites/snake-sprites/wall.svg',
  },
];

export class CreatorAssets extends Component {
  #items = [];
  #onSelect = null;

  constructor({ onSelect } = {}) {
    super();
    this.#items = ASSETS;
    this.#onSelect = typeof onSelect === 'function' ? onSelect : null;
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

    this.#items.forEach((item) => {
      const btn = document.createElement('button');
      btn.className = 'creator-assets__item';
      btn.type = 'button';
      btn.setAttribute('draggable', 'true');
      btn.setAttribute('aria-label', item.label);
      btn.setAttribute('role', 'listitem');

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

      btn.addEventListener('click', () => {
        if (this.#onSelect) this.#onSelect(item.id);
      });

      list.appendChild(btn);
    });

    aside.appendChild(list);

    const tip = document.createElement('div');
    tip.className = 'creator-assets__tip';

    const tipText = document.createElement('p');
    tipText.className = 'creator-assets__tip-text';
    tipText.textContent = 'Dica: Arraste e solte os elementos no tabuleiro para construir o percurso.';
    tip.appendChild(tipText);

    aside.appendChild(tip);

    return aside;
  }
}

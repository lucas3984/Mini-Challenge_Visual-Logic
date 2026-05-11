/**
 * LevelMap component - renders the visual map container
 * Uses SVG for path lines connecting the phase nodes
 * Extends Component base class for lifecycle consistency
 */
import { Component } from './base.js';
import { LevelNode } from './level-node.js';

export class LevelMap extends Component {
  #levels;
  #onLevelSelect;
  #layout;
  #customMode;
  #onToggleCustom;
  #customLevelsCount;

  constructor({ levels, onLevelSelect, layout, customMode, onToggleCustom, customLevelsCount }) {
    super();
    this.#levels = levels;
    this.#onLevelSelect = onLevelSelect;
    this.#layout = layout || { width: 0, height: 0 };
    this.#customMode = customMode;
    this.#onToggleCustom = onToggleCustom;
    this.#customLevelsCount = customLevelsCount || 0;
  }

  render() {
    const map = document.createElement('section');
    map.className = 'map';

    const toggle = this.#buildToggle();
    if (toggle) {
      map.appendChild(toggle);
    }

    const scrollContainer = document.createElement('div');
    scrollContainer.className = 'map__scroll';

    const track = document.createElement('div');
    track.className = 'map__track';
    track.style.width = `${this.#layout.width}px`;
    track.style.height = `${this.#layout.height}px`;

    // SVG requires explicit namespace for proper DOM manipulation
    // Lines render behind nodes to create visual depth
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'map__svg');
    svg.setAttribute('preserveAspectRatio', 'none');
    svg.setAttribute('viewBox', `0 0 ${this.#layout.width || 1} ${this.#layout.height || 1}`);
    svg.setAttribute('width', `${this.#layout.width || 1}`);
    svg.setAttribute('height', `${this.#layout.height || 1}`);

    // Connect consecutive level nodes with SVG lines to show progression path
    for (let i = 0; i < this.#levels.length - 1; i++) {
      const current = this.#levels[i];
      const next = this.#levels[i + 1];

      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('class', 'map__line');
      line.setAttribute('x1', parseFloat(current.position.x));
      line.setAttribute('y1', parseFloat(current.position.y));
      line.setAttribute('x2', parseFloat(next.position.x));
      line.setAttribute('y2', parseFloat(next.position.y));
      svg.appendChild(line);
    }

    track.appendChild(svg);

    // Layer nodes above SVG to allow click interaction (SVG doesn't support click events reliably)
    const nodesContainer = document.createElement('div');
    nodesContainer.className = 'map__nodes';
    nodesContainer.style.width = `${this.#layout.width}px`;
    nodesContainer.style.height = `${this.#layout.height}px`;

    this.#levels.forEach((level) => {
      const node = new LevelNode({
        level,
        onSelect: this.#onLevelSelect,
      });
      nodesContainer.appendChild(node.render());
    });

    track.appendChild(nodesContainer);
    scrollContainer.appendChild(track);
    map.appendChild(scrollContainer);

    return map;
  }

  #buildToggle() {
    if (this.#customMode === undefined) return null;

    const wrapper = document.createElement('div');
    wrapper.className = 'map__toggle';

    const btnNormal = document.createElement('button');
    btnNormal.className = `map__toggle-btn${this.#customMode ? '' : ' map__toggle-btn--active'}`;
    btnNormal.textContent = 'Originais';
    btnNormal.setAttribute('aria-pressed', this.#customMode ? 'false' : 'true');
    btnNormal.addEventListener('click', () => {
      if (this.#customMode && this.#onToggleCustom) {
        this.#onToggleCustom(false);
      }
    });

    const btnCustom = document.createElement('button');
    btnCustom.className = `map__toggle-btn${this.#customMode ? ' map__toggle-btn--active' : ''}`;
    btnCustom.textContent = `Personalizadas${this.#customLevelsCount > 0 ? ` (${this.#customLevelsCount})` : ''}`;
    btnCustom.setAttribute('aria-pressed', this.#customMode ? 'true' : 'false');
    btnCustom.addEventListener('click', () => {
      if (!this.#customMode && this.#onToggleCustom) {
        this.#onToggleCustom(true);
      }
    });

    wrapper.appendChild(btnNormal);
    wrapper.appendChild(btnCustom);

    return wrapper;
  }
}

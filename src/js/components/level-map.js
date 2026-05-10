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

  constructor({ levels, onLevelSelect, layout }) {
    super();
    this.#levels = levels;
    this.#onLevelSelect = onLevelSelect;
    this.#layout = layout || { width: 0, height: 0 };
  }

  render() {
    const map = document.createElement('section');
    map.className = 'map';

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
      line.setAttribute('x1', current.position.x);
      line.setAttribute('y1', current.position.y);
      line.setAttribute('x2', next.position.x);
      line.setAttribute('y2', next.position.y);
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
    map.appendChild(track);

    return map;
  }
}

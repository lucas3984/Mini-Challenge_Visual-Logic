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

  constructor({ levels, onLevelSelect }) {
    super();
    this.#levels = levels;
    this.#onLevelSelect = onLevelSelect;
  }

  render() {
    const map = document.createElement('section');
    map.className = 'map';

    // SVG requires explicit namespace for proper DOM manipulation
    // Lines render behind nodes to create visual depth
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'map__svg');
    svg.setAttribute('preserveAspectRatio', 'none');

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

    map.appendChild(svg);

    // Layer nodes above SVG to allow click interaction (SVG doesn't support click events reliably)
    const nodesContainer = document.createElement('div');
    nodesContainer.className = 'map__nodes';

    this.#levels.forEach((level) => {
      const node = new LevelNode({
        level,
        onSelect: this.#onLevelSelect,
      });
      nodesContainer.appendChild(node.render());
    });

    map.appendChild(nodesContainer);

    return map;
  }
}

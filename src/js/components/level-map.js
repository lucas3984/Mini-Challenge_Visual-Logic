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

    // SVG layer: path lines connecting nodes (dashed style)
    // Using createElementNS for proper SVG namespace
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'map__svg');
    svg.setAttribute('preserveAspectRatio', 'none');

  // Generate connecting lines dynamically from level positions
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

    // Nodes container: absolute-positioned nodes on top of SVG
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

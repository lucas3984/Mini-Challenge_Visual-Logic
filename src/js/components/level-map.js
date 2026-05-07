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

    // Path lines: hardcoded to match mock level positions
    // Will be dynamic when real data/level editor is implemented
    const lines = [
      { x1: '20%', y1: '60%', x2: '35%', y2: '40%' },
      { x1: '35%', y1: '40%', x2: '50%', y2: '60%' },
      { x1: '50%', y1: '60%', x2: '65%', y2: '35%' },
      { x1: '65%', y1: '35%', x2: '80%', y2: '55%' },
    ];

    lines.forEach(({ x1, y1, x2, y2 }) => {
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('class', 'map__line');
      line.setAttribute('x1', x1);
      line.setAttribute('y1', y1);
      line.setAttribute('x2', x2);
      line.setAttribute('y2', y2);
      svg.appendChild(line);
    });

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

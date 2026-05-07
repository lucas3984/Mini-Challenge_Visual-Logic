/**
 * LevelNode component - renders a single phase node in the visual map
 * Extends Component base class for consistent lifecycle (mount/unmount)
 */
import { Component } from './base.js';

export class LevelNode extends Component {
  #level;
  #onSelect;

  constructor({ level, onSelect }) {
    super();
    this.#level = level;
    this.#onSelect = onSelect;
  }

  render() {
    const { id, status, label, number } = this.#level;
    const node = document.createElement('div');
    node.className = `node node--${status}`;
    // Inline positioning: allows dynamic layout based on level data
    node.style.left = this.#level.position.x;
    node.style.top = this.#level.position.y;

    const circle = document.createElement('div');
    circle.className = 'node__circle';
    // Accessibility: describe phase number and status for screen readers
    circle.setAttribute('aria-label', `Fase ${String(id).padStart(2, '0')} - ${this.#getStatusLabel(status)}`);

    // Render different content based on status:
    // - locked: lock icon (no interaction)
    // - completed: filled star icon
    // - active/unlocked: show level number
    if (status === 'locked') {
      circle.innerHTML = `<span class="material-symbols-outlined text-outline icon-lg">lock</span>`;
    } else if (status === 'completed') {
      circle.innerHTML = `<span class="material-symbols-outlined text-on-secondary icon-xl" style="font-variation-settings: 'FILL' 1;">star</span>`;
    } else {
      circle.innerHTML = `<span class="text-on-secondary font-h3 font-bold">${number || String(id).padStart(2, '0')}</span>`;
    }

    // Only non-locked nodes are interactive
    if (status !== 'locked' && this.#onSelect) {
      circle.addEventListener('click', () => this.#onSelect(this.#level));
      circle.style.cursor = 'pointer';
    }

    const labelEl = document.createElement('span');
    labelEl.className = 'node__label';
    labelEl.textContent = label;

    node.appendChild(circle);
    node.appendChild(labelEl);

    return node;
  }

  // Maps internal status keys to Portuguese labels for accessibility
  #getStatusLabel(status) {
    const labels = {
      completed: 'Concluída',
      active: 'Atual',
      unlocked: 'Liberada',
      locked: 'Bloqueada',
    };
    return labels[status] || status;
  }
}

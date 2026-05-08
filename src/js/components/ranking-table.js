/**
 * RankingTable component - displays top players with scores
 * Extends Component base class for lifecycle consistency
 */
import { Component } from './base.js';
import { escapeHtml } from '../utils/sanitize.js';

export class RankingTable extends Component {
  #ranking;

  constructor({ ranking = [] }) {
    super();
    this.#ranking = ranking;
  }

  render() {
    const section = document.createElement('section');
    section.className = 'ranking';

    // Header with icon and title
    const header = document.createElement('div');
    header.className = 'ranking__header';

    const titleContainer = document.createElement('div');
    titleContainer.className = 'ranking__title-container';

    const icon = document.createElement('span');
    icon.className = 'material-symbols-outlined ranking__icon icon-md';
    icon.textContent = 'bar_chart';

    const title = document.createElement('h3');
    title.className = 'ranking__title';
    title.textContent = 'Ranking';

    titleContainer.appendChild(icon);
    titleContainer.appendChild(title);
    header.appendChild(titleContainer);
    section.appendChild(header);

    // Scrollable table container for responsive layout
    const tableContainer = document.createElement('div');
    tableContainer.className = 'table-container';

    const table = document.createElement('table');
    table.className = 'table';

    table.appendChild(this.#createHeader());
    table.appendChild(this.#createBody());

    tableContainer.appendChild(table);
    section.appendChild(tableContainer);

    return section;
  }

  // Creates table header with column names
  #createHeader() {
    const thead = document.createElement('thead');
    thead.className = 'table__header';

    const tr = document.createElement('tr');
    ['Posição', 'Usuário', 'Pontuação', 'Data'].forEach((text) => {
      const th = document.createElement('th');
      th.className = 'table__header-cell';
      th.textContent = text;
      tr.appendChild(th);
    });

    thead.appendChild(tr);
    return thead;
  }

  // Creates table body with ranking entries
  #createBody() {
    const tbody = document.createElement('tbody');
    tbody.className = 'table__body';

    // Empty state: no scores yet while neither the profile system nor level completion saving is active
    if (this.#ranking.length === 0) {
      const tr = document.createElement('tr');
      const td = document.createElement('td');
      td.setAttribute('colspan', '4');
      td.textContent = 'Ninguém ainda? Seja o primeiro!';
      td.className = 'table__cell table__cell--empty';
      tr.appendChild(td);
      tbody.appendChild(tr);
      return tbody;
    }

    this.#ranking.forEach((entry) => {
      const tr = document.createElement('tr');
      tr.className = 'table__row';

      // Position cell: special badge for 1st place
      const posCell = document.createElement('td');
      posCell.className = 'table__cell';
      posCell.innerHTML = `
        <div class="position-badge">
          <span class="position-badge__circle ${entry.isFirst ? 'position-badge__circle--first' : 'position-badge__circle--other'}">${entry.position}º</span>
        </div>
      `;

      // Name cell with user icon
      const nameCell = document.createElement('td');
      nameCell.className = 'table__cell';
      nameCell.innerHTML = `
        <div class="table__user">
          <span class="table__user-name">${escapeHtml(entry.name)}</span>
        </div>
      `;

      // Score cell with star icon
      const scoreCell = document.createElement('td');
      scoreCell.className = 'table__cell table__cell--bold';
      scoreCell.innerHTML = `${entry.score} <span class="material-symbols-outlined">star</span>`;

      // Date cell with muted text
      const dateCell = document.createElement('td');
      dateCell.className = 'table__cell text-on-surface-variant';
      dateCell.textContent = entry.date;

      tr.appendChild(posCell);
      tr.appendChild(nameCell);
      tr.appendChild(scoreCell);
      tr.appendChild(dateCell);
      tbody.appendChild(tr);
    });

    return tbody;
  }
}

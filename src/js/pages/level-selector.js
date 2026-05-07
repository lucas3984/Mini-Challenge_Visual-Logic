/**
 * Level Selector Page
 * Renders the phase map with nodes and ranking table
 * Accepts levels as parameter for future real data integration
 */
import { LevelMap } from '../components/level-map.js';
import { RankingTable } from '../components/ranking-table.js';

// Mock data: will be replaced with real data source later
// Position coordinates match the SVG path lines in LevelMap
const MOCK_LEVELS = [
  { id: 1, status: 'completed', label: 'Fase 01', position: { x: '20%', y: '60%' } },
  { id: 2, status: 'active', label: 'Atual', position: { x: '35%', y: '40%' } },
  { id: 3, status: 'unlocked', label: 'Liberada', position: { x: '50%', y: '60%' } },
  { id: 4, status: 'locked', label: '04', position: { x: '65%', y: '35%' } },
  { id: 5, status: 'locked', label: '05', position: { x: '80%', y: '55%' } },
];

export function render(levels = MOCK_LEVELS) {
  const main = document.createElement('main');
  main.className = 'main';

  // Section header: title area for the page
  const sectionHeader = createSectionHeader();
  main.appendChild(sectionHeader);

  // Placeholder handler: will navigate to puzzle page in future
  const onLevelSelect = (level) => {
    console.log('Selected level:', level);
  };

  const levelMap = new LevelMap({ levels, onLevelSelect });
  main.appendChild(levelMap.render());

  // Ranking table: shows top players (mock data for now)
  const rankingTable = new RankingTable({});
  main.appendChild(rankingTable.render());

  return main;
}

// Creates the page header with subtitle and title
function createSectionHeader() {
  const header = document.createElement('div');
  header.className = 'section-header';

  const subtitle = document.createElement('span');
  subtitle.className = 'section-header__subtitle font-label-caps';
  subtitle.textContent = 'Seleção de Fases';

  const title = document.createElement('h2');
  title.className = 'section-header__title';
  title.textContent = 'Modo Labirinto Lógico';

  header.appendChild(subtitle);
  header.appendChild(title);

  return header;
}

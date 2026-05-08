/**
 * Level Selector Page
 * Renders the phase map with nodes and ranking table
 * Accepts levels as parameter for future real data integration
 */
import { LevelMap } from '../components/level-map.js';
import { RankingTable } from '../components/ranking-table.js';
import { levels } from '../engine/levels.js';
import { getItem } from '../core/storage.js';

/**
 * Dynamically generates position coordinates for level nodes.
 * Creates a smooth sine-wave path across the map container.
 * @param {number} totalLevels - Number of levels to generate positions for
 * @returns {Array<{id: number, x: string, y: string}>} Position objects with percentage values
 */
function generateLevelPositions(totalLevels) {
  if (totalLevels === 0) return [];

  // Layout constants (percentage-based for responsiveness)
  const X_START = 15;   // Left margin (% of container width)
  const X_END = 85;     // Right margin (% of container width)
  const Y_BASE = 50;    // Center Y position (% of container height)
  const Y_AMPLITUDE = 10; // Max Y variation from center (%)

  const positions = [];

  for (let i = 0; i < totalLevels; i++) {
    // X: evenly spaced between X_START and X_END
    const x = totalLevels === 1
      ? 50 // Center single level
      : X_START + (i / (totalLevels - 1)) * (X_END - X_START);

    // Y: sine wave for smooth vertical variation
    const xNormalized = totalLevels === 1 ? 0.5 : i / (totalLevels - 1);
    const angle = xNormalized * Math.PI; // Half sine cycle (0 to π)
    const yOffset = Math.sin(angle) * Y_AMPLITUDE;
    const y = Y_BASE + yOffset;

    positions.push({
      id: i + 1, // Level IDs start at 1
      x: `${x.toFixed(1)}%`,
      y: `${y.toFixed(1)}%`
    });
  }

  return positions;
}

/**
 * Transforms engine levels with status and positioning for the level map.
 * @returns {Array<Object>} Levels with id, name, status, label, number, position
 */
function buildLevelMapData() {
  const highestCompleted = parseInt(getItem('snake-progress') || '0', 10);
  const totalLevels = levels.length;
  const generatedPositions = generateLevelPositions(totalLevels);

  return levels.map((level) => {
    // Match position by level ID (assumes sequential IDs)
    const position = generatedPositions.find(p => p.id === level.id) ||
                    { x: '50%', y: '50%' }; // Fallback to center

    let status;
    if (level.id <= highestCompleted) {
      status = 'completed';
    } else if (level.id === highestCompleted + 1) {
      status = 'active';
    } else {
      status = 'locked';
    }

    return {
      id: level.id,
      name: level.name,
      status,
      label: `Fase ${String(level.id).padStart(2, '0')}`,
      number: String(level.id).padStart(2, '0'),
      position: { x: position.x, y: position.y },
    };
  });
}

export function render() {
  const main = document.createElement('main');
  main.className = 'main';

  // Section header: title area for the page
  const sectionHeader = createSectionHeader();
  main.appendChild(sectionHeader);

  const onLevelSelect = (level) => {
    location.hash = `#/snake/${level.id}`;
  };

  const levelsData = buildLevelMapData();
  const levelMap = new LevelMap({ levels: levelsData, onLevelSelect });
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

/**
 * Level Selector Page
 * Renders the phase map with nodes and ranking table
 * Accepts gameId parameter to support multiple games
 */
import { LevelMap } from '../components/level-map.js';
import { RankingTable } from '../components/ranking-table.js';
import { getItem, removeItem } from '../core/storage.js';
import { getGameScores } from '../core/level-score-storage.js';
import { buildOverallRankings, sortOverallRankings } from '../utils/ranking.js';
import { GAME_CONFIG } from '../config/games.js';

/**
 * Dynamically generates position coordinates for level nodes.
 * Creates a zig-zag pattern across the map container with slight height variation.
 * Odd-indexed levels (1, 3, 5...) are positioned at Y_BASE - AMPLITUDE (high).
 * Even-indexed levels (2, 4, 6...) are positioned at Y_BASE + AMPLITUDE (low).
 * A small deterministic variation is added to each Y position for visual interest.
 * @param {number} totalLevels - Number of levels to generate positions for
 * @returns {Array<{id: number, x: string, y: string}>} Position objects with percentage values
 */
function generateLevelPositions(totalLevels) {
  if (totalLevels === 0) return [];

  // Layout constants (percentage-based for responsiveness)
  const X_START = 15;   // Left margin (% of container width)
  const X_END = 85;     // Right margin (% of container width)
  const Y_BASE = 50;    // Center Y position (% of container height)
  const Y_AMPLITUDE = 10; // Max Y variation from center for zig-zag (%)
  const Y_VARIATION = 3;  // Small variation to add visual interest (%)

  const positions = [];

  for (let i = 0; i < totalLevels; i++) {
    // Evenly distribute levels horizontally to use available container width
    const x = totalLevels === 1
      ? 50 // Center single level
      : X_START + (i / (totalLevels - 1)) * (X_END - X_START);

    // Zig-zag creates visual interest and clear separation between consecutive levels
    // Alternating high/low positions prevent overlapping when SVG lines are drawn
    const isHigh = (i + 1) % 2 === 1; // Level 1, 3, 5... are high
    const zigzagOffset = isHigh ? -Y_AMPLITUDE : Y_AMPLITUDE;

    // Add small deterministic variation to avoid perfectly straight lines
    // Using a sine wave with different frequency for natural-looking variation
    const variation = Math.sin(i * 1.5) * Y_VARIATION;

    const y = Y_BASE + zigzagOffset + variation;

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
 * @param {Object} config - Game configuration from GAME_CONFIG
 * @returns {Array<Object>} Levels with id, name, status, label, number, position
 */
function buildLevelMapData(config) {
  const { levels, progressKey } = config;
  const highestCompleted = parseInt(getItem(progressKey) || '0', 10);
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

export function render({ gameId = 'snake' } = {}) {
  const config = GAME_CONFIG[gameId];
  if (!config) {
    throw new Error(`Unknown game: ${gameId}`);
  }

  const main = document.createElement('main');
  main.className = 'main';

  const topAppBar = new TopAppBar();
  const currentHash = location.hash;
  const activeIndex = BottomNav.getActiveIndex(currentHash);
  const bottomNav = new BottomNav(null, activeIndex);

  main.appendChild(topAppBar.render());

  const sectionHeader = createSectionHeader(config);
  main.appendChild(sectionHeader);

   const onLevelSelect = (level) => {
    location.hash = `#/levels/${gameId}/${level.id}`;
  };

  const levelsData = buildLevelMapData(config);
  const levelMap = new LevelMap({ levels: levelsData, onLevelSelect });
  main.appendChild(levelMap.render());

  const gameScores = getGameScores(gameId);
  const rankings = sortOverallRankings(buildOverallRankings(gameScores));
  const tableData = rankings.map((entry, index) => ({
    position: index + 1,
    name: entry.profileName,
    score: entry.totalStars,
    date: new Date(entry.latestTimestamp).toLocaleDateString('pt-BR'),
    isFirst: index === 0,
  }));
  const rankingTable = new RankingTable({ ranking: tableData });
  main.appendChild(rankingTable.render());

  main.appendChild(bottomNav.render());

  return main;
}

// Reusable header factory that reads display text from game configuration
function createSectionHeader(config) {
  const header = document.createElement('div');
  header.className = 'section-header';

  const subtitle = document.createElement('span');
  subtitle.className = 'section-header__subtitle font-label-caps';
  subtitle.textContent = config.levelSelectorSubtitle;

  const title = document.createElement('h2');
  title.className = 'section-header__title';
  title.textContent = config.levelSelectorTitle;

  header.appendChild(subtitle);
  header.appendChild(title);

  if (config.resetLevels) {
    const resetBtn = document.createElement('button');
    resetBtn.className = 'section-header__reset-btn';
    resetBtn.setAttribute('aria-label', 'Regenerar todas as fases');
    resetBtn.textContent = 'Regenerar fases';
    resetBtn.addEventListener('click', () => {
      if (confirm('Isso vai apagar todas as fases e ranking atual. Continuar?')) {
        config.resetLevels();
        location.hash = `#/levels/${gameId}`;
        location.reload();
      }
    });
    header.appendChild(resetBtn);
  }

  return header;
}

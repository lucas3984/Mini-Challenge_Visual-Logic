/**
 * Level Selector Page
 * Renders the phase map with nodes and ranking table
 * Accepts gameId parameter to support multiple games
 */
import { LevelMap } from '../components/level-map.js';
import { RankingTable } from '../components/ranking-table.js';
import { TopAppBar } from '../components/top-app-bar.js';
import { getGameScores } from '../core/level-score-storage.js';
import { buildOverallRankings, sortOverallRankings } from '../utils/ranking.js';
import { GAME_CONFIG } from '../config/games.js';
import { hasAnyProfile, getActiveProfile } from '../core/profile.js';
import { getGameProgress, getGameCurrentLevel, setGameMapScroll } from '../core/profile-data.js';
import { getGameLevels, ensureGeneratedLevelsForProgress } from '../engine/level-registry.js';
import { navigateTo } from '../core/router-state.js';

/**
 * Builds the horizontal journey layout and positions for each level node.
 * The map grows to the right so new generated phases can be appended without
 * shifting the existing nodes.
 * @param {number} totalLevels - Number of levels to generate positions for
 * @returns {{ positions: Array<{id: number, x: string, y: string}>, width: number, height: number }}
 */
function buildLevelMapLayout(totalLevels) {
  if (totalLevels === 0) {
    return { positions: [], width: 0, height: 0 };
  }

  const NODE_SPACING = 220;
  const X_MARGIN = 120;
  const MAP_HEIGHT = 320;
  const Y_CENTER = MAP_HEIGHT / 2;
  const Y_OFFSET = 26;
  const Y_VARIATION = 10;

  const positions = [];

  for (let i = 0; i < totalLevels; i++) {
    const x = X_MARGIN + (i * NODE_SPACING);
    const baseY = Y_CENTER + ((i % 2 === 0) ? -Y_OFFSET : Y_OFFSET);
    const y = baseY + Math.sin(i * 1.35) * Y_VARIATION;

    positions.push({
      id: i + 1,
      x: `${x}px`,
      y: `${y.toFixed(1)}px`,
    });
  }

  return {
    positions,
    width: X_MARGIN * 2 + ((totalLevels - 1) * NODE_SPACING),
    height: MAP_HEIGHT,
  };
}

/**
 * Transforms engine levels with status and positioning for the level map.
 * @param {Object} config - Game configuration from GAME_CONFIG
 * @param {string} gameId - Game identifier (for reading per-profile progress)
 * @returns {{ levels: Array<Object>, layout: { width: number, height: number } }}
 */
function buildLevelMapData(gameId) {
  const highestCompleted = getGameProgress(getActiveProfile(), gameId);
  ensureGeneratedLevelsForProgress(gameId, highestCompleted);
  const levels = getGameLevels(gameId);
  const totalLevels = levels.length;
  const layout = buildLevelMapLayout(totalLevels);

  return {
    levels: levels.map((level) => {
      // Match position by level ID (assumes sequential IDs)
      const position = layout.positions.find((p) => p.id === level.id) || { x: '0px', y: '0px' };

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
        isGenerated: Boolean(level.generated),
      };
    }),
    layout,
  };
}

export function render({ gameId = 'snake' } = {}) {
  // Redirect to home if no profile is set (first-time access guard)
  if (!hasAnyProfile()) {
    navigateTo('/');
    return document.createElement('div');
  }

  const config = GAME_CONFIG[gameId];
  if (!config) {
    throw new Error(`Unknown game: ${gameId}`);
  }

  const main = document.createElement('main');
  main.className = 'main';

  const topAppBar = new TopAppBar();

  main.appendChild(topAppBar.render());

  const sectionHeader = createSectionHeader(config);
  main.appendChild(sectionHeader);

  const onLevelSelect = (level) => {
    navigateTo(`/levels/${gameId}/${level.id}`);
  };

  const { levels: levelsData, layout } = buildLevelMapData(gameId);
  const levelMap = new LevelMap({ levels: levelsData, onLevelSelect, layout });
  main.appendChild(levelMap.render());

  const mapEl = main.querySelector('.map');
  if (mapEl) {
    const profile = getActiveProfile();
    const currentLevelIndex = profile ? getGameCurrentLevel(profile, gameId) : 0;

    let dragState = null;
    let suppressClickUntil = 0;

    const stopDrag = () => {
      if (!dragState) return;
      dragState = null;
      mapEl.classList.remove('map--dragging');
    };

    mapEl.addEventListener('pointerdown', (event) => {
      if (event.button !== 0 && event.pointerType !== 'touch') return;

      dragState = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        startScrollLeft: mapEl.scrollLeft,
        isDragging: false,
      };

      suppressClickUntil = 0;
      mapEl.setPointerCapture(event.pointerId);
    });

    mapEl.addEventListener('pointermove', (event) => {
      if (!dragState || dragState.pointerId !== event.pointerId) return;

      const deltaX = event.clientX - dragState.startX;
      const deltaY = event.clientY - dragState.startY;

      if (!dragState.isDragging) {
        if (Math.abs(deltaX) < 4 && Math.abs(deltaY) < 4) return;
        dragState.isDragging = true;
        mapEl.classList.add('map--dragging');
      }

      if (Math.abs(deltaX) >= Math.abs(deltaY)) {
        event.preventDefault();
        mapEl.scrollLeft = dragState.startScrollLeft - deltaX;
      }
    });

    mapEl.addEventListener('pointerup', (event) => {
      if (!dragState || dragState.pointerId !== event.pointerId) return;

      if (dragState.isDragging) {
        suppressClickUntil = Date.now() + 250;
      }

      stopDrag();
      mapEl.releasePointerCapture(event.pointerId);
    });

    mapEl.addEventListener('pointercancel', (event) => {
      if (!dragState || dragState.pointerId !== event.pointerId) return;
      stopDrag();
      mapEl.releasePointerCapture(event.pointerId);
    });

    mapEl.addEventListener('click', (event) => {
      if (Date.now() < suppressClickUntil) {
        event.preventDefault();
        event.stopPropagation();
      }
    }, true);

    const restoreScroll = () => {
      const focusIndex = Math.max(0, Math.min(currentLevelIndex, levelsData.length - 1));
      const focusNode = mapEl.querySelectorAll('.node')[focusIndex];
      if (focusNode) {
        const focusLeft = focusNode.offsetLeft + (focusNode.offsetWidth / 2);
        mapEl.scrollLeft = Math.max(0, focusLeft - (mapEl.clientWidth / 2));
        return;
      }

      const activeNode = mapEl.querySelector('.node--active');
      if (activeNode) {
        const activeLeft = activeNode.offsetLeft + (activeNode.offsetWidth / 2);
        mapEl.scrollLeft = Math.max(0, activeLeft - (mapEl.clientWidth / 2));
      }
    };

    requestAnimationFrame(restoreScroll);

    let scrollTimer = null;
    mapEl.addEventListener('scroll', () => {
      if (!profile) return;
      window.clearTimeout(scrollTimer);
      scrollTimer = window.setTimeout(() => {
        setGameMapScroll(profile, gameId, mapEl.scrollLeft);
      }, 120);
    }, { passive: true });
  }

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

  return header;
}

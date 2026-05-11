import { LevelMap } from '../components/level-map.js';
import { RankingTable } from '../components/ranking-table.js';
import { getGameScores } from '../core/level-score-storage.js';
import { buildOverallRankings, sortOverallRankings } from '../utils/ranking.js';
import { GAME_CONFIG } from '../config/games.js';
import { hasAnyProfile, getActiveProfile } from '../core/profile.js';
import { getGameProgress, getGameCurrentLevel, setGameMapScroll, getLastGameType, setLastGameType } from '../core/profile-data.js';
import { getGameLevels, ensureGeneratedLevelsForProgress } from '../engine/level-registry.js';
import { navigateTo } from '../core/router-state.js';
import { getJSON } from '../core/storage.js';
import { getCustomLevelData, getCustomLevelRankings } from '../core/custom-level-storage.js';

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

function buildLevelMapData(gameId) {
  const highestCompleted = getGameProgress(getActiveProfile(), gameId);
  ensureGeneratedLevelsForProgress(gameId, highestCompleted);
  const levels = getGameLevels(gameId);
  const totalLevels = levels.length;
  const layout = buildLevelMapLayout(totalLevels);

  return {
    levels: levels.map((level) => {
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

function buildCustomLevelMapData(gameId) {
  const customLevels = getJSON('lv_custom_levels') || [];
  const profile = getActiveProfile();
  const customData = profile ? getCustomLevelData(profile) : { completed: {}, currentLevel: null };
  const totalLevels = customLevels.length;
  const layout = buildLevelMapLayout(totalLevels);

  return {
    levels: customLevels.map((level, index) => {
      const position = layout.positions[index] || { x: '0px', y: '0px' };

      let status;
      const levelId = level.id;
      if (customData.completed[levelId]) {
        status = 'completed';
      } else if (customData.currentLevel === levelId) {
        status = 'active';
      } else {
        status = 'unlocked';
      }

      return {
        id: levelId,
        name: level.name,
        status,
        label: level.name,
        number: String(index + 1).padStart(2, '0'),
        position: { x: position.x, y: position.y },
        isGenerated: false,
      };
    }),
    layout,
  };
}

function createEmptyCustomState() {
  const emptyState = document.createElement('div');
  emptyState.className = 'map__empty';

  const text = document.createElement('p');
  text.className = 'map__empty-text';
  text.textContent = 'Nenhuma fase personalizada';

  const action = document.createElement('a');
  action.className = 'map__empty-action';
  action.href = '#/creator';
  action.textContent = 'Criar uma no editor';

  emptyState.appendChild(text);
  emptyState.appendChild(action);
  return emptyState;
}

export function render({ gameId = 'snake' } = {}) {
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

  const sectionHeader = createSectionHeader(config);
  main.appendChild(sectionHeader);

  const contentEl = document.createElement('div');
  contentEl.className = 'level-selector-content';
  main.appendChild(contentEl);

  const profile = getActiveProfile();
  let isCustom = profile ? getLastGameType(profile, gameId) === 'custom' : false;

  function renderContent() {
    contentEl.innerHTML = '';

    const onLevelSelect = isCustom
      ? (level) => navigateTo(`/levels/${gameId}/custom/${level.id}`)
      : (level) => navigateTo(`/levels/${gameId}/${level.id}`);

    const onToggleCustom = (showCustom) => {
      isCustom = showCustom;
      setLastGameType(getActiveProfile(), gameId, showCustom ? 'custom' : 'normal');
      renderContent();
    };

    const customLevels = getJSON('lv_custom_levels') || [];
    const customLevelsCount = customLevels.length;

    if (isCustom) {
      if (customLevelsCount === 0) {
        const levelMap = new LevelMap({
          levels: [],
          onLevelSelect,
          layout: { width: 0, height: 0 },
          customMode: true,
          onToggleCustom,
          customLevelsCount: 0,
        });
        const mapEl = levelMap.render();
        const scrollEl = mapEl.querySelector('.map__scroll');
        if (scrollEl) {
          const emptyState = createEmptyCustomState();
          scrollEl.appendChild(emptyState);
        }
        contentEl.appendChild(mapEl);
        return;
      }

      const { levels: levelsData, layout } = buildCustomLevelMapData(gameId);
      const levelMap = new LevelMap({
        levels: levelsData,
        onLevelSelect,
        layout,
        customMode: true,
        onToggleCustom,
        customLevelsCount,
      });
      contentEl.appendChild(levelMap.render());

      const customRankings = getCustomLevelRankings();
      const tableData = customRankings.map((entry, index) => ({
        position: index + 1,
        name: entry.profileName,
        score: entry.totalStars,
        date: new Date(entry.latestTimestamp).toLocaleDateString('pt-BR'),
        isFirst: index === 0,
      }));
      const rankingTable = new RankingTable({ ranking: tableData });
      contentEl.appendChild(rankingTable.render());
    } else {
      const { levels: levelsData, layout } = buildLevelMapData(gameId);
      const levelMap = new LevelMap({
        levels: levelsData,
        onLevelSelect,
        layout,
        customMode: false,
        onToggleCustom,
        customLevelsCount,
      });
      contentEl.appendChild(levelMap.render());

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
      contentEl.appendChild(rankingTable.render());
    }

    const mapEl = contentEl.querySelector('.map');
    const scrollEl = mapEl ? mapEl.querySelector('.map__scroll') : null;

    if (!mapEl || !scrollEl) return;

    const profile = getActiveProfile();
    const currentLevelIndex = profile ? getGameCurrentLevel(profile, gameId) : 0;

    let dragState = null;
    let suppressClickUntil = 0;

    const stopDrag = () => {
      if (!dragState) return;
      dragState = null;
      mapEl.classList.remove('map--dragging');
    };

    scrollEl.addEventListener('pointerdown', (event) => {
      if (event.button !== 0 && event.pointerType !== 'touch') return;
      if (event.target instanceof Element && event.target.closest('.node')) return;

      dragState = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        startScrollLeft: scrollEl.scrollLeft,
        isDragging: false,
      };

      suppressClickUntil = 0;
      scrollEl.setPointerCapture(event.pointerId);
    });

    scrollEl.addEventListener('pointermove', (event) => {
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
        scrollEl.scrollLeft = dragState.startScrollLeft - deltaX;
      }
    });

    scrollEl.addEventListener('pointerup', (event) => {
      if (!dragState || dragState.pointerId !== event.pointerId) return;

      if (dragState.isDragging) {
        suppressClickUntil = Date.now() + 250;
      }

      stopDrag();
      scrollEl.releasePointerCapture(event.pointerId);
    });

    scrollEl.addEventListener('pointercancel', (event) => {
      if (!dragState || dragState.pointerId !== event.pointerId) return;
      stopDrag();
      scrollEl.releasePointerCapture(event.pointerId);
    });

    scrollEl.addEventListener('click', (event) => {
      if (Date.now() < suppressClickUntil) {
        event.preventDefault();
        event.stopPropagation();
      }
    }, true);

    const restoreScroll = () => {
      const focusIndex = Math.max(0, Math.min(currentLevelIndex, 0));
      const focusNode = scrollEl.querySelectorAll('.node')[focusIndex];
      if (focusNode) {
        const focusLeft = focusNode.offsetLeft + (focusNode.offsetWidth / 2);
        scrollEl.scrollLeft = Math.max(0, focusLeft - (scrollEl.clientWidth / 2));
        return;
      }

      const activeNode = scrollEl.querySelector('.node--active');
      if (activeNode) {
        const activeLeft = activeNode.offsetLeft + (activeNode.offsetWidth / 2);
        scrollEl.scrollLeft = Math.max(0, activeLeft - (scrollEl.clientWidth / 2));
      }
    };

    requestAnimationFrame(restoreScroll);

    let scrollTimer = null;
    scrollEl.addEventListener('scroll', () => {
      if (!profile) return;
      window.clearTimeout(scrollTimer);
      scrollTimer = window.setTimeout(() => {
        setGameMapScroll(profile, gameId, scrollEl.scrollLeft);
      }, 120);
    }, { passive: true });
  }

  renderContent();

  return main;
}

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

/**
 * Resolves Snake levels from the static base set plus globally generated phases.
 *
 * The generated levels are stored once per computer, not per profile, so every
 * profile sees the same content from phase 11 onward.
 */

import { levels as snakeBaseLevels } from './levels.js';
import { generateSnakeLevel } from './level-generator.js';
import { getJSON, setJSON } from '../core/storage.js';

const STORAGE_KEY = 'lv_generated_levels_registry';
const STORAGE_VERSION = 5;
const GENERATION_TRIGGER_PROGRESS = 7;
let memoryState = createDefaultState();

const GAME_LEVELS = {
  snake: snakeBaseLevels,
};

function createDefaultState() {
  return {
    version: STORAGE_VERSION,
    games: {},
  };
}

function loadState() {
  const stored = getJSON(STORAGE_KEY);
  if (!stored || stored.version !== STORAGE_VERSION || typeof stored.games !== 'object') {
    return memoryState;
  }
  memoryState = stored;
  return stored;
}

function saveState(state) {
  memoryState = state;
  setJSON(STORAGE_KEY, state);
}

function ensureGameState(state, gameId) {
  if (!state.games[gameId]) {
    state.games[gameId] = {
      seed: null,
      generated: [],
      names: [],
      layoutSignatures: [],
    };
  }
  if (!Array.isArray(state.games[gameId].generated)) {
    state.games[gameId].generated = [];
  }
  if (!Array.isArray(state.games[gameId].names)) {
    state.games[gameId].names = [];
  }
  if (!Array.isArray(state.games[gameId].layoutSignatures)) {
    state.games[gameId].layoutSignatures = [];
  }
  return state.games[gameId];
}

function ensureSeed(gameState, gameId) {
  if (gameState.seed) return gameState.seed;
  gameState.seed = `${gameId}:${Date.now().toString(36)}:${Math.random().toString(36).slice(2)}`;
  return gameState.seed;
}

function cloneLevel(level) {
  return {
    ...level,
    snake: level.snake.map((segment) => ({ ...segment })),
    walls: level.walls.map((wall) => ({ ...wall })),
    apples: level.apples.map((apple) => ({ ...apple })),
  };
}

/**
 * Returns the current level list for a game.
 * @param {string} gameId
 * @returns {Array}
 */
export function getGameLevels(gameId) {
  const baseLevels = GAME_LEVELS[gameId] || [];
  const state = loadState();
  const gameState = state.games[gameId];
  const generated = gameState && Array.isArray(gameState.generated) ? gameState.generated : [];

  return [...baseLevels.map(cloneLevel), ...(generated || []).map(cloneLevel)];
}

/**
 * Ensures the generated level list reaches the count unlocked by the current
 * progress. Profiles below the trigger threshold do not create generated
 * phases yet.
 *
 * @param {string} gameId
 * @param {number} highestCompleted
 * @returns {Array}
 */
export function ensureGeneratedLevelsForProgress(gameId, highestCompleted) {
  if (gameId !== 'snake') {
    return getGameLevels(gameId);
  }

  const targetCount = Math.max(0, highestCompleted - (GENERATION_TRIGGER_PROGRESS - 1));
  if (targetCount <= 0) {
    return getGameLevels(gameId);
  }

  const state = loadState();
  const gameState = ensureGameState(state, gameId);
  const seed = ensureSeed(gameState, gameId);
  const currentCount = gameState.generated.length;

  if (currentCount < targetCount) {
    try {
      for (let i = currentCount; i < targetCount; i++) {
        const levelId = snakeBaseLevels.length + i + 1;
        const generatedLevel = generateSnakeLevel({
          id: levelId,
          seed,
          index: i,
          usedNames: gameState.names,
          usedLayouts: gameState.layoutSignatures,
        });
        gameState.generated.push(generatedLevel);
        gameState.names.push(generatedLevel.name);
        gameState.layoutSignatures.push(generatedLevel.layoutSignature);
        saveState(state);
      }
    } catch (error) {
      console.error(`Failed to generate Snake levels for progress ${highestCompleted}:`, error);
      saveState(state);
    }
  }

  return getGameLevels(gameId);
}

/**
 * Returns how many generated phases exist for a game.
 * @param {string} gameId
 * @returns {number}
 */
export function getGeneratedLevelCount(gameId) {
  const state = loadState();
  const gameState = state.games[gameId];
  return gameState ? gameState.generated.length : 0;
}

/**
 * Game registry - maps game IDs to their configuration.
 * Each game defines its level source, progress key, and display info.
 * This makes it easy to add new games without modifying core components.
 *
 * Snake levels are loaded dynamically from the level generator (level-generator.js)
 * rather than being statically imported. Levels are persisted in localStorage
 * so rankings remain stable across sessions. New levels are generated on demand
 * as the player completes existing ones.
 */
import {
  loadStoredLevels,
  appendLevel,
  resetAllProgress,
} from '../engine/level-generator.js';

export const snakeLevels = loadStoredLevels();

export const GAME_CONFIG = {
  snake: {
    id: 'snake',
    name: 'Snake Tactical',
    levelSelectorTitle: 'Modo Cobrinha Lógica',
    levelSelectorSubtitle: 'Seleção de Fases',
    levels: snakeLevels,
    progressKey: 'snake-progress',
    appendLevel,
    resetLevels: resetAllProgress,
  },
};

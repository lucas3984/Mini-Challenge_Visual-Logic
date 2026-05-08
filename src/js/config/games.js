/**
 * Game registry - maps game IDs to their configuration.
 * Each game defines its level source, progress key, and display info.
 * This makes it easy to add new games without modifying core components.
 */
import { levels as snakeLevels } from '../engine/levels.js';

export const GAME_CONFIG = {
  snake: {
    id: 'snake',
    name: 'Snake Tactical',
    levelSelectorTitle: 'Modo Cobrinha Lógica',
    levelSelectorSubtitle: 'Seleção de Fases',
    levels: snakeLevels,
    progressKey: 'snake-progress',
  },
  // Future games example:
  // labirinto: {
  //   id: 'labirinto',
  //   name: 'Labirinto',
  //   levelSelectorTitle: 'Modo Labirinto',
  //   levelSelectorSubtitle: 'Seleção de Fases',
  //   levels: labirintoLevels,
  //   progressKey: 'labirinto-progress',
  // },
};

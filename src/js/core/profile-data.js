/**
 * Per-profile game state storage.
 *
 * Each profile has a single localStorage key holding all game state
 * (progress, current level, workspace data). This keeps related data
 * together and simplifies profile management (one key to read/delete).
 *
 * Key format: lv_profile_data_{profileName}
 * Value shape:
 *   { games: { [gameId]: { progress, currentLevel, workspaces } } }
 *
 * The level-score storage (lv_level_scores) stays separate because it is
 * cross-profile by design — the ranking table compares scores across users.
 */
import { getJSON, setJSON } from './storage.js';

const PROFILE_DATA_PREFIX = 'lv_profile_data_';

/**
 * Returns the localStorage key for a given profile.
 * @param {string} profileName
 * @returns {string}
 */
function profileDataKey(profileName) {
  return `${PROFILE_DATA_PREFIX}${profileName}`;
}

/**
 * Reads the full profile data object. Returns a default structure if
 * nothing is stored yet (never null, so callers can mutate freely).
 * @param {string} profileName
 * @returns {{ games: Object<string, { progress: number, currentLevel: number, workspaces: Object<string, string> }> }}
 */
function getProfileData(profileName) {
  return getJSON(profileDataKey(profileName)) || { games: {} };
}

/**
 * Writes the full profile data object back to localStorage.
 * @param {string} profileName
 * @param {Object} data
 */
function saveProfileData(profileName, data) {
  setJSON(profileDataKey(profileName), data);
}

/**
 * Ensures a game entry exists inside the profile data, initializing with
 * defaults if missing. Returns the game state object for mutation.
 *
 * @param {Object} data - Full profile data
 * @param {string} gameId
 * @returns {{ progress: number, currentLevel: number, workspaces: Object<string, string> }}
 */
function ensureGameState(data, gameId) {
  if (!data.games[gameId]) {
    data.games[gameId] = {
      progress: 0,
      currentLevel: 0,
      workspaces: {},
    };
  }
  return data.games[gameId];
}

/**
 * Saves the progression count (highest completed level) for a game.
 * @param {string} profileName
 * @param {string} gameId
 * @param {number} value
 */
export function setGameProgress(profileName, gameId, value) {
  const data = getProfileData(profileName);
  const game = ensureGameState(data, gameId);
  game.progress = value;
  saveProfileData(profileName, data);
}

/**
 * Reads the progression count for a game. Defaults to 0.
 * @param {string} profileName
 * @param {string} gameId
 * @returns {number}
 */
export function getGameProgress(profileName, gameId) {
  const data = getProfileData(profileName);
  const game = data.games[gameId];
  return game ? game.progress : 0;
}

/**
 * Saves the current (last-visited) level index for a game.
 * @param {string} profileName
 * @param {string} gameId
 * @param {number} levelIndex
 */
export function setGameCurrentLevel(profileName, gameId, levelIndex) {
  const data = getProfileData(profileName);
  const game = ensureGameState(data, gameId);
  game.currentLevel = levelIndex;
  saveProfileData(profileName, data);
}

/**
 * Reads the current (last-visited) level index. Defaults to 0.
 * @param {string} profileName
 * @param {string} gameId
 * @returns {number}
 */
export function getGameCurrentLevel(profileName, gameId) {
  const data = getProfileData(profileName);
  const game = data.games[gameId];
  return game ? game.currentLevel : 0;
}

/**
 * Saves a workspace HTML string for a specific game and level.
 * @param {string} profileName
 * @param {string} gameId
 * @param {number} levelIndex - 0-based level index
 * @param {string} html - The workspace innerHTML to persist
 */
export function setGameWorkspace(profileName, gameId, levelIndex, html) {
  const data = getProfileData(profileName);
  const game = ensureGameState(data, gameId);
  game.workspaces[String(levelIndex)] = html;
  saveProfileData(profileName, data);
}

/**
 * Reads a saved workspace HTML string for a specific game and level.
 * Returns null when no workspace has been saved (the caller can treat
 * this as "start with an empty workspace").
 *
 * @param {string} profileName
 * @param {string} gameId
 * @param {number} levelIndex - 0-based level index
 * @returns {string|null}
 */
export function getGameWorkspace(profileName, gameId, levelIndex) {
  const data = getProfileData(profileName);
  const game = data.games[gameId];
  if (!game) return null;
  return game.workspaces[String(levelIndex)] || null;
}

/**
 * Removes a saved workspace for a specific game and level.
 * @param {string} profileName
 * @param {string} gameId
 * @param {number} levelIndex - 0-based level index
 */
export function clearGameWorkspace(profileName, gameId, levelIndex) {
  const data = getProfileData(profileName);
  const game = data.games[gameId];
  if (game) {
    delete game.workspaces[String(levelIndex)];
    saveProfileData(profileName, data);
  }
}

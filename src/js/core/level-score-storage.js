/**
 * Persists and retrieves level scores for any game, scoped by gameId.
 * Supports future multiple games via the gameId field.
 * Uses existing localStorage wrappers from storage.js for safe persistence.
 */

import { getJSON, setJSON } from './storage.js';
import { sortLevelScores } from '../utils/ranking.js';

const STORAGE_KEY = 'lv_level_scores'; // Prefix 'lv_' avoids collisions with other localStorage keys

/**
 * Saves a level score for a specific game and profile.
 * Only updates if the new star count is higher than the existing score.
 *
 * @param {string} gameId - Unique identifier for the game (e.g., 'snake-tactical')
 * @param {string} profileName - Name of the profile (unique, enforced by future profile system)
 * @param {number} levelId - ID of the completed level
 * @param {number} stars - Star count achieved (1-3)
 * @returns {boolean} True if a save occurred, false otherwise
 */
export function saveLevelScore(gameId, profileName, levelId, stars) {
  const scores = getJSON(STORAGE_KEY) || [];
  const existingIndex = scores.findIndex(
    (s) => s.gameId === gameId && s.profileName === profileName && s.levelId === levelId
  );

  if (existingIndex === -1) {
    // No duplicate entries per game+profile+level: keeps storage clean, prevents redundant data
    scores.push({ gameId, profileName, levelId, stars, timestamp: Date.now() });
    setJSON(STORAGE_KEY, scores);
    return true;
  }

  if (stars > scores[existingIndex].stars) {
    // Only keep highest star count: no downgrades, preserves best player performance
    scores[existingIndex].stars = stars;
    // Timestamp reflects when best score was achieved, not worse replays
    scores[existingIndex].timestamp = Date.now();
    setJSON(STORAGE_KEY, scores);
    return true;
  }

  return false;
}

/**
 * Retrieves a specific profile's score for a game level.
 *
 * @param {string} gameId - Unique identifier for the game
 * @param {string} profileName - Name of the profile
 * @param {number} levelId - ID of the level
 * @returns {Object|null} Score object or null if not found
 */
export function getProfileLevelScore(gameId, profileName, levelId) {
  const scores = getJSON(STORAGE_KEY) || [];
  return (
    scores.find(
      (s) => s.gameId === gameId && s.profileName === profileName && s.levelId === levelId
    ) || null
  );
}

/**
 * Retrieves all scores for a specific game and level, sorted by stars descending then timestamp ascending.
 *
 * @param {string} gameId - Unique identifier for the game
 * @param {number} levelId - ID of the level
 * @returns {Array} Sorted array of score objects for the level
 */
export function getLevelScores(gameId, levelId) {
  const scores = getJSON(STORAGE_KEY) || [];
  const levelScores = scores.filter(
    (s) => s.gameId === gameId && s.levelId === levelId
  );
  return sortLevelScores(levelScores);
}

/**
 * Calculates the total stars a profile has earned in a specific game.
 *
 * @param {string} gameId - Unique identifier for the game
 * @param {string} profileName - Name of the profile
 * @returns {number} Sum of all stars for the profile in the game
 */
export function getProfileTotalStars(gameId, profileName) {
  const scores = getJSON(STORAGE_KEY) || [];
  const profileScores = scores.filter(
    (s) => s.gameId === gameId && s.profileName === profileName
  );
  return profileScores.reduce((sum, s) => sum + s.stars, 0);
}

/**
 * Retrieves all scores for a specific game.
 *
 * @param {string} gameId - Unique identifier for the game
 * @returns {Array} Array of score objects for the game
 */
export function getGameScores(gameId) {
  const scores = getJSON(STORAGE_KEY) || [];
  return scores.filter((s) => s.gameId === gameId);
}

/**
 * Retrieves all stored level scores across all games (for debugging).
 *
 * @returns {Array} Full array of all score objects
 */
export function getAllLevelScores() {
  return getJSON(STORAGE_KEY) || [];
}

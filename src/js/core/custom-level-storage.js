import { getJSON, setJSON } from './storage.js';
import { sortOverallRankings } from '../utils/ranking.js';

const STORAGE_KEY = 'lv_custom_progress';

export function getCustomLevelData(profileName) {
  const data = getJSON(STORAGE_KEY) || {};
  return data[profileName] || { completed: {}, currentLevel: null };
}

export function saveCustomLevelScore(profileName, levelId, stars) {
  const data = getJSON(STORAGE_KEY) || {};
  if (!data[profileName]) {
    data[profileName] = { completed: {}, currentLevel: null };
  }
  const existing = data[profileName].completed[levelId];
  if (!existing || stars > existing.stars) {
    data[profileName].completed[levelId] = { stars, timestamp: Date.now() };
  }
  setJSON(STORAGE_KEY, data);
}

export function getCustomLevelRankings() {
  const data = getJSON(STORAGE_KEY) || {};
  const rankings = [];
  for (const [profileName, profileData] of Object.entries(data)) {
    const entries = Object.values(profileData.completed || {});
    if (entries.length === 0) continue;
    const totalStars = entries.reduce((sum, e) => sum + e.stars, 0);
    const latestTimestamp = Math.max(...entries.map((e) => e.timestamp));
    rankings.push({ profileName, totalStars, latestTimestamp });
  }
  return sortOverallRankings(rankings);
}

export function setCustomLevelCurrent(profileName, levelId) {
  const data = getJSON(STORAGE_KEY) || {};
  if (!data[profileName]) {
    data[profileName] = { completed: {}, currentLevel: null };
  }
  data[profileName].currentLevel = levelId;
  setJSON(STORAGE_KEY, data);
}

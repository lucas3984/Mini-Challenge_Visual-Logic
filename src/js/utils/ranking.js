/**
 * Pure utility functions to sort and aggregate ranking data.
 * No side effects, works with any game's score data.
 */

/**
 * Sorts level score objects by stars descending, then timestamp ascending.
 *
 * @param {Array} scores - Array of level score objects
 * @returns {Array} New sorted array
 */
export function sortLevelScores(scores) {
  // Higher stars first; earlier timestamps break ties (fairer to older achievements)
  return [...scores].sort((a, b) => {
    if (b.stars !== a.stars) return b.stars - a.stars;
    return a.timestamp - b.timestamp;
  });
}

/**
 * Builds overall ranking data for a single game from its score array.
 * Groups scores by profile, sums total stars, and tracks latest timestamp.
 *
 * @param {Array} gameScores - Array of score objects for a single game
 * @returns {Array} Array of { profileName, totalStars, latestTimestamp }
 */
export function buildOverallRankings(gameScores) {
  // Map avoids prototype pollution from arbitrary profileName keys, better lookup performance
  const profileMap = new Map();

  for (const score of gameScores) {
    const existing = profileMap.get(score.profileName);
    if (existing) {
      existing.totalStars += score.stars;
      if (score.timestamp > existing.latestTimestamp) {
        existing.latestTimestamp = score.timestamp;
      }
    } else {
      profileMap.set(score.profileName, {
        profileName: score.profileName,
        totalStars: score.stars,
        latestTimestamp: score.timestamp,
      });
    }
  }

  return Array.from(profileMap.values());
}

/**
 * Sorts overall ranking objects by totalStars descending, then latestTimestamp ascending.
 *
 * @param {Array} overallRankings - Array of overall ranking objects
 * @returns {Array} New sorted array
 */
export function sortOverallRankings(overallRankings) {
  // Higher total stars first; earlier timestamps break ties for fairness
  return [...overallRankings].sort((a, b) => {
    if (b.totalStars !== a.totalStars) return b.totalStars - a.totalStars;
    return a.latestTimestamp - b.latestTimestamp;
  });
}

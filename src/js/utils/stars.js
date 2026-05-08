/**
 * Pure utility to calculate star ratings for level completions.
 * Generic design avoids game-specific dependencies to support all future games.
 */

/**
 * Calculates star count based on player block usage and level thresholds.
 *
 * @param {number} playerBlockCount - Number of blocks used by the player
 * @param {number} starThree - Max blocks to earn 3 stars
 * @param {number} starTwo - Max blocks to earn 2 stars
 * @returns {number} 1, 2, or 3 stars
 */
export function calculateStars(playerBlockCount, starThree, starTwo) {
  // Generic for all games: accepts thresholds as params instead of importing game-specific levels
  if (playerBlockCount <= starThree) return 3;
  if (playerBlockCount <= starTwo) return 2;
  // Minimum 1 star: assumes level completion (0 stars = no completion, handled by caller)
  return 1;
}

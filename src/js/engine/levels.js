/**
 * Level definitions for the Snake Tactical puzzle game.
 * Each level specifies grid layout, wall positions, apple positions,
 * snake starting state, and constraints on the player's block-based programming.
 *
 * starThree / starTwo: maximum block count to earn 3-star / 2-star rating.
 * Lower values demand more optimized solutions in fewer blocks.
 *
 * maxBlocks / maxLoops / maxIfs: absolute limits on the player's program.
 * Controls puzzle difficulty by restricting available constructs.
 */
export const levels = [
  {
    id: 1,
    name: 'The Staircase',
    description: 'Use Repeat to save blocks in a pattern',
    snake: [
      { row: 5, col: 0 },
      { row: 6, col: 0 },
      { row: 7, col: 0 },
    ],
    direction: 'up',
    // Wall layout forms a staircase pattern — the snake must navigate upward through gaps
    walls: [
      { row: 1, col: 7 },
      { row: 2, col: 7 },
      { row: 3, col: 5 }, { row: 3, col: 6 }, { row: 3, col: 7 },
      { row: 4, col: 5 }, { row: 4, col: 6 }, { row: 4, col: 7 },
      { row: 5, col: 3 }, { row: 5, col: 4 }, { row: 5, col: 5 }, { row: 5, col: 6 }, { row: 5, col: 7 },
      { row: 6, col: 2 }, { row: 6, col: 3 }, { row: 6, col: 4 }, { row: 6, col: 5 }, { row: 6, col: 6 }, { row: 6, col: 7 },
      { row: 7, col: 2 }, { row: 7, col: 3 }, { row: 7, col: 4 }, { row: 7, col: 5 }, { row: 7, col: 6 }, { row: 7, col: 7 },
    ],
    apples: [
      { row: 0, col: 7 },
      { row: 2, col: 5 },
      { row: 4, col: 3 },
    ],
    // Liberal block limit — this is the tutorial level
    maxBlocks: 15,
    maxLoops: 3,
    maxIfs: 1,
    // Star thresholds: tighter 3-star encourages efficient repeat usage
    starThree: 8,
    starTwo: 12,
    gridSize: 8,
  },
  {
    id: 2,
    name: 'Detour',
    description: 'A wall blocks the path — go around it',
    snake: [
      { row: 4, col: 2 },
      { row: 4, col: 1 },
      { row: 4, col: 0 },
    ],
    direction: 'right',
    // Horizontal wall forces a detour — snake must go around rather than straight
    walls: [
      { row: 2, col: 0 }, { row: 2, col: 1 }, { row: 2, col: 2 },
      { row: 3, col: 0 }, { row: 3, col: 1 }, { row: 3, col: 2 }, { row: 3, col: 6 }, { row: 3, col: 7 },
      { row: 4, col: 5 }, { row: 4, col: 6 }, { row: 4, col: 7 },
      { row: 5, col: 0 }, { row: 5, col: 1 }, { row: 5, col: 2 }, { row: 5, col: 3 }, { row: 5, col: 4 }, { row: 5, col: 5 }, { row: 5, col: 6 }, { row: 5, col: 7 },
      { row: 6, col: 0 }, { row: 6, col: 1 }, { row: 6, col: 2 }, { row: 6, col: 3 }, { row: 6, col: 4 }, { row: 6, col: 5 }, { row: 6, col: 6 }, { row: 6, col: 7 },
      { row: 7, col: 0 }, { row: 7, col: 1 }, { row: 7, col: 2 }, { row: 7, col: 3 }, { row: 7, col: 4 }, { row: 7, col: 5 }, { row: 7, col: 6 }, { row: 7, col: 7 },
    ],
    apples: [{ row: 2, col: 7 }],
    maxBlocks: 10,
    maxLoops: 1,
    maxIfs: 1,
    starThree: 5,
    starTwo: 7,
    gridSize: 8,
  },
  {
    id: 3,
    name: 'Shortcut',
    description: 'The path is too long — use Repeat',
    snake: [
      { row: 0, col: 2 },
      { row: 0, col: 1 },
      { row: 0, col: 0 },
    ],
    direction: 'right',
    walls: [],
    // Apple placed far diagonally — manual moves would exceed block limit, forcing repeat usage
    apples: [{ row: 7, col: 7 }],
    // No ifs available — player must solve with loops only
    maxBlocks: 3,
    maxLoops: 1,
    maxIfs: 0,
    starThree: 2,
    starTwo: 3,
    gridSize: 8,
  },
  {
    id: 4,
    name: 'Wall Ahead',
    description: 'Use If [Wall ahead] to dodge at the right moment',
    snake: [
      { row: 3, col: 2 },
      { row: 3, col: 1 },
      { row: 3, col: 0 },
    ],
    direction: 'right',
    // Single wall forces a conditional dodge — introduces if-block mechanics
    walls: [
      { row: 3, col: 6 },
    ],
    apples: [{ row: 4, col: 7 }],
    maxBlocks: 6,
    // No loops — the puzzle is about conditional logic, not repetition
    maxLoops: 0,
    maxIfs: 1,
    starThree: 4,
    starTwo: 5,
    gridSize: 8,
  },
  {
    id: 5,
    name: 'Double Collect',
    description: 'Two apples in opposite corners — use Repeat for long distances',
    snake: [
      { row: 3, col: 2 },
      { row: 3, col: 1 },
      { row: 3, col: 0 },
    ],
    direction: 'right',
    walls: [],
    // Two apples spread far apart — combines repeat for distance with if for routing
    apples: [
      { row: 0, col: 1 },
      { row: 0, col: 7 },
    ],
    maxBlocks: 7,
    maxLoops: 2,
    maxIfs: 1,
    starThree: 4,
    starTwo: 5,
    gridSize: 8,
  },
];

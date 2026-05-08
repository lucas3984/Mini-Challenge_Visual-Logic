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
    name: 'A Escada',
    description: 'Use Repetir para economizar blocos em um padrão',
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
    name: 'Desvio',
    description: 'Uma parede bloqueia o caminho — contorne-a',
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
    name: 'Festa de Maçãs',
    description: 'O caminho é muito longo — use Repetir',
    snake: [
      { row: 0, col: 2 },
      { row: 0, col: 1 },
      { row: 0, col: 0 },
    ],
    direction: 'right',
    walls: [
      { row: 0, col: 7 },
      { row: 1, col: 0 }, { row: 1, col: 1 }, { row: 1, col: 2 }, { row: 1, col: 3 }, { row: 1, col: 4 }, { row: 1, col: 5 }, { row: 1, col: 7 },
      { row: 2, col: 0 }, { row: 2, col: 5 }, { row: 2, col: 7 },
      { row: 3, col: 0 }, { row: 3, col: 2 }, { row: 3, col: 3 }, { row: 3, col: 5 }, { row: 3, col: 7 },
      { row: 4, col: 0 }, { row: 4, col: 2 }, { row: 4, col: 5 }, { row: 4, col: 7 },
      { row: 5, col: 0 }, { row: 5, col: 2 }, { row: 5, col: 3 }, { row: 5, col: 4 }, { row: 5, col: 5 }, { row: 5, col: 7 },
      { row: 6, col: 0 }, { row: 6, col: 7 },
      { row: 7, col: 0 }, { row: 7, col: 1 }, { row: 7, col: 2 }, { row: 7, col: 3 }, { row: 7, col: 4 }, { row: 7, col: 5 }, { row: 7, col: 6 }, { row: 7, col: 7 },
    ],
    // Apple placed far diagonally — manual moves would exceed block limit, forcing repeat usage
    apples: [
      { row: 0, col: 3 }, { row: 0, col: 4 }, { row: 0, col: 5 }, { row: 0, col: 6 },
      { row: 1, col: 6 },
      { row: 2, col: 1 }, { row: 2, col: 2 }, { row: 2, col: 3 }, { row: 2, col: 4 }, { row: 2, col: 6 },
      { row: 3, col: 1 }, { row: 3, col: 4 }, { row: 3, col: 6 },
      { row: 4, col: 1 }, { row: 4, col: 3 }, { row: 4, col: 4 }, { row: 4, col: 6 },
      { row: 5, col: 1 }, { row: 5, col: 6 },
      { row: 6, col: 1 }, { row: 6, col: 2 }, { row: 6, col: 3 }, { row: 6, col: 4 }, { row: 6, col: 5 }, { row: 6, col: 6 },
    ],
    // No ifs available — player must solve with loops only
    maxBlocks: 20,
    maxLoops: 6,
    maxIfs: 3,
    starThree: 7,
    starTwo: 15,
    gridSize: 8,
  },
  {
    id: 4,
    name: 'Desvie da Parede',
    description: 'Use Se [Parede à frente] para desviar na hora certa',
    snake: [
      { row: 3, col: 0 },
      { row: 3, col: 1 },
      { row: 3, col: 2 },
    ],
    direction: 'left',
    // Single wall blocks the snake's path — forces the first If dodge
    walls: [
      { row: 3, col: 5 },
    ],
    // Two apples in-line on the right edge, one above the wall and one below
    apples: [
      { row: 0, col: 7 },
      { row: 6, col: 7 },
    ],
    maxBlocks: 8,
    maxLoops: 4,
    maxIfs: 2,
    starThree: 4,
    starTwo: 6,
    gridSize: 8,
  },
  {
    id: 5,
    name: 'O Corredor',
    description: 'Duas paredes — use dois blocos Se para desviar de ambas',
    snake: [
      { row: 3, col: 2 },
      { row: 3, col: 1 },
      { row: 3, col: 0 },
    ],
    direction: 'right',
    // Two walls at different points force two separate If dodges
    walls: [
      { row: 3, col: 4 },
      { row: 6, col: 1 },
    ],
    // Apples at opposite corners — long path requires both dodges
    apples: [
      { row: 0, col: 0 },
      { row: 6, col: 7 },
    ],
    maxBlocks: 14,
    maxLoops: 5,
    maxIfs: 2,
    starThree: 7,
    starTwo: 11,
    gridSize: 8,
  },
];

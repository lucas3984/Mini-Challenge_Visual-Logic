/**
 * Procedural level generator for Snake Tactical.
 *
 * Generates infinite, solvable levels on demand. All levels are verified
 * playable via a step-by-step snake movement simulation before being stored.
 *
 * ┌─────────────────────────────────────────────────────────────┐
 * │ Generation pipeline                                         │
 * ├─────────────────────────────────────────────────────────────┤
 * │  1.  Snake placement (row 1-6, cols 2-1-0, direction right)│
 * │  2.  Maze generation (corridor builder)                   │
 * │  3.  Apple placement (reachable cells only)                │
 * │  4.  Solvability check (full snake simulation, DFS)        │
 * │  5.  Retry on failure, fallback if all retries fail        │
 * │  6.  Block budget from average path length                 │
 * └─────────────────────────────────────────────────────────────┘
 *
 * Persistence: localStorage under `snake-generated-levels`.
 * New levels are generated on demand when the player completes the last one.
 *
 * Naming: each level gets a unique sequential name "Nome #N" where N is
 * the 1-based level index. No duplicates are possible by construction.
 */

import { getItem, setItem, removeItem, setJSON } from '../core/storage.js';

const STORAGE_KEY = 'snake-generated-levels';
const INITIAL_BATCH = 10;
const GRID_SIZE = 8;

// Name components for variety — all prefixed by level number so uniqueness is guaranteed
const NAME_PREFIXES = [
  'O Labirinto', 'Desvio', 'A Aventura', 'Enigma', 'Percurso',
  'Contorno', 'Armadilha', 'Estrada', 'Desafio', 'Corredor',
  'Travessia', 'Caminho', 'Passagem', 'Zigue-Zague', 'Volta',
  'Esquiva', 'A Volta', 'O Caminho', 'Deslize', 'Conquista',
];

/**
 * BFS from start, treating wall cells as blocked.
 * Returns visited cell keys.
 */
function bfsFrom(startRow, startCol, wallSet) {
  const visited = new Set();
  const queue = [[startRow, startCol]];

  while (queue.length > 0) {
    const [r, c] = queue.shift();
    const key = `${r},${c}`;
    if (visited.has(key)) continue;
    if (r < 0 || r >= GRID_SIZE || c < 0 || c >= GRID_SIZE) continue;
    if (wallSet.has(key)) continue;

    visited.add(key);
    queue.push([r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]);
  }

  return visited;
}

/**
 * BFS shortest path. Returns array of {row, col} from start to goal,
 * or null if no path exists. blockedSet contains cells the snake
 * cannot traverse (its own body segments).
 */
function bfsPath(start, goal, wallSet, blockedSet) {
  const visited = new Set([start.row + ',' + start.col]);
  const parent = new Map();
  const queue = [start];
  parent.set(start.row + ',' + start.col, null);

  while (queue.length > 0) {
    const cur = queue.shift();
    if (cur.row === goal.row && cur.col === goal.col) {
      const path = [];
      let node = cur;
      while (node) {
        path.unshift(node);
        node = parent.get(node.row + ',' + node.col);
      }
      return path;
    }
    for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
      const nr = cur.row + dr;
      const nc = cur.col + dc;
      const key = nr + ',' + nc;
      if (visited.has(key)) continue;
      if (nr < 0 || nr >= GRID_SIZE || nc < 0 || nc >= GRID_SIZE) continue;
      if (wallSet.has(key) || blockedSet.has(key)) continue;
      visited.add(key);
      parent.set(key, cur);
      queue.push({ row: nr, col: nc });
    }
  }

  return null;
}

/**
 * Simulates the snake moving along a path.
 *
 * path[0] = current head position
 * path[last] = goal (apple cell)
 *
 * Returns the new snake array after the move.
 * If grew=true, the snake grows by 1 (tail doesn't move).
 */
function moveSnake(snake, path, grew) {
  const pathSet = new Set(path.map((p) => p.row + ',' + p.col));

  // bodyCells = intermediate positions on the path (not head, not goal)
  const bodyCells = path.slice(1, -1);

  // remainingTail = old body segments that are NOT on the path
  const remainingTail = snake.slice(1).filter(
    (s) => !pathSet.has(s.row + ',' + s.col)
  );

  const newSnake = [path[path.length - 1], ...bodyCells, ...remainingTail];

  if (grew) {
    // Growing: the old tail segment stays (snake grows by 1)
    newSnake.push(snake[snake.length - 1]);
  }

  return newSnake;
}

/**
 * Full completability check using DFS + step-by-step simulation.
 *
 * Tries all permutations of apple collection order. For each order,
 * checks if there is a valid path from the current snake position
 * to the next apple that avoids the snake's own body. If the snake
 * can eat all apples via some order, the level is completable.
 *
 * This is the same algorithm the player uses when solving the puzzle.
 */
function isLevelCompletable(level) {
  const wallSet = new Set(level.walls.map((w) => w.row + ',' + w.col));
  const apples = level.apples.map((a) => ({ ...a }));

  function dfs(snake, remaining) {
    if (remaining.length === 0) return true;

    const blocked = new Set(snake.slice(1).map((s) => s.row + ',' + s.col));

    for (let i = 0; i < remaining.length; i++) {
      const apple = remaining[i];

      // Apple cannot be on the snake's body (snake would have collided)
      if (blocked.has(apple.row + ',' + apple.col)) continue;

      // Find path avoiding walls and body
      const path = bfsPath(snake[0], apple, wallSet, blocked);
      if (!path || path.length < 2) continue;

      // Path must not cross body (only head and goal can overlap body)
      const bodySet = blocked;
      let pathSafe = true;
      for (let p = 1; p < path.length - 1; p++) {
        if (bodySet.has(path[p].row + ',' + path[p].col)) {
          pathSafe = false;
          break;
        }
      }
      if (!pathSafe) continue;

      // Simulate the move
      const newSnake = moveSnake(snake, path, true);

      // Verify the new head is at the apple position
      if (newSnake[0].row !== apple.row || newSnake[0].col !== apple.col) {
        continue;
      }

      // Recurse with one fewer apple
      const newRemaining = remaining.filter((_, j) => j !== i);
      if (dfs(newSnake, newRemaining)) return true;
    }

    return false;
  }

  return dfs(level.snake.map((s) => ({ ...s })), apples);
}

/**
 * Difficulty tier based on level index.
 */
function getDifficultyTier(levelIndex) {
  const tier = Math.floor(levelIndex / 3);
  if (tier <= 1) return 'easy';
  if (tier === 2) return 'medium';
  return 'hard';
}

/**
 * Block budget computed from average path distance to apples and tier.
 */
function computeBudget(avgPath, tier) {
  const base = Math.max(8, Math.round(avgPath * 1.1));
  const loops = tier === 'hard' ? 5 : tier === 'medium' ? 4 : 3;
  const ifs = tier === 'hard' ? 3 : tier === 'medium' ? 2 : 1;
  const factor = Math.min(1.2, 0.8 + avgPath / 40);
  const maxBlocks = Math.round(base * factor);

  return {
    maxBlocks,
    maxLoops: loops,
    maxIfs: ifs,
    starThree: Math.round(maxBlocks * 0.55),
    starTwo: Math.round(maxBlocks * 0.80),
  };
}

/**
 * Builds a set of wall keys from an array of wall objects.
 */
function buildWallSet(walls) {
  return new Set(walls.map((w) => w.row + ',' + w.col));
}

/**
 * Fisher-Yates shuffle (in place).
 */
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

/**
 * Generates maze walls.
 *
 * Guarantees:
 *   - Snake row is fully carved (snake can move freely along its row)
 *   - Col 0 is fully carved (entry is always possible)
 *   - Snake body cells are never walls
 *
 * Creates N corridors (rows and columns) carved as passages.
 * Remaining cells become walls.
 */
function generateMaze(snakeRow, snakeCols) {
  const carved = new Set();

  // Always carve the snake's row and column 0
  for (let c = 0; c < GRID_SIZE; c++) carved.add(`${snakeRow},${c}`);
  for (let r = 0; r < GRID_SIZE; r++) carved.add(`${r},0`);

  const corridorRows = new Set([snakeRow]);
  const corridorCols = new Set([0]);

  // Add 1-2 random extra rows
  const extraRowCount = 1 + Math.floor(Math.random() * 2);
  const allRows = Array.from({ length: GRID_SIZE }, (_, i) => i).filter((r) => r !== snakeRow);
  shuffle(allRows);
  for (let i = 0; i < extraRowCount && i < allRows.length; i++) {
    for (let c = 0; c < GRID_SIZE; c++) carved.add(`${allRows[i]},${c}`);
    corridorRows.add(allRows[i]);
  }

  // Add 1-2 random extra cols
  const extraColCount = 1 + Math.floor(Math.random() * 2);
  const allCols = Array.from({ length: GRID_SIZE }, (_, i) => i).filter((c) => c !== 0);
  shuffle(allCols);
  for (let i = 0; i < extraColCount && i < allCols.length; i++) {
    for (let r = 0; r < GRID_SIZE; r++) carved.add(`${r},${allCols[i]}`);
    corridorCols.add(allCols[i]);
  }

  // Scatter a few extra individual wall cells for variety
  const extraCount = 2 + Math.floor(Math.random() * 4);
  let placed = 0;
  let attempts = 0;
  while (placed < extraCount && attempts < 50) {
    const r = Math.floor(Math.random() * GRID_SIZE);
    const c = Math.floor(Math.random() * GRID_SIZE);
    const key = `${r},${c}`;
    if (!carved.has(key)) {
      carved.add(key);
      placed++;
    }
    attempts++;
  }

  const wallCells = [];
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      if (!carved.has(`${r},${c}`)) {
        wallCells.push({ row: r, col: c });
      }
    }
  }

  return wallCells;
}

/**
 * Generates one level, retrying until it is completable.
 */
export function generateLevel(levelIndex) {
  const tier = getDifficultyTier(levelIndex);
  const appleCounts = { easy: 2, medium: 3, hard: 4 };
  const appleCount = appleCounts[tier];
  const id = levelIndex + 1;

  // Pick a random snake row (avoiding edges to keep open space around it)
  const snakeRow = 1 + Math.floor(Math.random() * (GRID_SIZE - 2));
  const snakeBody = [
    { row: snakeRow, col: 2 },
    { row: snakeRow, col: 1 },
    { row: snakeRow, col: 0 },
  ];
  const snakeSet = new Set(snakeBody.map((s) => `${s.row},${s.col}`));

  // Generate maze (may not be completable on first try)
  for (let attempt = 0; attempt < 15; attempt++) {
    const wallCells = generateMaze(snakeRow);
    const wallSet = buildWallSet(wallCells);

    // Find all cells reachable from the snake head (excluding walls and body)
    const visited = bfsFrom(snakeBody[0].row, snakeBody[0].col, wallSet);

    // Collect open reachable cells
    const openCells = [];
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        const key = `${r},${c}`;
        if (!wallSet.has(key) && !snakeSet.has(key) && visited.has(key)) {
          openCells.push({ row: r, col: c });
        }
      }
    }

    if (openCells.length < appleCount + 1) continue;

    // Try multiple random apple placements
    const shuffled = [...openCells].sort(() => Math.random() - 0.5);

    for (let appleAttempt = 0; appleAttempt < 5; appleAttempt++) {
      const subset = shuffled.slice(0, appleCount + appleAttempt);
      shuffle(subset);
      const apples = subset.slice(0, appleCount);

      // Verify every apple is reachable from the start
      let allReachable = true;
      for (const apple of apples) {
        const path = bfsPath(snakeBody[0], apple, wallSet, snakeSet);
        if (!path) { allReachable = false; break; }
      }
      if (!allReachable) continue;

      // Build the candidate level
      const candidate = {
        id,
        name: `${NAME_PREFIXES[id % NAME_PREFIXES.length]} #${id}`,
        description: '',
        snake: snakeBody.map((s) => ({ ...s })),
        direction: 'right',
        walls: wallCells.map((w) => ({ ...w })),
        apples: apples.map((a) => ({ ...a })),
        maxBlocks: 15,
        maxLoops: 3,
        maxIfs: 1,
        starThree: 8,
        starTwo: 12,
        gridSize: GRID_SIZE,
      };

      // Full completability check with body awareness
      if (isLevelCompletable(candidate)) {
        // Compute path-based budget
        let totalDist = 0;
        let count = 0;
        for (const apple of apples) {
          const path = bfsPath(snakeBody[0], apple, wallSet, snakeSet);
          if (path) { totalDist += path.length - 1; count++; }
        }
        const avgPath = count > 0 ? totalDist / count : 10;
        const budget = computeBudget(avgPath, tier);

        const descriptions = [
          'Desviar das paredes usando blocos de controle',
          'Colete todas as maçãs com o mínimo de blocos',
          'Use Repetir para otimizar o caminho',
          'Esquive das paredes com Se [Parede à frente]',
          'Combine loops e condicionais para resolver',
        ];

        return {
          ...candidate,
          ...budget,
          description: descriptions[Math.floor(Math.random() * descriptions.length)],
        };
      }
    }
  }

  // All retries failed — return a guaranteed-solvable fallback
  return generateFallbackLevel(levelIndex);
}

/**
 * Minimal fallback level with no walls, guaranteed completable.
 * Used only when the random generator fails after all retries.
 */
function generateFallbackLevel(levelIndex) {
  const id = levelIndex + 1;
  return {
    id,
    name: `Fase #${id}`,
    description: 'Colete todas as maçãs',
    snake: [
      { row: 3, col: 2 },
      { row: 3, col: 1 },
      { row: 3, col: 0 },
    ],
    direction: 'right',
    walls: [],
    apples: [
      { row: 0, col: 7 },
      { row: 3, col: 7 },
      { row: 7, col: 7 },
    ],
    maxBlocks: 15,
    maxLoops: 3,
    maxIfs: 1,
    starThree: 8,
    starTwo: 12,
    gridSize: GRID_SIZE,
  };
}

/**
 * Loads levels from localStorage, or generates the initial batch.
 */
export function loadStoredLevels() {
  try {
    const stored = getItem(STORAGE_KEY);
    if (stored !== null && stored.length > 0) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (_) {}

  const initial = [];
  for (let i = 0; i < INITIAL_BATCH; i++) {
    initial.push(generateLevel(i));
  }
  saveLevels(initial);
  return initial;
}

/**
 * Saves levels array to localStorage.
 */
export function saveLevels(levels) {
  try {
    setItem(STORAGE_KEY, JSON.stringify(levels));
  } catch (_) {}
}

/**
 * Appends one new level and returns the updated array.
 */
export function appendLevel() {
  const levels = loadStoredLevels();
  const nextIndex = levels.length;
  const newLevel = generateLevel(nextIndex);
  levels.push(newLevel);
  saveLevels(levels);
  return levels;
}

/**
 * Wipes stored levels so next load generates fresh ones.
 */
export function resetStoredLevels() {
  removeItem(STORAGE_KEY);
}

/**
 * Full reset: clears all levels, progress, scores, and workspace for this game.
 * Used by the "Regenerar fases" button on the level selector page.
 */
export function resetAllProgress() {
  removeItem(STORAGE_KEY);
  removeItem('snake-progress');
  removeItem('snake-current-level');
  removeItem('snake-workspace-0');
  removeItem('snake-workspace-1');
  removeItem('snake-workspace-2');
  removeItem('snake-workspace-3');
  removeItem('snake-workspace-4');
  removeItem('snake-workspace-5');
  removeItem('snake-workspace-6');
  removeItem('snake-workspace-7');
  removeItem('snake-workspace-8');
  removeItem('snake-workspace-9');
  setJSON('lv_level_scores', []);
}
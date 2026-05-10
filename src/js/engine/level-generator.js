/**
 * Deterministic generator for Snake phases 11+.
 *
 * The generator builds corridor-style levels with a guaranteed solution path.
 * A stored seed keeps the generated content stable across every profile on the
 * same computer while allowing the storage to be versioned later.
 */

const GRID_SIZE = 8;

const PLAN_TEMPLATES = [
  {
    name: 'Corredor em Zigue-Zague',
    description: 'Siga o corredor em zigue-zague até o fim.',
    start: { row: 1, col: 1, direction: 'right' },
    segments: ['right', 'down', 'left', 'down', 'right'],
  },
  {
    name: 'Corredor Reverso',
    description: 'O caminho faz a curva e volta pelo outro lado.',
    start: { row: 1, col: 6, direction: 'left' },
    segments: ['left', 'down', 'right', 'down', 'left'],
  },
  {
    name: 'Corredor Inferior',
    description: 'Use o caminho inferior para chegar nas maçãs.',
    start: { row: 6, col: 1, direction: 'right' },
    segments: ['right', 'up', 'left', 'up', 'right'],
  },
  {
    name: 'Corredor Espelhado',
    description: 'Um percurso espelhado com mudanças curtas de direção.',
    start: { row: 6, col: 6, direction: 'left' },
    segments: ['left', 'up', 'right', 'up', 'left'],
  },
];

/**
 * Generates a full level object for the given id/index.
 *
 * @param {Object} params
 * @param {number} params.id - Sequential level id (11+).
 * @param {string} params.seed - Stable per-computer seed.
 * @param {number} params.index - Zero-based generated index.
 * @returns {Object}
 */
export function generateSnakeLevel({ id, seed, index }) {
  const template = PLAN_TEMPLATES[(seededIndex(seed, index) + index) % PLAN_TEMPLATES.length];
  const rng = createRng(`${seed}:${index}:${id}`);

  const segmentLengths = template.segments.map((direction) => pickSegmentLength(direction, rng));
  const path = buildPath(template.start, template.segments, segmentLengths);
  const safePath = path || buildPath(template.start, template.segments, [5, 2, 4, 2, 3]);

  if (!safePath || safePath.length < 6) {
    throw new Error(`Unable to generate a valid level for id ${id}`);
  }

  const apples = pickApplesOnPath(safePath, rng);
  const pathSet = new Set(safePath.map(toKey));
  const walls = [];

  for (let row = 0; row < GRID_SIZE; row++) {
    for (let col = 0; col < GRID_SIZE; col++) {
      if (!pathSet.has(toKey({ row, col }))) {
        walls.push({ row, col });
      }
    }
  }

  const snake = safePath.slice(0, 3).reverse().map(({ row, col }) => ({ row, col }));
  const direction = getDirection(safePath[2], safePath[3]);
  const maxBlocks = Math.max(16, Math.ceil(safePath.length / 2) + apples.length * 2);
  const starThree = Math.max(6, Math.ceil(maxBlocks * 0.5));
  const starTwo = Math.max(starThree + 2, Math.ceil(maxBlocks * 0.75));

  return {
    id,
    name: `${template.name} ${String(id).padStart(2, '0')}`,
    description: template.description,
    snake,
    direction,
    walls,
    apples,
    maxBlocks,
    maxLoops: 6,
    maxIfs: 3,
    starThree,
    starTwo,
    gridSize: GRID_SIZE,
    generated: true,
    generatedTemplate: template.name,
  };
}

function pickSegmentLength(direction, rng) {
  switch (direction) {
    case 'right':
    case 'left':
      return 4 + Math.floor(rng() * 2);
    case 'up':
    case 'down':
      return 2;
    default:
      return 3;
  }
}

function buildPath(start, directions, lengths) {
  const path = [{ row: start.row, col: start.col }];
  let row = start.row;
  let col = start.col;
  const visited = new Set([toKey({ row, col })]);

  for (let i = 0; i < directions.length; i++) {
    const direction = directions[i];
    const length = lengths[i];
    const delta = directionToDelta(direction);

    for (let step = 0; step < length; step++) {
      row += delta.row;
      col += delta.col;

      if (!isInsideGrid(row, col)) return null;

      const key = toKey({ row, col });
      if (visited.has(key)) return null;

      visited.add(key);
      path.push({ row, col });
    }
  }

  return path;
}

function pickApplesOnPath(path, rng) {
  const available = path
    .map((cell, index) => ({ cell, index }))
    .filter(({ index }) => index >= 3 && index < path.length - 1);

  const desiredCount = 3;
  const result = [];
  const taken = new Set();

  for (let i = 0; i < desiredCount && available.length > 0; i++) {
    const idealIndex = Math.floor((available.length / (desiredCount + 1)) * (i + 1) + (rng() * 2 - 1));
    let pickedIndex = Math.min(available.length - 1, Math.max(0, idealIndex));
    while (pickedIndex < available.length && taken.has(available[pickedIndex].index)) {
      pickedIndex++;
    }
    if (pickedIndex >= available.length) {
      pickedIndex = 0;
      while (pickedIndex < available.length && taken.has(available[pickedIndex].index)) {
        pickedIndex++;
      }
    }

    const candidate = available[pickedIndex] || available[available.length - 1];
    if (!candidate) continue;
    const key = candidate.index;
    if (taken.has(key)) continue;
    taken.add(key);
    result.push({ row: candidate.cell.row, col: candidate.cell.col });
  }

  if (result.length === 0 && path[3]) {
    result.push({ row: path[3].row, col: path[3].col });
  }

  return result;
}

function directionToDelta(direction) {
  switch (direction) {
    case 'right': return { row: 0, col: 1 };
    case 'left': return { row: 0, col: -1 };
    case 'up': return { row: -1, col: 0 };
    case 'down': return { row: 1, col: 0 };
    default: return { row: 0, col: 1 };
  }
}

function getDirection(from, to) {
  if (to.row === from.row && to.col === from.col + 1) return 'right';
  if (to.row === from.row && to.col === from.col - 1) return 'left';
  if (to.col === from.col && to.row === from.row + 1) return 'down';
  return 'up';
}

function isInsideGrid(row, col) {
  return row >= 0 && row < GRID_SIZE && col >= 0 && col < GRID_SIZE;
}

function toKey({ row, col }) {
  return `${row}:${col}`;
}

function createRng(seed) {
  let state = hashSeed(seed) || 1;
  return () => {
    state |= 0;
    state = (state + 0x6D2B79F5) | 0;
    let t = Math.imul(state ^ state >>> 15, 1 | state);
    t = (t + Math.imul(t ^ t >>> 7, 61 | t)) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function hashSeed(seed) {
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function seededIndex(seed, index) {
  return hashSeed(`${seed}:${index}`);
}

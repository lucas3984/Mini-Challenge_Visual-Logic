/**
 * Deterministic generator for Snake phases 11+.
 *
 * The generator builds open arenas with multiple valid routes instead of a
 * single forced corridor. A stored seed keeps the generated content stable
 * across every profile on the same computer while allowing the storage to be
 * versioned later.
 */

const GRID_SIZE = 8;
const GENERATED_MAX_BLOCKS_SCALE = 1.375;

const NAME_POOL = [
  'Encruzilhada Aberta',
  'Pátio Cruzado',
  'Vários Caminhos',
  'Faixa Ampla',
  'Plano Livre',
  'Corredor Solto',
  'Ilhas Diagonais',
  'Pontes Soltas',
  'Rota em Vésperas',
  'Marcos de Borda',
  'Passagem Dividida',
  'Circuito Aberto',
  'Volta Solta',
  'Anel Quebrado',
  'Trilha Livre',
  'Passo Aberto',
  'Nó do Meio',
  'Trama Livre',
  'Orla Aberta',
  'Vão Central',
  'Campo Cruzado',
  'Janela Central',
  'Senda Lateral',
  'Domínio Aberto',
];

const NAME_SUFFIXES = [
  'Norte',
  'Sul',
  'Leste',
  'Oeste',
  'Alto',
  'Baixo',
  'Livre',
  'Aberto',
  'Reto',
  'Amplo',
];

const ARENA_TEMPLATES = [
  {
    key: 'crossroads-open',
    description: 'Uma arena ampla com escolhas em cada curva.',
    starts: [
      { row: 2, col: 2, direction: 'right' },
      { row: 5, col: 5, direction: 'left' },
    ],
    walls: [
      { row: 2, col: 4 },
      { row: 3, col: 4 },
      { row: 4, col: 3 },
      { row: 5, col: 3 },
    ],
    appleZones: [
      [{ row: 0, col: 6 }, { row: 1, col: 6 }, { row: 0, col: 5 }, { row: 2, col: 6 }],
      [{ row: 6, col: 1 }, { row: 6, col: 2 }, { row: 5, col: 1 }, { row: 7, col: 2 }],
      [{ row: 3, col: 6 }, { row: 4, col: 6 }, { row: 3, col: 5 }, { row: 4, col: 5 }],
    ],
    placements: [
      { row: 0, col: 0 },
      { row: -1, col: 1 },
      { row: 1, col: -1 },
      { row: 0, col: 1 },
      { row: 1, col: 0 },
    ],
  },
  {
    key: 'split-pillars',
    description: 'Colunas leves criam escolhas, não corredores únicos.',
    starts: [
      { row: 3, col: 1, direction: 'right' },
      { row: 4, col: 6, direction: 'left' },
    ],
    walls: [
      { row: 1, col: 3 },
      { row: 2, col: 3 },
      { row: 5, col: 4 },
      { row: 6, col: 4 },
    ],
    appleZones: [
      [{ row: 0, col: 1 }, { row: 0, col: 2 }, { row: 1, col: 1 }, { row: 0, col: 3 }],
      [{ row: 6, col: 6 }, { row: 7, col: 6 }, { row: 6, col: 5 }, { row: 7, col: 5 }],
      [{ row: 3, col: 6 }, { row: 4, col: 6 }, { row: 3, col: 5 }, { row: 4, col: 5 }],
    ],
    placements: [
      { row: 0, col: 0 },
      { row: 0, col: 1 },
      { row: 1, col: 0 },
      { row: -1, col: 0 },
      { row: 0, col: -1 },
    ],
  },
  {
    key: 'broken-ring',
    description: 'Um anel incompleto mantém mais de uma rota viva.',
    starts: [
      { row: 2, col: 4, direction: 'down' },
      { row: 5, col: 3, direction: 'up' },
    ],
    walls: [
      { row: 2, col: 2 },
      { row: 2, col: 3 },
      { row: 2, col: 4 },
      { row: 3, col: 2 },
      { row: 4, col: 2 },
      { row: 5, col: 2 },
      { row: 5, col: 3 },
      { row: 5, col: 4 },
      { row: 4, col: 5 },
      { row: 3, col: 5 },
    ],
    appleZones: [
      [{ row: 0, col: 6 }, { row: 1, col: 6 }, { row: 0, col: 5 }],
      [{ row: 6, col: 0 }, { row: 6, col: 1 }, { row: 7, col: 0 }],
      [{ row: 3, col: 6 }, { row: 4, col: 6 }, { row: 2, col: 6 }],
    ],
    placements: [
      { row: 0, col: 0 },
      { row: -1, col: 0 },
      { row: 0, col: -1 },
      { row: 1, col: 0 },
      { row: 0, col: 1 },
    ],
  },
  {
    key: 'diagonal-islands',
    description: 'Pequenas ilhas espalham o movimento sem fechar o mapa.',
    starts: [
      { row: 1, col: 2, direction: 'right' },
      { row: 6, col: 5, direction: 'left' },
    ],
    walls: [
      { row: 1, col: 4 },
      { row: 2, col: 5 },
      { row: 3, col: 3 },
      { row: 4, col: 4 },
      { row: 5, col: 2 },
      { row: 6, col: 3 },
    ],
    appleZones: [
      [{ row: 0, col: 6 }, { row: 1, col: 6 }, { row: 0, col: 5 }],
      [{ row: 6, col: 0 }, { row: 6, col: 1 }, { row: 7, col: 1 }],
      [{ row: 3, col: 6 }, { row: 4, col: 6 }, { row: 2, col: 6 }],
    ],
    placements: [
      { row: 0, col: 0 },
      { row: 1, col: 1 },
      { row: -1, col: -1 },
      { row: 1, col: 0 },
      { row: 0, col: 1 },
    ],
  },
  {
    key: 'edge-markers',
    description: 'Marcos leves nas bordas deixam o centro livre.',
    starts: [
      { row: 2, col: 3, direction: 'down' },
      { row: 5, col: 4, direction: 'up' },
    ],
    walls: [
      { row: 0, col: 2 },
      { row: 1, col: 2 },
      { row: 0, col: 5 },
      { row: 1, col: 5 },
      { row: 6, col: 2 },
      { row: 7, col: 2 },
      { row: 6, col: 5 },
      { row: 7, col: 5 },
    ],
    appleZones: [
      [{ row: 0, col: 3 }, { row: 0, col: 4 }, { row: 1, col: 3 }],
      [{ row: 7, col: 3 }, { row: 7, col: 4 }, { row: 6, col: 3 }],
      [{ row: 3, col: 6 }, { row: 4, col: 6 }, { row: 3, col: 5 }],
    ],
    placements: [
      { row: 0, col: 0 },
      { row: 0, col: -1 },
      { row: 1, col: 0 },
      { row: -1, col: 0 },
      { row: 0, col: 1 },
    ],
  },
  {
    key: 'wide-lane',
    description: 'A arena fica bem aberta, com poucas peças de apoio.',
    starts: [
      { row: 3, col: 2, direction: 'right' },
      { row: 4, col: 5, direction: 'left' },
    ],
    walls: [
      { row: 2, col: 1 },
      { row: 2, col: 6 },
      { row: 5, col: 1 },
      { row: 5, col: 6 },
    ],
    appleZones: [
      [{ row: 0, col: 1 }, { row: 0, col: 2 }, { row: 1, col: 1 }],
      [{ row: 7, col: 6 }, { row: 7, col: 5 }, { row: 6, col: 6 }],
      [{ row: 3, col: 6 }, { row: 4, col: 6 }, { row: 3, col: 5 }],
    ],
    placements: [
      { row: 0, col: 0 },
      { row: -1, col: 1 },
      { row: 1, col: -1 },
      { row: 0, col: 1 },
      { row: 1, col: 0 },
    ],
  },
];

const FALLBACK_STARTS = [
  { row: 1, col: 1, direction: 'right' },
  { row: 1, col: 6, direction: 'left' },
  { row: 6, col: 1, direction: 'right' },
  { row: 6, col: 6, direction: 'left' },
  { row: 2, col: 2, direction: 'right' },
  { row: 2, col: 5, direction: 'left' },
  { row: 5, col: 2, direction: 'right' },
  { row: 5, col: 5, direction: 'left' },
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
export function generateSnakeLevel({ id, seed, index, usedNames = [], usedLayouts = [] }) {
  const rng = createRng(`${seed}:${index}:${id}`);
  const candidates = buildArenaCandidateOrder(seed, index);
  const usedNameSet = new Set(usedNames);
  const usedLayoutSet = usedLayouts.map(normalizeLayoutSignature);

  const strictCandidate = tryBuildArenaLevel({
    id,
    seed,
    index,
    candidates,
    rng,
    usedNameSet,
    usedLayoutSet,
    layoutCheckMode: 'strict',
  });
  if (strictCandidate) {
    return strictCandidate;
  }

  const relaxedCandidate = tryBuildArenaLevel({
    id,
    seed,
    index,
    candidates,
    rng,
    usedNameSet,
    usedLayoutSet,
    layoutCheckMode: 'relaxed',
  });
  if (relaxedCandidate) {
    return relaxedCandidate;
  }

  const fallbackCandidate = buildAdaptiveFallbackArenaLevel({
    id,
    seed,
    index,
    rng,
    usedNameSet,
    usedLayoutSet,
  });
  if (fallbackCandidate) {
    return fallbackCandidate;
  }

  throw new Error(`Unable to generate a valid level for id ${id}`);
}

function tryBuildArenaLevel({ id, seed, index, candidates, rng, usedNameSet, usedLayoutSet, layoutCheckMode }) {
  for (const variant of candidates) {
    const template = ARENA_TEMPLATES[variant.templateIndex];
    const candidate = buildOpenArenaLevel({
      id,
      seed,
      index,
      template,
      rotation: variant.rotation,
      mirrored: variant.mirrored,
      placementIndex: variant.placementIndex,
      startIndex: variant.startIndex,
      rng,
      usedNameSet,
      usedLayoutSet,
      layoutCheckMode,
    });

    if (candidate) {
      return candidate;
    }
  }

  return null;
}

function buildOpenArenaLevel({ id, seed, index, template, rotation, mirrored, placementIndex, startIndex, rng, usedNameSet, usedLayoutSet, layoutCheckMode }) {
  const transformed = transformTemplate(template, rotation, mirrored, placementIndex);
  if (transformed.walls.some((cell) => !isInsideGrid(cell.row, cell.col))) {
    return null;
  }
  if (transformed.appleZones.some((zone) => zone.some((cell) => !isInsideGrid(cell.row, cell.col)))) {
    return null;
  }
  const start = transformed.starts[startIndex % transformed.starts.length];
  if (!start) return null;

  const snake = buildSnakeFromHead(start, start.direction);
  if (!snake || snake.some((segment) => !isInsideGrid(segment.row, segment.col))) {
    return null;
  }

  const walls = transformed.walls;
  const blocked = new Set(walls.map(toKey));
  for (const segment of snake) {
    if (blocked.has(toKey(segment))) {
      return null;
    }
  }

  const apples = [];
  const occupied = new Set([...blocked, ...snake.map(toKey)]);
  for (const zone of transformed.appleZones) {
    const apple = pickAppleFromZone(zone, occupied, start, walls, apples, rng);
    if (!apple) return null;
    apples.push(apple);
    occupied.add(toKey(apple));
  }

  if (!validateOpenArena({ start, snake, walls, apples })) {
    return null;
  }

  const layoutSignature = buildLayoutSignature(walls);
  if (!isLayoutAllowed(layoutSignature, usedLayoutSet, layoutCheckMode)) {
    return null;
  }

  const candidateName = buildGeneratedLevelName(template, seed, index, id, usedNameSet);
  if (!candidateName) {
    return null;
  }
  usedNameSet.add(candidateName);

  const routeDistances = apples.map((apple) => shortestPathDistance(start, apple, blocked, snake));
  const farthestDistance = Math.max(...routeDistances);
  const openCellCount = GRID_SIZE * GRID_SIZE - walls.length - snake.length;
  const baseMaxBlocks = Math.max(14, Math.ceil((farthestDistance + openCellCount / 8) * 1.25));
  const maxBlocks = softenGeneratedMaxBlocks(baseMaxBlocks);
  const starThree = Math.ceil(maxBlocks * 0.7);
  const starTwo = Math.ceil(maxBlocks * 0.9);

  return {
    id,
    name: candidateName,
    description: template.description,
    snake,
    direction: start.direction,
    walls,
    apples,
    maxBlocks,
    maxLoops: 6,
    maxIfs: 3,
    starThree,
    starTwo,
    gridSize: GRID_SIZE,
    generated: true,
    generatedTemplate: template.key,
    layoutSignature,
  };
}

function buildAdaptiveFallbackArenaLevel({ id, seed, index, rng, usedNameSet, usedLayoutSet }) {
  for (let attempt = 0; attempt < 160; attempt++) {
    const start = FALLBACK_STARTS[seededIndex(`${seed}:fallback:start:${attempt}`, index) % FALLBACK_STARTS.length];
    const density = [6, 8, 10, 12, 14][seededIndex(`${seed}:fallback:density:${attempt}`, index) % 5];
    const walls = buildFallbackWalls({ seed, index, attempt, density, start });
    const snake = buildSnakeFromHead(start);

    if (snake.some((segment) => !isInsideGrid(segment.row, segment.col))) {
      continue;
    }

    const blocked = new Set(walls.map(toKey));
    if (snake.some((segment) => blocked.has(toKey(segment)))) {
      continue;
    }

    const apples = pickFallbackApples({ start, walls, snake, seed, index, attempt, rng });
    if (apples.length < 3) continue;

    if (!validateOpenArena({ start, snake, walls, apples })) {
      continue;
    }

    const layoutSignature = buildLayoutSignature(walls);
    if (!isLayoutAllowed(layoutSignature, usedLayoutSet, 'relaxed')) {
      continue;
    }

    const candidateName = buildGeneratedLevelName(null, seed, index, id, usedNameSet);
    if (!candidateName) {
      continue;
    }

    usedNameSet.add(candidateName);
    const routeDistances = apples.map((apple) => shortestPathDistance(start, apple, blocked, snake));
    const farthestDistance = Math.max(...routeDistances);
    const baseMaxBlocks = Math.max(14, Math.ceil((farthestDistance + walls.length / 2) * 1.1));
    const maxBlocks = softenGeneratedMaxBlocks(baseMaxBlocks);
    const starThree = Math.ceil(maxBlocks * 0.7);
    const starTwo = Math.ceil(maxBlocks * 0.9);

    return {
      id,
      name: candidateName,
      description: 'Arena aberta gerada dinamicamente.',
      snake,
      direction: start.direction,
      walls,
      apples,
      maxBlocks,
      maxLoops: 6,
      maxIfs: 3,
      starThree,
      starTwo,
      gridSize: GRID_SIZE,
      generated: true,
      generatedTemplate: 'adaptive-fallback',
      layoutSignature,
    };
  }

  return null;
}

function softenGeneratedMaxBlocks(baseMaxBlocks) {
  return Math.ceil(baseMaxBlocks * GENERATED_MAX_BLOCKS_SCALE);
}

function buildArenaCandidateOrder(seed, index) {
  const candidates = [];

  for (let attempt = 0; attempt < ARENA_TEMPLATES.length * 12; attempt++) {
    const templateIndex = seededIndex(`${seed}:template:${attempt}`, index) % ARENA_TEMPLATES.length;
    const template = ARENA_TEMPLATES[templateIndex];
    candidates.push({
      templateIndex,
      rotation: seededIndex(`${seed}:rot:${attempt}`, index) % 4,
      mirrored: (seededIndex(`${seed}:mirror:${attempt}`, index) % 2) === 1,
      placementIndex: seededIndex(`${seed}:placement:${attempt}`, index) % template.placements.length,
      startIndex: seededIndex(`${seed}:start:${attempt}`, index) % template.starts.length,
    });
  }

  return candidates;
}

function transformTemplate(template, rotation, mirrored, placementIndex) {
  const placement = template.placements[placementIndex % template.placements.length] || { row: 0, col: 0 };
  return {
    starts: template.starts.map((start) => transformStart(start, rotation, mirrored, placement)),
    walls: uniqueCells(template.walls.map((cell) => transformCell(cell, rotation, mirrored, placement))),
    appleZones: template.appleZones.map((zone) => uniqueCells(zone.map((cell) => transformCell(cell, rotation, mirrored, placement)))),
  };
}

function buildFallbackWalls({ seed, index, attempt, density, start }) {
  const protectedCells = new Set(buildProtectedCells(start).map(toKey));
  const walls = [];

  for (let row = 0; row < GRID_SIZE; row++) {
    for (let col = 0; col < GRID_SIZE; col++) {
      const cell = { row, col };
      const key = toKey(cell);
      if (protectedCells.has(key)) continue;

      const value = seededIndex(`${seed}:fallback:wall:${attempt}:${row}:${col}`, index) % 100;
      if (value < density) {
        walls.push(cell);
      }
    }
  }

  const clusters = [
    [{ row: 1, col: 3 }, { row: 1, col: 4 }],
    [{ row: 4, col: 1 }, { row: 5, col: 1 }],
    [{ row: 2, col: 5 }, { row: 3, col: 5 }],
    [{ row: 5, col: 4 }, { row: 5, col: 5 }],
  ];
  const cluster = clusters[seededIndex(`${seed}:fallback:cluster:${attempt}`, index) % clusters.length];
  for (const cell of cluster) {
    if (!protectedCells.has(toKey(cell)) && isInsideGrid(cell.row, cell.col)) {
      walls.push(cell);
    }
  }

  return uniqueCells(walls.filter((cell) => isInsideGrid(cell.row, cell.col)));
}

function buildProtectedCells(start) {
  const snake = buildSnakeFromHead(start);
  const protectedCells = [...snake];
  for (const cell of snake) {
    protectedCells.push(...neighbors(cell));
  }
  return uniqueCells(protectedCells.filter((cell) => isInsideGrid(cell.row, cell.col)));
}

function pickFallbackApples({ start, walls, snake, seed, index, attempt, rng }) {
  const blocked = new Set(walls.map(toKey));
  const occupied = new Set(snake.map(toKey));
  const desiredQuadrants = shuffleArray([0, 1, 2, 3], seededIndex(`${seed}:fallback:quadrants:${attempt}`, index));
  const selected = [];
  const usedKeys = new Set();

  for (const quadrant of desiredQuadrants) {
    const candidates = [];
    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        const cell = { row, col };
        const key = toKey(cell);
        if (blocked.has(key) || occupied.has(key) || usedKeys.has(key)) continue;
        if (getQuadrant(cell) !== quadrant) continue;
        const routes = shortestPathRoutes(start, cell, blocked, occupied);
        if (routes === 0) continue;
        const score = (routes >= 2 ? 200 : 40) + (countOpenNeighbors(cell, blocked, occupied) * 15) + (manhattan(start, cell) * 3) + Math.floor(rng() * 8);
        candidates.push({ cell, score });
      }
    }

    candidates.sort((a, b) => b.score - a.score);
    const chosen = candidates.find(({ cell }) => selected.every((apple) => manhattan(apple, cell) >= 2));
    if (chosen) {
      selected.push(chosen.cell);
      usedKeys.add(toKey(chosen.cell));
    }
    if (selected.length === 3) break;
  }

  if (selected.length < 3) {
    const allCandidates = [];
    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        const cell = { row, col };
        const key = toKey(cell);
        if (blocked.has(key) || occupied.has(key) || usedKeys.has(key)) continue;
        const routes = shortestPathRoutes(start, cell, blocked, occupied);
        if (routes === 0) continue;
        const score = (routes >= 2 ? 200 : 40) + (countOpenNeighbors(cell, blocked, occupied) * 15) + (manhattan(start, cell) * 3) + Math.floor(rng() * 8);
        allCandidates.push({ cell, score });
      }
    }

    allCandidates.sort((a, b) => b.score - a.score);
    for (const candidate of allCandidates) {
      if (selected.every((apple) => manhattan(apple, candidate.cell) >= 2)) {
        selected.push(candidate.cell);
      }
      if (selected.length === 3) break;
    }
  }

  return selected.slice(0, 3);
}

function getQuadrant(cell) {
  const top = cell.row < GRID_SIZE / 2 ? 0 : 1;
  const left = cell.col < GRID_SIZE / 2 ? 0 : 1;
  return (top * 2) + left;
}

function shuffleArray(values, seed) {
  const result = [...values];
  let state = seed || 1;
  for (let i = result.length - 1; i > 0; i--) {
    state = (state * 1664525 + 1013904223) >>> 0;
    const j = state % (i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function transformStart(start, rotation, mirrored, placement) {
  const cell = transformCell(start, rotation, mirrored, placement);
  return {
    row: cell.row,
    col: cell.col,
    direction: transformDirection(start.direction, rotation, mirrored),
  };
}

function transformCell(cell, rotation, mirrored, placement = { row: 0, col: 0 }) {
  let row = cell.row;
  let col = cell.col;

  if (mirrored) {
    col = GRID_SIZE - 1 - col;
  }

  for (let i = 0; i < rotation; i++) {
    const nextRow = col;
    const nextCol = GRID_SIZE - 1 - row;
    row = nextRow;
    col = nextCol;
  }

  return { row: row + placement.row, col: col + placement.col };
}

function transformDirection(direction, rotation, mirrored) {
  const directions = ['right', 'down', 'left', 'up'];
  let index = directions.indexOf(direction);
  if (index === -1) return direction;

  if (mirrored) {
    if (direction === 'left') index = directions.indexOf('right');
    else if (direction === 'right') index = directions.indexOf('left');
  }

  index = (index + rotation) % directions.length;
  return directions[index];
}

function buildSnakeFromHead(head) {
  const delta = directionToDelta(head.direction);
  const back = { row: -delta.row, col: -delta.col };
  const bodyOne = { row: head.row + back.row, col: head.col + back.col };
  const bodyTwo = { row: bodyOne.row + back.row, col: bodyOne.col + back.col };
  return [
    { row: head.row, col: head.col },
    bodyOne,
    bodyTwo,
  ];
}

function pickAppleFromZone(zone, occupied, start, walls, currentApples, rng) {
  const candidates = zone
    .filter((cell) => isInsideGrid(cell.row, cell.col))
    .filter((cell) => !occupied.has(toKey(cell)))
    .map((cell) => ({
      cell,
      score: scoreAppleCell(cell, start, walls, currentApples, occupied, rng),
    }))
    .sort((a, b) => b.score - a.score);

  return candidates[0] ? candidates[0].cell : null;
}

function scoreAppleCell(cell, start, walls, currentApples, occupied, rng) {
  const blocked = new Set(walls.map(toKey));
  for (const apple of currentApples) {
    blocked.add(toKey(apple));
  }

  const routes = shortestPathRoutes(start, cell, blocked, occupied);
  if (routes === 0) return -Infinity;

  const openNeighbors = countOpenNeighbors(cell, blocked, occupied);
  const distance = manhattan(start, cell);
  const spacing = currentApples.every((apple) => manhattan(apple, cell) >= 2) ? 12 : -20;
  const routeBonus = routes >= 2 ? 120 : 0;
  return routeBonus + (openNeighbors * 12) + (distance * 3) + spacing + Math.floor(rng() * 4);
}

function validateOpenArena({ start, snake, walls, apples }) {
  const blocked = new Set([...walls, ...snake.slice(1)].map(toKey));
  if (countOpenNeighbors(start, blocked, new Set()) < 2) {
    return false;
  }

  const counts = apples.map((apple) => shortestPathRoutes(start, apple, blocked, new Set()));
  if (counts.some((count) => count === 0)) {
    return false;
  }

  return counts.some((count) => count >= 2);
}

function shortestPathDistance(start, target, blocked, snake) {
  const result = shortestPathRoutes(start, target, blocked, new Set(snake.map(toKey)), true);
  return result.distance;
}

function shortestPathRoutes(start, target, blocked, occupied = new Set(), withDistance = false) {
  const startKey = toKey(start);
  const targetKey = toKey(target);
  const queue = [start];
  const distance = new Map([[startKey, 0]]);
  const paths = new Map([[startKey, 1]]);
  const blockedKeys = blocked instanceof Set ? blocked : new Set(blocked);

  while (queue.length > 0) {
    const current = queue.shift();
    const currentKey = toKey(current);
    const currentDistance = distance.get(currentKey);

    for (const next of neighbors(current)) {
      if (!isInsideGrid(next.row, next.col)) continue;
      const nextKey = toKey(next);
      if (nextKey !== targetKey && (blockedKeys.has(nextKey) || occupied.has(nextKey))) continue;

      if (!distance.has(nextKey)) {
        distance.set(nextKey, currentDistance + 1);
        paths.set(nextKey, paths.get(currentKey));
        queue.push(next);
      } else if (distance.get(nextKey) === currentDistance + 1) {
        paths.set(nextKey, Math.min(2, (paths.get(nextKey) || 0) + paths.get(currentKey)));
      }
    }
  }

  const count = paths.get(targetKey) || 0;
  if (withDistance) {
    return { count, distance: distance.get(targetKey) ?? Number.POSITIVE_INFINITY };
  }
  return count;
}

function countOpenNeighbors(cell, blocked, occupied) {
  let total = 0;
  for (const next of neighbors(cell)) {
    if (!isInsideGrid(next.row, next.col)) continue;
    const key = toKey(next);
    if (!blocked.has(key) && !occupied.has(key)) total++;
  }
  return total;
}

function neighbors(cell) {
  return [
    { row: cell.row + 1, col: cell.col },
    { row: cell.row - 1, col: cell.col },
    { row: cell.row, col: cell.col + 1 },
    { row: cell.row, col: cell.col - 1 },
  ];
}

function manhattan(a, b) {
  return Math.abs(a.row - b.row) + Math.abs(a.col - b.col);
}

function uniqueCells(cells) {
  const seen = new Set();
  const result = [];
  for (const cell of cells) {
    const key = toKey(cell);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(cell);
  }
  return result;
}

function buildLayoutSignature(walls) {
  const sorted = [...walls].map(toKey).sort();
  const rows = Array.from({ length: GRID_SIZE }, () => 0);
  const cols = Array.from({ length: GRID_SIZE }, () => 0);
  const quadrants = [0, 0, 0, 0];

  for (const cell of walls) {
    rows[cell.row] += 1;
    cols[cell.col] += 1;
    const top = cell.row < GRID_SIZE / 2 ? 0 : 1;
    const left = cell.col < GRID_SIZE / 2 ? 0 : 1;
    quadrants[(top * 2) + left] += 1;
  }

  return {
    hash: sorted.join('|'),
    wallCount: walls.length,
    rows,
    cols,
    quadrants,
  };
}

function normalizeLayoutSignature(layoutSignature) {
  if (!layoutSignature) return null;
  if (typeof layoutSignature === 'string') {
    return {
      hash: layoutSignature,
      wallCount: 0,
      rows: [],
      cols: [],
      quadrants: [],
    };
  }
  return layoutSignature;
}

function isLayoutAllowed(candidate, usedLayouts, layoutCheckMode = 'strict') {
  return !usedLayouts.some((layout) => {
    if (!layout) return false;
    if (layout.hash === candidate.hash) return true;

    if (layoutCheckMode === 'relaxed') {
      return false;
    }

    const overlap = layoutOverlap(layout.hash, candidate.hash);
    if (overlap >= 0.86) return true;

    const rowSimilarity = vectorSimilarity(layout.rows, candidate.rows);
    const colSimilarity = vectorSimilarity(layout.cols, candidate.cols);
    const quadrantSimilarity = vectorSimilarity(layout.quadrants, candidate.quadrants);
    const score = (overlap * 0.45) + (rowSimilarity * 0.25) + (colSimilarity * 0.25) + (quadrantSimilarity * 0.05);
    return score >= 0.95;
  });
}

function layoutOverlap(hashA, hashB) {
  const setA = new Set(hashA.split('|').filter(Boolean));
  const setB = new Set(hashB.split('|').filter(Boolean));
  let intersection = 0;
  for (const value of setA) {
    if (setB.has(value)) intersection++;
  }
  const union = setA.size + setB.size - intersection;
  return union > 0 ? intersection / union : 0;
}

function vectorSimilarity(a, b) {
  const length = Math.max(a.length, b.length, 1);
  let diff = 0;
  for (let i = 0; i < length; i++) {
    diff += Math.abs((a[i] || 0) - (b[i] || 0));
  }
  return 1 - Math.min(1, diff / (length * GRID_SIZE));
}

function pickSegmentLengths(template, rng) {
  if (Array.isArray(template.lengths) && template.lengths.length === template.segments.length) {
    return [...template.lengths];
  }

  return template.segments.map((direction) => pickSegmentLength(direction, rng));
}

function buildGeneratedLevelName(template, seed, index, id, usedNameSet) {
  const bases = [
    ...(Array.isArray(template?.nameOptions) ? template.nameOptions : []),
    ...NAME_POOL,
  ];
  const baseStart = seededIndex(`${seed}:name`, index + id) % bases.length;

  for (let offset = 0; offset < bases.length; offset++) {
    const candidate = bases[(baseStart + offset) % bases.length];
    if (!usedNameSet.has(candidate)) {
      return candidate;
    }
  }

  const suffixStart = seededIndex(`${seed}:name:suffix`, index + id) % NAME_SUFFIXES.length;
  for (let baseOffset = 0; baseOffset < bases.length; baseOffset++) {
    const base = bases[(baseStart + baseOffset) % bases.length];
    for (let suffixOffset = 0; suffixOffset < NAME_SUFFIXES.length; suffixOffset++) {
      const suffix = NAME_SUFFIXES[(suffixStart + suffixOffset) % NAME_SUFFIXES.length];
      const candidate = `${base} ${suffix}`;
      if (!usedNameSet.has(candidate)) {
        return candidate;
      }
    }
  }

  return null;
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

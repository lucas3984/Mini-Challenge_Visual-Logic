import { escapeHtml } from '../utils/sanitize.js';

const ROWS = 8;
const COLS = 8;

const DIRECTION_CYCLE = ['right', 'down', 'left', 'up'];

const VALID_TYPES = new Set(['snake-head', 'snake-body', 'apple', 'wall']);

function cloneGrid(grid) {
  return grid.map(row => row.map(cell => cell ? { ...cell } : null));
}

function createEmptyGrid() {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(null));
}

function countSnakeHead(grid) {
  let count = 0;
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (grid[r][c] && grid[r][c].type === 'snake-head') count++;
    }
  }
  return count;
}

function isAdjacentToType(grid, row, col, type) {
  const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
  return dirs.some(([dr, dc]) => {
    const r = row + dr, c = col + dc;
    if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return false;
    return grid[r][c]?.type === type;
  });
}

function isInFrontOfHead(grid, row, col) {
  const head = findSnakeHead(grid);
  if (!head) return false;
  const dr = head.direction === 'down' ? 1 : head.direction === 'up' ? -1 : 0;
  const dc = head.direction === 'right' ? 1 : head.direction === 'left' ? -1 : 0;
  return row === head.row + dr && col === head.col + dc;
}

function findSnakeHead(grid) {
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (grid[r][c] && grid[r][c].type === 'snake-head') {
        return { row: r, col: c, direction: grid[r][c].direction || 'right' };
      }
    }
  }
  return null;
}

function collectCells(grid, type) {
  const cells = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (grid[r][c] && grid[r][c].type === type) {
        cells.push({ row: r, col: c });
      }
    }
  }
  return cells;
}

function walkSnakeChain(grid, headRow, headCol) {
  const visited = new Set();
  const ordered = [{ row: headRow, col: headCol }];
  visited.add(`${headRow},${headCol}`);

  const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];

  while (true) {
    const last = ordered[ordered.length - 1];
    let next = null;
    for (const [dr, dc] of dirs) {
      const r = last.row + dr, c = last.col + dc;
      if (r < 0 || r >= ROWS || c < 0 || c >= COLS) continue;
      const key = `${r},${c}`;
      if (visited.has(key)) continue;
      const cell = grid[r][c];
      if (cell && cell.type === 'snake-body') {
        next = { row: r, col: c };
        visited.add(key);
        break;
      }
    }
    if (next) {
      ordered.push(next);
    } else {
      break;
    }
  }
  return ordered;
}

export class CreatorState {
  #grid;
  #selectedAsset;
  #history;
  #historyIndex;
  #listeners;

  constructor() {
    this.#grid = createEmptyGrid();
    this.#selectedAsset = null;
    this.#history = [cloneGrid(this.#grid)];
    this.#historyIndex = 0;
    this.#listeners = new Map();
  }

  // ── Event system ──

  on(event, cb) {
    if (!this.#listeners.has(event)) this.#listeners.set(event, new Set());
    this.#listeners.get(event).add(cb);
  }

  off(event, cb) {
    const set = this.#listeners.get(event);
    if (set) set.delete(cb);
  }

  #emit(event, data) {
    const set = this.#listeners.get(event);
    if (set) set.forEach(cb => cb(data));
  }

  // ── Selection ──

  get selectedAsset() {
    return this.#selectedAsset;
  }

  set selectedAsset(id) {
    if (id !== null && !VALID_TYPES.has(id)) return;
    this.#selectedAsset = this.#selectedAsset === id ? null : id;
    this.#emit('selection-change', this.#selectedAsset);
  }

  // ── Grid access ──

  getGrid() {
    return this.#grid;
  }

  getCell(row, col) {
    if (row < 0 || row >= ROWS || col < 0 || col >= COLS) return null;
    return this.#grid[row][col];
  }

  // ── Grid mutation ──

  setCell(row, col, value) {
    if (row < 0 || row >= ROWS || col < 0 || col >= COLS) return { success: false, reason: 'Fora do tabuleiro' };
    if (this.#grid[row][col] !== null) return { success: false, reason: 'Célula já ocupada' };
    if (!value || !VALID_TYPES.has(value.type)) return { success: false, reason: 'Tipo inválido' };

    if (value.type === 'snake-head' && countSnakeHead(this.#grid) > 0) {
      return { success: false, reason: 'Apenas uma cabeça de cobra é permitida' };
    }

    if (value.type === 'snake-body') {
      const result = this.canPlaceBody(row, col);
      if (!result.valid) return { success: false, reason: result.reason };
    }

    const dir = value.type === 'snake-head' ? (value.direction || 'right') : undefined;
    this.#grid[row][col] = { type: value.type, ...(dir ? { direction: dir } : {}) };
    this.#pushHistory();
    this.#dirty();

    if (value.type === 'snake-head') {
      this.#selectedAsset = null;
      this.#emit('selection-change', null);
    }

    return { success: true };
  }

  clearCell(row, col) {
    if (row < 0 || row >= ROWS || col < 0 || col >= COLS) return { success: false };
    if (this.#grid[row][col] === null) return { success: true };
    this.#grid[row][col] = null;
    this.#pushHistory();
    this.#dirty();
    return { success: true };
  }

  clearAll() {
    this.#grid = createEmptyGrid();
    this.#pushHistory();
    this.#dirty();
  }

  rotateHead(row, col) {
    const cell = this.#grid[row][col];
    if (!cell || cell.type !== 'snake-head') return;
    const currentIdx = DIRECTION_CYCLE.indexOf(cell.direction || 'right');
    cell.direction = DIRECTION_CYCLE[(currentIdx + 1) % 4];
    this.#pushHistory();
    this.#dirty();
  }

  canPlaceBody(row, col) {
    const bodyCells = collectCells(this.#grid, 'snake-body');
    const head = findSnakeHead(this.#grid);

    if (bodyCells.length === 0) {
      if (!head) return { valid: false, reason: 'Coloque a cabeça primeiro' };
      if (!isAdjacentToType(this.#grid, row, col, 'snake-head')) {
        return { valid: false, reason: 'O primeiro segmento do corpo deve ser adjacente à cabeça' };
      }
      if (isInFrontOfHead(this.#grid, row, col)) {
        return { valid: false, reason: 'O primeiro segmento não pode ficar na frente da cabeça' };
      }
      return { valid: true };
    }

    if (!isAdjacentToType(this.#grid, row, col, 'snake-body')) {
      return { valid: false, reason: 'Corpo deve ser adjacente a outro segmento do corpo' };
    }

    return { valid: true };
  }

  moveCell(fromRow, fromCol, toRow, toCol) {
    if (fromRow === toRow && fromCol === toCol) return { success: false, reason: 'Mesma célula' };
    const source = this.#grid[fromRow][fromCol];
    if (!source) return { success: false, reason: 'Célula de origem vazia' };
    if (this.#grid[toRow][toCol] !== null) return { success: false, reason: 'Célula de destino ocupada' };

    if (source.type === 'snake-head' && countSnakeHead(this.#grid) > 1) {
      return { success: false, reason: 'Apenas uma cabeça de cobra é permitida' };
    }

    if (source.type === 'snake-body') {
      const backup = this.#grid[fromRow][fromCol];
      this.#grid[fromRow][fromCol] = null;
      // Temporarily clear source to prevent self-adjacency during validation
      const result = this.canPlaceBody(toRow, toCol);
      this.#grid[fromRow][fromCol] = backup;
      if (!result.valid) {
        return { success: false, reason: result.reason };
      }
    }

    this.#grid[toRow][toCol] = { ...source };
    this.#grid[fromRow][fromCol] = null;

    if (source.type === 'snake-head') {
      // Moving the head invalidates the body chain — clear all body segments (undoable)
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          if (this.#grid[r][c]?.type === 'snake-body') {
            this.#grid[r][c] = null;
          }
        }
      }
    }

    this.#pushHistory();
    this.#dirty();
    return { success: true };
  }

  // ── Undo / Redo ──

  canUndo() {
    return this.#historyIndex > 0;
  }

  canRedo() {
    return this.#historyIndex < this.#history.length - 1;
  }

  undo() {
    if (!this.canUndo()) return;
    this.#historyIndex--;
    this.#grid = cloneGrid(this.#history[this.#historyIndex]);
    this.#dirty();
  }

  redo() {
    if (!this.canRedo()) return;
    this.#historyIndex++;
    this.#grid = cloneGrid(this.#history[this.#historyIndex]);
    this.#dirty();
  }

  // ── Pre-save validation ──

  preValidate(name) {
    if (!name || !name.trim()) return { valid: false, reason: 'Dê um nome para a fase' };

    const head = findSnakeHead(this.#grid);
    if (!head) return { valid: false, reason: 'Coloque a cabeça da cobra no tabuleiro' };

    const apples = collectCells(this.#grid, 'apple');
    if (apples.length === 0) return { valid: false, reason: 'Coloque pelo menos uma maçã no tabuleiro' };

    const bodyCount = collectCells(this.#grid, 'snake-body').length;
    if (bodyCount === 0) return { valid: false, reason: 'A cobra precisa de um corpo (mínimo 1 segmento)' };

    const dr = head.direction === 'down' ? 1 : head.direction === 'up' ? -1 : 0;
    const dc = head.direction === 'right' ? 1 : head.direction === 'left' ? -1 : 0;
    const frontRow = head.row + dr;
    const frontCol = head.col + dc;
    if (
      frontRow >= 0 && frontRow < 8 &&
      frontCol >= 0 && frontCol < 8 &&
      this.#grid[frontRow][frontCol]?.type === 'snake-body'
    ) {
      return { valid: false, reason: 'A cabeça não pode estar virada para o próprio corpo' };
    }

    const chain = walkSnakeChain(this.#grid, head.row, head.col);
    if (chain.length !== bodyCount + 1) {
      return { valid: false, reason: 'O corpo da cobra não forma uma cadeia contínua a partir da cabeça' };
    }

    for (const seg of chain) {
      let connections = 0;
      const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
      for (const [dr, dc] of dirs) {
        const r = seg.row + dr, c = seg.col + dc;
        if (r < 0 || r >= ROWS || c < 0 || c >= COLS) continue;
        const cell = this.#grid[r][c];
        if (cell && (cell.type === 'snake-head' || cell.type === 'snake-body')) connections++;
      }
      if (connections > 2) {
        return { valid: false, reason: 'A cobra não pode ter bifurcações (cada segmento conecta a no máximo 2)' };
      }
    }

    return { valid: true };
  }

  // ── Export ──

  exportLevel(name, description) {
    const head = findSnakeHead(this.#grid);
    const bodyCells = collectCells(this.#grid, 'snake-body');
    const walls = collectCells(this.#grid, 'wall');
    const apples = collectCells(this.#grid, 'apple');

    let snake;
    if (bodyCells.length > 0) {
      snake = walkSnakeChain(this.#grid, head.row, head.col);
    } else {
      snake = [{ row: head.row, col: head.col }];
    }

    return {
      snake: snake.map(s => ({ row: s.row, col: s.col })),
      direction: head.direction || 'right',
      walls,
      apples,
      gridSize: 8,
      name: escapeHtml((name || '').trim()),
      description: escapeHtml((description || '').trim()),
    };
  }

  importLevel(levelData) {
    if (!levelData || !Array.isArray(levelData.snake) || levelData.snake.length === 0) {
      return { success: false, reason: 'Dados inválidos: array snake ausente ou vazio' };
    }
    if (!['right', 'down', 'left', 'up'].includes(levelData.direction)) {
      return { success: false, reason: 'Direção inválida' };
    }
    if (!Array.isArray(levelData.walls)) {
      return { success: false, reason: 'Dados inválidos: walls ausente' };
    }
    if (!Array.isArray(levelData.apples)) {
      return { success: false, reason: 'Dados inválidos: apples ausente' };
    }

    const size = levelData.gridSize || ROWS;
    if (size !== ROWS) {
      return { success: false, reason: `O grid deve ser ${ROWS}x${ROWS}` };
    }

    const allCells = [
      ...levelData.snake.map(c => ({ ...c, type: 'snake' })),
      ...levelData.walls.map(c => ({ ...c, type: 'wall' })),
      ...levelData.apples.map(c => ({ ...c, type: 'apple' })),
    ];

    const seen = new Set();
    for (const cell of allCells) {
      if (cell.row < 0 || cell.row >= ROWS || cell.col < 0 || cell.col >= COLS) {
        return { success: false, reason: `Coordenada fora do tabuleiro: (${cell.row}, ${cell.col})` };
      }
      const key = `${cell.row},${cell.col}`;
      if (seen.has(key)) {
        return { success: false, reason: `Posição duplicada: (${cell.row}, ${cell.col})` };
      }
      seen.add(key);
    }

    this.#grid = createEmptyGrid();
    this.#selectedAsset = null;

    const head = levelData.snake[0];
    this.#grid[head.row][head.col] = { type: 'snake-head', direction: levelData.direction };

    for (let i = 1; i < levelData.snake.length; i++) {
      const seg = levelData.snake[i];
      this.#grid[seg.row][seg.col] = { type: 'snake-body' };
    }

    for (const w of levelData.walls) {
      this.#grid[w.row][w.col] = { type: 'wall' };
    }

    for (const a of levelData.apples) {
      this.#grid[a.row][a.col] = { type: 'apple' };
    }

    this.#pushHistory();
    this.#dirty();
    this.#emit('selection-change', null);
    return { success: true };
  }

  // ── Internals ──

  #pushHistory() {
    const keep = this.#historyIndex + 1;
    // Discard future history (undo branch) — new action creates a fresh branch
    this.#history.length = keep;
    this.#history.push(cloneGrid(this.#grid));
    this.#historyIndex++;
  }

  #dirty() {
    this.#emit('grid-change', this.#grid);
    this.#emit('history-change', { canUndo: this.canUndo(), canRedo: this.canRedo() });
  }
}

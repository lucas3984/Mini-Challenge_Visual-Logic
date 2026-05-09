/**
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 *  LEGACY LEVEL DEFINITIONS — DO NOT USE
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 *
 * This file is kept as a commented reference only.
 * All levels are now generated procedurally by level-generator.js.
 * The format below documents the expected object shape.
 *
 * To disable the generator and restore manual levels, replace
 * `games.js` imports with:
 *
 *   import { levels } from './levels.js';
 *
 * And remove the level-generator.js module.
 *
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 *
 * export const levels = [
 *   {
 *     id: 1,
 *     name: 'A Escada',
 *     description: '...',
 *
 *     snake: [
 *       { row: 5, col: 0 },
 *       { row: 6, col: 0 },
 *       { row: 7, col: 0 },
 *     ],
 *
 *     direction: 'up',   // 'right' | 'down' | 'left' | 'up'
 *
 *     walls: [
 *       { row: 1, col: 7 },
 *       { row: 2, col: 7 },
 *       // ... more wall cells
 *     ],
 *
 *     apples: [
 *       { row: 0, col: 7 },
 *       { row: 2, col: 5 },
 *       // ... more apple cells
 *     ],
 *
 *     maxBlocks: 15,   // Total top-level blocks allowed in workspace
 *     maxLoops: 3,     // Max Repeat blocks
 *     maxIfs: 1,       // Max Se (conditional) blocks
 *
 *     starThree: 8,   // Max blocks to earn 3 stars
 *     starTwo: 12,    // Max blocks to earn 2 stars
 *
 *     gridSize: 8,
 *   },
 *   // ... more levels (id increments sequentially, 1-based)
 * ];
 *
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 *  Level object field reference
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 *
 * id           {number}  Sequential level ID, starts at 1
 * name         {string}  Level name displayed in the UI
 * description  {string}  Hint text shown to the player
 *
 * snake        {Array<{row:number, col:number}>}
 *               Snake body segments. Head is index 0.
 *               All segments must fit within gridSize.
 *
 * direction    {string}  Initial facing direction of the snake head.
 *               One of: 'right' | 'down' | 'left' | 'up'
 *
 * walls        {Array<{row:number, col:number}>}
 *               Wall cells. Snake dies on contact.
 *               Should not overlap with snake or apple cells.
 *
 * apples       {Array<{row:number, col:number}>}
 *               Apple cells. Snake grows and scores on contact.
 *               Must be reachable from snake start via open cells.
 *
 * maxBlocks    {number}  Upper bound on top-level blocks the player
 *               may place in the workspace (not counting nested blocks).
 *
 * maxLoops     {number}  Max Repeat (loop) blocks at any nesting level.
 *
 * maxIfs       {number}  Max Se (conditional) blocks at any nesting level.
 *
 * starThree    {number}  Block count threshold for 3-star rating.
 *               player must complete level using <= this many blocks.
 *
 * starTwo      {number}  Block count threshold for 2-star rating.
 *               player must complete level using <= this many blocks.
 *               starOne is implicit: level completed at all = 1 star.
 *
 * gridSize     {number}  Grid dimension. Always 8 in this project.
 *
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 *  Star rating formula
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 *
 * blocks used <= starThree → 3 stars
 * blocks used <= starTwo   → 2 stars
 * level completed          → 1 star
 *
 * Stored score is the star count (1-3), not raw block count.
 * See utils/stars.js → calculateStars(used, three, two)
 *
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 *  Block budget design guideline
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 *
 * A level should be solvable but not trivial.
 * Design: find the shortest BFS path from snake start to all apples,
 * count the moves (each move = 1 block, or 1 loop iteration).
 *
 * Example: path requires 12 moves
 *   maxBlocks  = 12 + 2  (small margin for loops/ifs)
 *   starThree   = 12 - 2  (tight — player must use loops)
 *   starTwo     = 12 + 1  (loose — single actions still pass)
 *
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 */
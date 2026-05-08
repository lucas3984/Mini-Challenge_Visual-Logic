/**
 * Snake Tactical game page controller.
 *
 * Renders the full game UI (header, sidebar, workspace, stage, modals) and wires
 * all interactive subsystems: drag-drop block assembly, level progression, score
 * persistence, and the execution runner. Acts as the single orchestrator that
 * glues together the drag-drop component, stage renderer, snake actor, runner,
 * and storage layers.
 */

import { DragDrop } from '../components/drag-drop.js';
import { Stage } from '../components/stage.js';
import { Snake } from '../actors/snake.js';
import { Runner } from '../engine/runner.js';
import { parseWorkspace } from '../engine/parser.js';
import { countAllBlocks, countLoopBlocks, countIfBlocks, countIfChildren, countLoopChildren, countLoopsInIf, countIfsInLoop } from '../utils/dom.js';
import { AudioFX } from '../core/audio.js';
import { getItem, setItem, removeItem, getJSON, setJSON } from '../core/storage.js';
import { levels } from '../engine/levels.js';

// Pre-compute the 8x8 checkerboard grid HTML once at module load — it never
// changes across level transitions, so caching avoids repeated DOM string
// construction on every render() call.
const GRID_HTML = [0, 1, 2, 3, 4, 5, 6, 7].map((r) => {
  const cells = [0, 1, 2, 3, 4, 5, 6, 7].map((c) => {
    // Alternating row+col parity produces the classic checkerboard pattern.
    const shade = (r + c) % 2 === 0 ? 'grid__cell--light' : 'grid__cell--dark';
    return `<div class="grid__cell ${shade}" data-row="${r}" data-col="${c}"></div>`;
  }).join('');
  return `<div class="grid__row">${cells}</div>`;
}).join('');

/**
 * Builds and returns the root HTMLElement for the snake page.
 * Called by the SPA router — must return a plain DOM node.
 *
 * @returns {HTMLElement} The fully assembled page element.
 */
export function render(params = {}) {
  // Extract level ID from URL to load correct level on direct navigation
  const currentLevelId = params.levelId;
  const currentLevelIndex = currentLevelId
    ? parseInt(currentLevelId, 10) - 1
    : 0;

  const root = document.createElement('div');
  root.className = 'page--snake';
  root.setAttribute('data-theme', 'dark');
  root.innerHTML = `
    <header class="app-header">
      <div class="app-header__left">
        <h1 class="app-header__title">Snake Tactical</h1>
      </div>
      <div class="app-header__right">
        <a href="#/levels/snake" class="header-btn header-btn--hub">
          <img src="src/assets/images/icons/snake-icons/icon-hub.svg" alt="" aria-hidden="true" class="btn-icon" width="24" height="24"> Voltar
        </a>
        <button id="btn-run" class="header-btn header-btn--run" aria-label="Executar código">
          <img src="src/assets/images/icons/snake-icons/icon-run.svg" alt="" aria-hidden="true" class="btn-icon" width="24" height="24"> Executar
        </button>
        <button id="btn-pause" class="header-btn header-btn--pause" aria-label="Pausar execução" disabled>
          <img src="src/assets/images/icons/snake-icons/icon-pause.svg" alt="" aria-hidden="true" class="btn-icon" width="24" height="24"> Pausar
        </button>
        <div class="header-divider"></div>
        <button id="btn-clear" class="header-btn header-btn--clear" aria-label="Limpar área">
          <img src="src/assets/images/icons/snake-icons/icon-clear.svg" alt="" aria-hidden="true" class="btn-icon" width="24" height="24"> Limpar
        </button>
      </div>
    </header>

    <div class="level-bar">
      <select id="level-select" class="level-selector" aria-label="Selecionar nível">
        <option value="0">Nível 1 — The Staircase</option>
        <option value="1" disabled>Nível 2 — Detour</option>
        <option value="2" disabled>Nível 3 — Shortcut</option>
        <option value="3" disabled>Nível 4 — Wall Ahead</option>
        <option value="4" disabled>Nível 5 — Double Collect</option>
      </select>
      <span class="level-name" id="level-name"></span>
      <button id="btn-rules" class="progress-reset-btn" aria-label="Ver regras">Regras</button>
      <span class="block-counter" id="block-counter">Blocos: 0 / 10</span>
      <span class="block-counter loop-counter" id="loop-counter">Loops: 0 / 1</span>
      <span class="block-counter loop-counter" id="if-counter">Se: 0 / 1</span>
    </div>

    <div class="app-container">
      <aside class="sidebar" aria-label="Paleta de blocos">
        <div class="sidebar__header">
          <h2 class="sidebar__title">Blocos</h2>
          <p class="sidebar__subtitle">Arraste para a área de trabalho</p>
        </div>

        <div class="sidebar__categories">
          <section class="sidebar__category" aria-labelledby="cat-action">
            <h3 id="cat-action" class="sidebar__category-header">
              <span class="sidebar__category-dot sidebar__category-dot--action"></span> Ação
            </h3>
            <div class="sidebar__category-items" role="list">
              <div class="block block--action"
                  draggable="true"
                  data-block-type="move-forward"
                  tabindex="0"
                  role="listitem"
                  title="Move a cobra 1 casa na direção atual"
                  aria-grabbed="false">Mover Frente</div>
              <div class="block block--action"
                  draggable="true"
                  data-block-type="turn-left"
                  tabindex="0"
                  role="listitem"
                  title="Gira a cobra 90° para a esquerda"
                  aria-grabbed="false">Girar Esquerda</div>
              <div class="block block--action"
                  draggable="true"
                  data-block-type="turn-right"
                  tabindex="0"
                  role="listitem"
                  title="Gira a cobra 90° para a direita"
                  aria-grabbed="false">Girar Direita</div>
            </div>
          </section>

          <section class="sidebar__category" aria-labelledby="cat-control">
            <h3 id="cat-control" class="sidebar__category-header">
              <span class="sidebar__category-dot sidebar__category-dot--control"></span> Controle
            </h3>
            <div class="sidebar__category-items" role="list">
              <div class="c-block c-block--loop"
                  draggable="true"
                  data-block-type="repeat"
                  tabindex="0"
                  role="listitem"
                  title="Repete os blocos dentro dele N vezes"
                  aria-grabbed="false">
                <div class="c-block__header">
                  <span class="c-block__label">Repetir</span>
                  <input class="c-block__input" type="number" value="3" min="1" max="99" aria-label="Número de repetições">
                  <span class="c-block__label">vezes</span>
                </div>
                <div class="c-block__body">
                  <div class="c-block__spine"></div>
                  <div class="c-block__dropzone" aria-label="Zona de encaixe de blocos"></div>
                </div>
                <div class="c-block__footer">fim</div>
              </div>
            </div>
          </section>

          <section class="sidebar__category" aria-labelledby="cat-event">
            <h3 id="cat-event" class="sidebar__category-header">
              <span class="sidebar__category-dot sidebar__category-dot--event"></span> Eventos
            </h3>
            <div class="sidebar__category-items" role="list">
              <div class="c-block c-block--event"
                  draggable="true"
                  data-block-type="if-apple-ahead"
                  tabindex="0"
                  role="listitem"
                  title="Executa os blocos dentro apenas se a condição for verdadeira"
                  aria-grabbed="false">
                <div class="c-block__header">
                  <span class="c-block__label">Se</span>
                  <select class="c-block__select" aria-label="Condição">
                    <option>Maçã à frente</option>
                    <option>Parede à frente</option>
                  </select>
                </div>
                <div class="c-block__body">
                  <div class="c-block__spine"></div>
                  <div class="c-block__dropzone" aria-label="Zona de encaixe de blocos"></div>
                </div>
                <div class="c-block__footer">fim</div>
              </div>
            </div>
          </section>
        </div>

        <div class="sidebar__footer">
          <button id="btn-reset-workspace" class="sidebar__reset-btn">
            <img src="src/assets/images/icons/snake-icons/icon-reset.svg" alt="" aria-hidden="true" class="btn-icon" width="24" height="24"> Resetar Área
          </button>
        </div>
      </aside>

      <section class="workspace" aria-label="Área de montagem de código">
        <div class="workspace__area">
          <div class="workspace__stack"></div>
        </div>
        <div class="controls-bar">
          <button id="btn-clear-workspace" class="controls-bar__btn controls-bar__btn--clear" title="Limpar" aria-label="Limpar área">
            <img src="src/assets/images/icons/snake-icons/icon-clear.svg" alt="Limpar área de trabalho" class="btn-icon" width="24" height="24">
          </button>
        </div>
      </section>

      <section class="stage" aria-label="Tabuleiro do jogo" aria-live="polite">
        <div class="stage__header">
          <h2 class="stage__title">Palco</h2>
          <div class="stage__stars" id="stage-stars" aria-label="Classificação por estrelas">
            <span class="star star--empty" data-star="3" aria-hidden="true">&#9733;</span>
            <span class="star star--empty" data-star="2" aria-hidden="true">&#9733;</span>
            <span class="star star--empty" data-star="1" aria-hidden="true">&#9733;</span>
          </div>
          <span class="stage__level" id="stage-level">Nível 1: Apple Hunt</span>
        </div>

        <div class="stage__body">
          <div class="grid" role="grid" aria-label="Tabuleiro 8 por 8">
            ${GRID_HTML}
          </div>
        </div>

        <div class="stage__footer">
          <span id="stage-position">Pos: (&mdash;, &mdash;) direção &mdash;</span>
          <span id="apple-counter" class="stage__apple-counter">&#127822; 0/0</span>
          <span id="stage-status" class="stage__status">Pronto</span>
        </div>
      </section>
    </div>

    <div id="modal-rules" class="modal-overlay" hidden>
      <div class="modal modal--rules" role="dialog" aria-modal="true" aria-labelledby="rules-title">
        <button id="btn-rules-close" class="modal__close-btn" aria-label="Fechar">&#10005;</button>
        <h3 id="rules-title" class="modal__title">📋 Regras do Jogo</h3>
        <div class="modal__body rules-content">
          <p><strong>🎯 Objetivo</strong><br>Programe a cobra usando blocos para coletar todas as maçãs no tabuleiro.</p>
          <p><strong>🧩 Blocos de Ação</strong><br><em>Mover Frente</em> — Move 1 casa na direção atual<br><em>Girar Esquerda</em> — Gira 90° para a esquerda<br><em>Girar Direita</em> — Gira 90° para a direita</p>
          <p><strong>🔄 Bloco de Controle</strong><br><em>Repetir N vezes</em> — Executa os blocos dentro dele N vezes</p>
          <p><strong>🔍 Bloco Se</strong><br>Executa os blocos dentro apenas se a condição for verdadeira:<br>• Maçã à frente<br>• Parede à frente (ou borda)<br>• Cobra à frente</p>
          <p><strong>⚠️ Fim de Jogo</strong><br>• Bater na parede<br>• Bater no próprio corpo<br>• Sair do tabuleiro</p>
          <p><strong>⭐ Estrelas</strong><br>⭐ Completou o nível<br>⭐⭐ Usou poucos blocos<br>⭐⭐⭐ Usou o mínimo de blocos<br>Menos blocos = mais estrelas!</p>
          <p><strong>💡 Dicas</strong><br>• Use <em>Repetir</em> para economizar blocos<br>• Use <em>Se</em> para desviar de obstáculos<br>• Clique <em>Executar</em> para ver a cobra se mover</p>
        </div>
      </div>
    </div>

    <div id="toast" class="toast" hidden></div>
  `;

  init(root, currentLevelIndex);
  return root;
}

/**
 * Bootstraps all interactive subsystems for the page.
 *
 * Creates the drag-drop component, stage renderer, snake actor, and execution
 * runner, then wires level loading, scoring, and UI event handlers. This is
 * called exactly once per page mount and holds all mutable state (level index,
 * execution flag, auto-advance timer) in closure scope to avoid polluting the
 * module or global namespace.
 *
 * @param {HTMLElement} root - The root page element returned by render().
 * @param {number} initialLevelIndex - The initial level index from route params.
 */
function init(root, initialLevelIndex) {
  const stackEl = root.querySelector('.workspace__stack');
  const appContainer = root.querySelector('.app-container');
  const gridEl = root.querySelector('.grid');
  const stageStarsEl = root.querySelector('#stage-stars');

  if (!appContainer || !gridEl || !stackEl) {
    throw new Error('Critical DOM elements missing');
  }

  let currentLevelIndex = initialLevelIndex || 0;

  const audio = new AudioFX();
  const snake = new Snake(8, 8, audio);
  const stage = new Stage(gridEl, snake);
  const runner = new Runner(snake, stage);

  /**
   * Checks whether another block can be added to the workspace.
   * Delegates to the current level's maxBlocks constraint.
   * @returns {boolean}
   */
  function canAddBlock() {
    return countAllBlocks(stackEl) < levels[currentLevelIndex].maxBlocks;
  }

  /**
   * Checks whether another loop (repeat) block can be added.
   * @returns {boolean}
   */
  function canAddLoop() {
    return countLoopBlocks(stackEl) < levels[currentLevelIndex].maxLoops;
  }

  /**
   * Checks whether another if (conditional) block can be added.
   * @returns {boolean}
   */
  function canAddIf() {
    return countIfBlocks(stackEl) < levels[currentLevelIndex].maxIfs;
  }

  /**
   * Checks whether another child block can be placed inside a given if block.
   * Hard-capped at 3 to keep the visual/logical nesting shallow.
   * @param {HTMLElement} ifBlock - The if container element.
   * @returns {boolean}
   */
  function canAddToIf(ifBlock) {
    return countIfChildren(ifBlock) < 3;
  }

  /**
   * Checks whether another child block can be placed inside a given loop block.
   * Hard-capped at 1 — only one action block per loop.
   * @param {HTMLElement} loopBlock - The loop container element.
   * @returns {boolean}
   */
  function canAddToLoop(loopBlock) {
    return countLoopChildren(loopBlock) < 3;
  }

  /**
   * Checks whether an if block can be placed inside a given loop block.
   * Hard-capped at 1 — only one if per loop.
   * @param {HTMLElement} loopBlock - The loop container element.
   * @returns {boolean}
   */
  function canAddIfToLoop(loopBlock) {
    return countIfsInLoop(loopBlock) < 1;
  }

  /**
   * Checks whether a loop block can be placed inside a given if block.
   * Hard-capped at 1 — only one loop per if.
   * @param {HTMLElement} ifBlock - The if container element.
   * @returns {boolean}
   */
  function canAddLoopToIf(ifBlock) {
    return countLoopsInIf(ifBlock) < 1;
  }

  /**
   * Refreshes block counters and star display after any workspace mutation.
   * Called as a callback by DragDrop on every block add/remove.
   */
  function updateBlockCounterLive() {
    const blockCounterEl = root.querySelector('#block-counter');
    const loopCounterEl = root.querySelector('#loop-counter');
    const ifCounterEl = root.querySelector('#if-counter');
    const allCount = countAllBlocks(stackEl);
    const max = levels[currentLevelIndex].maxBlocks;
    const loopCount = countLoopBlocks(stackEl);
    const maxLoops = levels[currentLevelIndex].maxLoops;
    const ifCount = countIfBlocks(stackEl);
    const maxIfs = levels[currentLevelIndex].maxIfs;
    if (blockCounterEl) {
      blockCounterEl.textContent = `Blocos: ${allCount} / ${max}`;
      // Highlight counters red when the limit is reached so the player gets
      // immediate visual feedback that no more blocks can be added.
      blockCounterEl.classList.toggle('block-counter--limit', allCount >= max);
    }
    if (loopCounterEl) {
      loopCounterEl.textContent = `Loops: ${loopCount} / ${maxLoops}`;
      loopCounterEl.classList.toggle('block-counter--limit', loopCount >= maxLoops);
    }
    if (ifCounterEl) {
      ifCounterEl.textContent = `Se: ${ifCount} / ${maxIfs}`;
      ifCounterEl.classList.toggle('block-counter--limit', ifCount >= maxIfs);
    }
    updateStageStars();

    // Persist workspace so the user's blocks survive page reloads
    saveWorkspace(currentLevelIndex);
  }

  /**
   * Updates the star rating display based on the current block count relative
   * to the level's thresholds. Stars are purely informational during editing;
   * the actual score is only persisted when the level is completed.
   */
  function updateStageStars() {
    if (!stageStarsEl) return;
    const level = levels[currentLevelIndex];
    if (!level) return;
    const count = countAllBlocks(stackEl);
    const stars = stageStarsEl.querySelectorAll('.star');

    stars.forEach((star) => {
      const threshold = parseInt(star.dataset.star, 10);
      let limit;
      switch (threshold) {
        // Fallback percentages ensure star tiers always exist even if a level
        // author forgets to define explicit starThree/starTwo values.
        case 3: limit = level.starThree ?? Math.ceil(level.maxBlocks * 0.5); break;
        case 2: limit = level.starTwo ?? Math.ceil(level.maxBlocks * 0.7); break;
        case 1: limit = level.maxBlocks; break;
        default: limit = level.maxBlocks;
      }
      if (count <= limit) {
        star.classList.remove('star--empty');
        star.classList.add('star--lit');
      } else {
        star.classList.remove('star--lit');
        star.classList.add('star--empty');
      }
    });
  }

  new DragDrop(appContainer, {
    canAddBlock,
    canAddLoop,
    canAddIf,
    canAddToIf,
    canAddToLoop,
    canAddLoopToIf,
    canAddIfToLoop,
    onBlockChanged: updateBlockCounterLive,
    audio,
  });

  const btnRun = root.querySelector('#btn-run');
  const btnPause = root.querySelector('#btn-pause');
  const btnClear = root.querySelector('#btn-clear');
  const btnClearWs = root.querySelector('#btn-clear-workspace');
  const btnResetWs = root.querySelector('#btn-reset-workspace');
  const btnRules = root.querySelector('#btn-rules');
  const modalRules = root.querySelector('#modal-rules');
  const btnRulesClose = root.querySelector('#btn-rules-close');
  const levelSelect = root.querySelector('#level-select');
  const levelNameEl = root.querySelector('#level-name');
  const stageLevelEl = root.querySelector('#stage-level');
  const statusEl = root.querySelector('#stage-status');

  let isExecuting = false;
  let highestCompletedLevel = -1;
  // Auto-advance timer: after a win, the next level loads automatically after
  // 1.5s so the player can see the success animation before transitioning.
  let autoAdvanceTimer = null;

  /**
   * Displays a temporary toast message. Uses a timer stored on the element
   * itself to cancel any previous toast before showing the new one — this
   * prevents overlapping toasts from stacking visually.
   *
   * @param {string} msg - The message to display.
   * @param {number} [duration=2000] - How long to show the toast in ms.
   */
  function showToast(msg, duration = 2000) {
    const el = root.querySelector('#toast');
    if (!el) return;
    el.textContent = msg;
    el.hidden = false;
    clearTimeout(el._timeout);
    el._timeout = setTimeout(() => { el.hidden = true; }, duration);
  }

  /**
   * Reads the persisted scores object from localStorage.
   * @returns {Object} Scores keyed by level index.
   */
  function getScores() {
    return getJSON('snake-scores') || {};
  }

  /**
   * Persists the star rating for a completed level. Only saves if the new
   * score is strictly better (more stars, or same stars with fewer blocks) to
   * prevent regressions from overwriting a player's best result.
   *
   * @param {number} levelIndex - The completed level index.
   * @param {number} usedBlocks - How many blocks were used.
   * @returns {number} The number of stars awarded (1-3).
   */
  function saveScore(levelIndex, usedBlocks) {
    const level = levels[levelIndex];
    if (!level) return 1;
    let stars = 1;
    const three = level.starThree ?? Math.ceil(level.maxBlocks * 0.5);
    const two = level.starTwo ?? Math.ceil(level.maxBlocks * 0.7);
    if (usedBlocks <= three) stars = 3;
    else if (usedBlocks <= two) stars = 2;
    const scores = getScores();
    const prev = scores[levelIndex];
    if (!prev || stars > prev.stars || (stars === prev.stars && usedBlocks < prev.blocks)) {
      scores[levelIndex] = { stars, blocks: usedBlocks };
      setJSON('snake-scores', scores);
    }
    return stars;
  }

  /**
   * Builds a visual star string (filled/empty) for a given level's saved score.
   * @param {number} levelIndex
   * @returns {string} Star symbols representing the saved rating.
   */
  function starString(levelIndex) {
    const scores = getScores();
    const entry = scores[levelIndex];
    if (!entry) return '';
    let s = '';
    for (let i = 0; i < 3; i++) {
      s += i < entry.stars ? '\u2B50' : '\u2606';
    }
    return ' ' + s;
  }

  /**
   * Refreshes the level selector dropdown: enables levels up to the next
   * unlockable one and appends saved star ratings so the player can see their
   * progress at a glance.
   */
  function updateLevelSelect() {
    if (!levelSelect) return;
    const options = levelSelect.options;
    for (let i = 0; i < options.length; i++) {
      // Levels beyond the next unlockable index remain disabled — this enforces
      // the linear progression requirement.
      options[i].disabled = i > highestCompletedLevel + 1;
      const level = levels[i];
      if (level) {
        options[i].textContent = `Nível ${i + 1} \u2014 ${level.name}${starString(i)}`;
      }
    }
  }

  /**
   * Saves the current workspace blocks to localStorage for the given level.
   * @param {number} levelIndex
   */
  function saveWorkspace(levelIndex) {
    setItem(`snake-workspace-${levelIndex}`, stackEl.innerHTML);
  }

  /**
   * Removes the saved workspace from localStorage for the given level.
   * @param {number} levelIndex
   */
  function clearWorkspace(levelIndex) {
    removeItem(`snake-workspace-${levelIndex}`);
  }

  /**
   * Loads a level into the snake actor, resets the workspace, and updates all
   * UI elements to reflect the new level's constraints.
   *
   * @param {number} index - The level index to load (0-based).
   */
  function loadLevel(index) {
    // Guard against skipping locked levels.
    if (index > highestCompletedLevel + 1) return;

    // Cancel any pending auto-advance so manual level switches don't conflict
    // with the timed transition.
    if (autoAdvanceTimer) {
      clearTimeout(autoAdvanceTimer);
      autoAdvanceTimer = null;
    }

    // Abort any running execution so the snake state resets cleanly.
    runner.abort();
    index = Math.max(0, Math.min(index, levels.length - 1));

    // Only save the current workspace when switching to a different level
    if (index !== currentLevelIndex) {
      saveWorkspace(currentLevelIndex);
    }

    currentLevelIndex = index;

    // Persist so the user returns to this level after page reload
    setItem('snake-current-level', String(index));

    // Keep URL in sync so F5 restores the correct level
    history.replaceState(null, '', `#/levels/snake/${index + 1}`);

    const level = levels[index];
    snake.loadLevel(level);
    stage.render();

    // Restore saved workspace for this level, or start empty
    const saved = getItem(`snake-workspace-${index}`);
    stackEl.innerHTML = saved !== null ? saved : '';

    if (levelSelect) levelSelect.value = String(index);
    if (levelNameEl) levelNameEl.textContent = level.name;
    if (stageLevelEl) stageLevelEl.textContent = `Nível ${level.id}: ${level.name}`;
    updateBlockCounterLive();
    if (statusEl) statusEl.textContent = 'Pronto';

    if (btnRun) btnRun.disabled = false;
    if (btnPause) {
      btnPause.disabled = true;
      btnPause.textContent = '\u23F8 Pausar';
    }
    isExecuting = false;
  }

  // --- Run button ---
  if (btnRun) {
    btnRun.addEventListener('click', async () => {
      // If paused, resume instead of restarting — this avoids resetting the
      // snake mid-execution.
      if (runner.paused && isExecuting) {
        runner.resume();
        if (btnPause) btnPause.textContent = '\u23F8 Pausar';
        if (statusEl) statusEl.textContent = 'Executando...';
        return;
      }

      // Prevent double-execution while the runner is active.
      if (isExecuting) return;

      const level = levels[currentLevelIndex];
      snake.loadLevel(level);
      stage.render();

      const ast = parseWorkspace(stackEl);

      // Bail early if the workspace is empty — no need to invoke the runner.
      if (ast.length === 0) {
        if (statusEl) statusEl.textContent = 'Nenhum bloco na área';
        return;
      }

      isExecuting = true;
      if (btnRun) btnRun.disabled = true;
      if (btnPause) btnPause.disabled = false;
      if (statusEl) statusEl.textContent = 'Executando...';

      const result = await runner.execute(ast);

      // The execution may have been aborted (e.g., level switch). If the
      // executing flag was cleared externally, stop processing the result.
      if (!isExecuting) return;

      isExecuting = false;
      if (btnRun) btnRun.disabled = false;
      if (btnPause) {
        btnPause.disabled = true;
        btnPause.textContent = '\u23F8 Pausar';
      }

      const blockCounterEl = root.querySelector('#block-counter');
      if (blockCounterEl) {
        blockCounterEl.textContent = `Blocos: ${countAllBlocks(stackEl)} / ${levels[currentLevelIndex].maxBlocks}`;
      }

      switch (result.status) {
        case 'win':
          if (statusEl) statusEl.textContent = 'Vitória!';
          // Track the highest level the player has *ever* reached so the level
          // selector unlocks remain persistent across page visits.
          highestCompletedLevel = Math.max(highestCompletedLevel, currentLevelIndex);
          setItem('snake-progress', String(highestCompletedLevel + 1));
          const stars = saveScore(currentLevelIndex, countAllBlocks(stackEl));
          updateLevelSelect();
          audio.play('win');
          showToast(`\u2B50`.repeat(stars) + ` Nível ${currentLevelIndex + 1} completo!`);
          // Auto-advance only if there is a next level to play.
          if (currentLevelIndex + 1 < levels.length) {
            autoAdvanceTimer = setTimeout(() => {
              autoAdvanceTimer = null;
              loadLevel(currentLevelIndex + 1);
            }, 1500);
          }
          break;
        case 'gameover':
          if (statusEl) statusEl.textContent = 'Fim de Jogo';
          audio.play('hit');
          break;
        default:
          if (statusEl) statusEl.textContent = 'Execução interrompida';
      }
    });
  }

  // --- Pause button ---
  if (btnPause) {
    btnPause.addEventListener('click', () => {
      // Pause has no effect outside of execution.
      if (!isExecuting) return;

      if (runner.paused) {
        runner.resume();
        btnPause.textContent = '\u23F8 Pausar';
        if (statusEl) statusEl.textContent = 'Executando...';
      } else {
        runner.pause();
        btnPause.textContent = '\u25B6 Continuar';
        if (statusEl) statusEl.textContent = 'Pausado';
      }
    });
  }

  // --- Clear button (reloads current level from scratch) ---
  if (btnClear) {
    btnClear.addEventListener('click', () => {
      clearWorkspace(currentLevelIndex);
      loadLevel(currentLevelIndex);
    });
  }

  // --- Workspace clear button (same behavior: reload level) ---
  if (btnClearWs) {
    btnClearWs.addEventListener('click', () => {
      clearWorkspace(currentLevelIndex);
      loadLevel(currentLevelIndex);
    });
  }

  // --- Reset workspace button (same behavior: reload level) ---
  if (btnResetWs) {
    btnResetWs.addEventListener('click', () => {
      clearWorkspace(currentLevelIndex);
      loadLevel(currentLevelIndex);
    });
  }

  // --- Level selector ---
  if (levelSelect) {
    levelSelect.addEventListener('change', () => {
      const index = parseInt(levelSelect.value, 10);
      // Reject selection of locked levels (the guard is also in loadLevel, but
      // this prevents the dropdown from visually changing briefly).
      if (index > highestCompletedLevel + 1) {
        levelSelect.value = String(currentLevelIndex);
        return;
      }
      loadLevel(index);
    });
  }

  // --- Rules modal ---
  if (btnRules && modalRules) {
    btnRules.addEventListener('click', () => {
      modalRules.hidden = false;
    });
  }

  if (btnRulesClose && modalRules) {
    btnRulesClose.addEventListener('click', () => {
      modalRules.hidden = true;
    });
  }

  // Close modal on backdrop click — only the overlay itself, not its children,
  // so clicks inside the dialog don't propagate and close it accidentally.
  if (modalRules) {
    modalRules.addEventListener('click', (e) => {
      if (e.target === modalRules) modalRules.hidden = true;
    });
  }

  // Show a toast when the snake tries to turn 180° into its own neck
  window.addEventListener('snake-neck-turn-blocked', () => {
    showToast('Não gire o pescoço da cobrinha em 180°, ela pode se machucar');
  });

  // Restore progress from localStorage so the player can continue where they
  // left off across sessions.
  const saved = getItem('snake-progress');
  if (saved !== null) {
    highestCompletedLevel = parseInt(saved, 10) - 1;  // storage stores COUNT, convert to INDEX
  }

  updateLevelSelect();
  // Load the level from URL params if provided, otherwise restore the last
  // visited level from localStorage, falling back to the next uncompleted level.
  if (initialLevelIndex !== undefined && initialLevelIndex >= 0) {
    loadLevel(initialLevelIndex);
  } else {
    const savedLevel = getItem('snake-current-level');
    const restoredIndex = savedLevel !== null ? parseInt(savedLevel, 10) : highestCompleted + 1;
    loadLevel(restoredIndex);
  }
}

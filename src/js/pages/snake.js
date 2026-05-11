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
import { countAllBlocks, countLoopBlocks, countIfBlocks } from '../utils/dom.js';
import { AudioFX } from '../core/audio.js';
import { saveLevelScore, getProfileLevelScore } from '../core/level-score-storage.js';
import { calculateStars } from '../utils/stars.js';
import { ensureGeneratedLevelsForProgress, getGameLevels } from '../engine/level-registry.js';
import { TopAppBar } from '../components/top-app-bar.js';
import { hasAnyProfile, getActiveProfile } from '../core/profile.js';
import { navigateTo, replaceRoute } from '../core/router-state.js';
import {
  setGameProgress, getGameProgress,
  setGameCurrentLevel, getGameCurrentLevel,
  setGameWorkspace, getGameWorkspace, clearGameWorkspace,
  setLastGameType
} from '../core/profile-data.js';
import { getJSON } from '../core/storage.js';
import { saveCustomLevelScore, setCustomLevelCurrent, getCustomLevelData } from '../core/custom-level-storage.js';

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
  const isCustom = params.custom === 'true';

  // Redirect to home if no profile is set (first-time access guard)
  if (!hasAnyProfile()) {
    navigateTo('/');
    return document.createElement('div');
  }

  // Extract level ID from URL to load correct level on direct navigation
  let currentLevelIndex;
  if (isCustom) {
    const allCustomLevels = getJSON('lv_custom_levels') || [];
    if (allCustomLevels.length === 0) {
      navigateTo('/levels/snake');
      return document.createElement('div');
    }
    if (params.levelId) {
      currentLevelIndex = allCustomLevels.findIndex((l) => l.id === parseInt(params.levelId, 10));
      if (currentLevelIndex === -1) currentLevelIndex = 0;
    } else {
      currentLevelIndex = 0;
    }
  } else if (params.levelId) {
    currentLevelIndex = parseInt(params.levelId, 10) - 1;
  } else {
    currentLevelIndex = 0;
  }

  // Guard: if the URL specifies a level beyond the current profile's progress,
  // show the access denied page instead of the game.
  if (params.levelId && !isCustom) {
    const profile = getActiveProfile();
    const progress = getGameProgress(profile, 'snake');
    const levelIndex = parseInt(params.levelId, 10) - 1;

    if (levelIndex > progress) {
      return renderAccessDenied();
    }
  }

  const wrapper = document.createElement('div');
  wrapper.className = 'page--snake';
  wrapper.setAttribute('data-theme', 'dark');

  const topAppBar = new TopAppBar();

  wrapper.appendChild(topAppBar.render());

  const backRoute = `#/levels/snake`;

  const root = document.createElement('div');
  root.className = 'page--snake__content';
  root.innerHTML = `
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
                  title="Move a cobra 1 casa na direcao atual">
                  <img src="src/assets/images/icons/visual-programming-icons/Move-Forward-Icon.svg" class="block__icon" width="16" height="16" alt="" aria-hidden="true"> Mover Frente
                </div>
              <div class="block block--action"
                  draggable="true"
                  data-block-type="turn-left"
                  tabindex="0"
                  role="listitem"
                  title="Gira a cobra 90 para a esquerda">
                  <img src="src/assets/images/icons/visual-programming-icons/Rotate-Left-Icon.svg" class="block__icon" width="16" height="16" alt="" aria-hidden="true"> Girar Esquerda
                </div>
              <div class="block block--action"
                  draggable="true"
                  data-block-type="turn-right"
                  tabindex="0"
                  role="listitem"
                  title="Gira a cobra 90 para a direita">
                  <img src="src/assets/images/icons/visual-programming-icons/Rotate-Right-Icon.svg" class="block__icon" width="16" height="16" alt="" aria-hidden="true"> Girar Direita
                </div>
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
                  title="Repete os blocos dentro dele N vezes">
                <div class="c-block__header">
                  <img src="src/assets/images/icons/visual-programming-icons/Loop-Icon.svg" class="block__icon" width="16" height="16" alt="" aria-hidden="true">
                  <span class="c-block__label">Repetir</span>
                  <input class="c-block__input" type="number" value="3" min="1" max="99" aria-label="Número de repetições">
                  <span class="c-block__label">vezes</span>
                </div>
                <div class="c-block__body">
                  <div class="c-block__spine"></div>
                  <div class="c-block__dropzone" aria-label="Zona de encaixe de blocos"></div>
                </div>
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
                  title="Executa os blocos dentro apenas se a condicao for verdadeira">
                <div class="c-block__header">
                  <img src="src/assets/images/icons/visual-programming-icons/IF-ELSE-Icon.svg" class="block__icon" width="16" height="16" alt="" aria-hidden="true">
                  <span class="c-block__label">Se</span>
                  <select class="c-block__select" aria-label="Condição">
                    <option>Comeu maçã</option>
                    <option>Parede à frente</option>
                  </select>
                </div>
                <div class="c-block__body">
                  <div class="c-block__spine"></div>
                  <div class="c-block__dropzone" aria-label="Zona de encaixe de blocos"></div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </aside>

      <section class="workspace" aria-label="Área de montagem de código">
        <div class="workspace__header">
          <span class="workspace__title">Área de trabalho</span>
          <div class="workspace__counters">
            <span class="block-counter" id="block-counter">Blocos: 0 / 10</span>
            <span class="block-counter loop-counter" id="loop-counter">Loops: 0 / 1</span>
            <span class="block-counter loop-counter" id="if-counter">Se: 0 / 1</span>
          </div>
          <div class="workspace__actions">
            <button id="btn-rules" class="workspace__rules-btn" aria-label="Ver regras">
              <img src="src/assets/images/icons/snake-icons/Rule-Icon.svg" alt="" width="16" height="16">
              Regras
            </button>
            <button id="btn-clear-workspace" class="header-btn header-btn--clear" title="Limpar" aria-label="Limpar área">
              <img src="src/assets/images/icons/snake-icons/icon-clear.svg" alt="" aria-hidden="true" class="btn-icon" width="16" height="16">
              Limpar
            </button>
          </div>
        </div>
        <div class="workspace__area">
          <div class="workspace__stack"></div>
        </div>
        <div class="level-objective-card" role="region" aria-label="Objetivo do nível">
          <div class="level-objective-card__header">
            <span class="level-objective-card__title">DESCRIÇÃO DO NÍVEL</span>
            <img src="src/assets/images/icons/visual-programming-icons/Trophy-Icon.svg" alt="" class="level-objective-card__icon" width="24" height="24">
          </div>
          <p class="level-objective-card__description">
            Navegue com a Snake pela grade e colete exatamente 5 maçãs sem atingir o perímetro do firewall.
          </p>
        </div>
        <div class="stage-controls">
          <button id="btn-run" class="header-btn header-btn--run" aria-label="Executar código">
            <img src="src/assets/images/icons/visual-programming-icons/Play-Icon.svg" alt="" aria-hidden="true" class="btn-icon" width="24" height="24">
          </button>
          <button id="btn-pause" class="header-btn header-btn--pause" aria-label="Pausar execução" disabled>
            <img src="src/assets/images/icons/visual-programming-icons/Pause-Icon.svg" alt="" aria-hidden="true" class="btn-icon" width="24" height="24">
          </button>
          <!--
          <button id="btn-stop" class="header-btn header-btn--stop" aria-label="Parar execução" disabled>
            <img src="src/assets/images/icons/visual-programming-icons/Stop-Icon.svg" alt="" aria-hidden="true" class="btn-icon" width="24" height="24">
          </button>
          -->
        </div>
      </section>

      <div class="stage-column">
        <section class="stage-wrapper">
          <section class="stage" aria-label="Tabuleiro do jogo" aria-live="polite">
            <div class="stage__header">
              <h2 class="stage__title">PALCO DE EXIBIÇÃO</h2>
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
              <span id="stage-position">Pos: (&mdash;, &mdash;)</span>
              <span id="apple-counter" class="stage__apple-counter">&#127822; 0/0</span>
              <span id="stage-status" class="stage__status">Pronto</span>
            </div>
          </section>
        </section>
      </div>
    </div>

    <div id="modal-rules" class="modal-overlay" hidden>
      <div class="modal modal--rules" role="dialog" aria-modal="true" aria-labelledby="rules-title">
        <button id="btn-rules-close" class="modal__close-btn" aria-label="Fechar">&#10005;</button>
        <h3 id="rules-title" class="modal__title">📋 Regras do Jogo</h3>
        <div class="modal__body rules-content">
          <div class="rules-grid">
            <div class="rules-card">
              <h4>🎯 Objetivo</h4>
              <p>Programe a cobra usando blocos para coletar todas as maçãs no tabuleiro.</p>
            </div>
            <div class="rules-card">
              <h4>🧩 Blocos de Ação</h4>
              <p><em>Mover Frente</em> — Move 1 casa na direção atual<br><em>Girar Esquerda</em> — Gira 90° para a esquerda<br><em>Girar Direita</em> — Gira 90° para a direita</p>
            </div>
            <div class="rules-card">
              <h4>🔄 Bloco de Controle</h4>
              <p><em>Repetir N vezes</em> — Executa os blocos dentro dele N vezes</p>
            </div>
            <div class="rules-card">
              <h4>🔍 Bloco Se</h4>
              <p>Executa os blocos dentro apenas se a condição for verdadeira:<br>• Comeu maçã<br>• Parede à frente (ou borda)<br>• Cobra à frente</p>
            </div>
            <div class="rules-card">
              <h4>🧮 Contagem</h4>
              <p>Todos os blocos contam para o limite, inclusive os que estiverem dentro de Repetir e Se.</p>
            </div>
            <div class="rules-card">
              <h4>⛔ Aninhamento</h4>
              <p>Não é permitido colocar <em>Se</em> dentro de <em>Se</em> nem <em>Repetir</em> dentro de <em>Repetir</em>.</p>
            </div>
            <div class="rules-card">
              <h4>⚠️ Fim de Jogo</h4>
              <p>• Bater na parede<br>• Bater no próprio corpo<br>• Sair do tabuleiro</p>
            </div>
            <div class="rules-card">
              <h4>⭐ Estrelas</h4>
              <p>⭐ Completou o nível<br>⭐⭐ Usou poucos blocos<br>⭐⭐⭐ Usou o mínimo de blocos<br>Menos blocos = mais estrelas!</p>
            </div>
            <div class="rules-card rules-card--full">
              <h4>💡 Dicas</h4>
              <p>• Use <em>Repetir</em> para economizar blocos<br>• Use <em>Se</em> para desviar de obstáculos<br>• Clique <em>Executar</em> para ver a cobra se mover</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div id="toast" class="toast" hidden></div>
  `;

  wrapper.appendChild(root);

  init(root, params.levelId ? currentLevelIndex : undefined, isCustom);
  return wrapper;
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
function init(root, initialLevelIndex, isCustom) {
  const stackEl = root.querySelector('.workspace__stack');
  const appContainer = root.querySelector('.app-container');
  const gridEl = root.querySelector('.grid');
  const stageStarsEl = root.querySelector('#stage-stars');

  if (!appContainer || !gridEl || !stackEl) {
    throw new Error('Critical DOM elements missing');
  }

  // Detects changes in inputs and selects inside workspace blocks to auto-save.
  // Without this, the workspace is only saved when blocks are added/removed,
  // not when the user edits values inside existing blocks.
  stackEl.addEventListener('input', (e) => {
    const target = e.target;
    if (target.matches('.c-block__input, .c-block__select') && target.closest('.workspace__stack')) {
      saveWorkspace(currentLevelIndex);
    }
  });

  stackEl.addEventListener('change', (e) => {
    const target = e.target;
    if (target.matches('.c-block__input, .c-block__select') && target.closest('.workspace__stack')) {
      saveWorkspace(currentLevelIndex);
    }
  });

  let currentLevelIndex = initialLevelIndex ?? 0;

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
    onBlockChanged: updateBlockCounterLive,
    audio,
  });

  const btnRun = root.querySelector('#btn-run');
  const btnPause = root.querySelector('#btn-pause');
  const btnClearWs = root.querySelector('#btn-clear-workspace');
  const btnRules = root.querySelector('#btn-rules');
  const modalRules = root.querySelector('#modal-rules');
  const btnRulesClose = root.querySelector('#btn-rules-close');
  const stageLevelEl = root.querySelector('#stage-level');
  const statusEl = root.querySelector('#stage-status');
  const descriptionEl = root.querySelector('.level-objective-card__description');

  let isExecuting = false;
  let highestCompletedLevel = -1;
  let levels;
  if (isCustom) {
    levels = getJSON('lv_custom_levels') || [];
  } else {
    levels = getGameLevels('snake');
  }
  // Auto-advance timer: after a win, the next level loads automatically after
  // 1.5s so the player can see the success animation before transitioning.
  let autoAdvanceTimer = null;

  function completeCurrentLevel({ autoAdvance = true } = {}) {
    const profile = getActiveProfile();
    const level = levels[currentLevelIndex];
    if (!profile || !level) return false;

    if (autoAdvanceTimer) {
      clearTimeout(autoAdvanceTimer);
      autoAdvanceTimer = null;
    }

    runner.abort();
    isExecuting = false;

    if (btnRun) btnRun.disabled = false;
    if (btnPause) {
      btnPause.disabled = true;
    }

    if (statusEl) statusEl.textContent = 'Vitória!';

    const usedBlocks = countAllBlocks(stackEl);
    const starThree = level.starThree ?? Math.ceil(level.maxBlocks * 0.5);
    const starTwo = level.starTwo ?? Math.ceil(level.maxBlocks * 0.7);
    const stars = calculateStars(usedBlocks, starThree, starTwo);

    if (isCustom) {
      saveCustomLevelScore(profile, level.id, stars);
      setCustomLevelCurrent(profile, currentLevelIndex + 2 > levels.length ? null : levels[currentLevelIndex + 1]?.id || null);
    } else {
      highestCompletedLevel = Math.max(highestCompletedLevel, currentLevelIndex);
      setGameProgress(profile, 'snake', highestCompletedLevel + 1);
      syncLevels(highestCompletedLevel);
      saveLevelScore('snake', profile, currentLevelIndex + 1, stars);
    }
    audio.play('win');
    showToast(`\u2B50`.repeat(stars) + ` Nível ${currentLevelIndex + 1} completo!`);

    // Auto-advance only if there is a next level to play.
    if (autoAdvance && currentLevelIndex + 1 < levels.length) {
      autoAdvanceTimer = setTimeout(() => {
        autoAdvanceTimer = null;
        loadLevel(currentLevelIndex + 1);
      }, 1500);
    }

    return true;
  }

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
   * Builds a visual star string (filled/empty) for a given level's saved score.
   * Reads from the ranking storage scoped to the active profile.
   * @param {number} levelIndex - 0-based level index
   * @returns {string} Star symbols representing the saved rating.
   */
  function starString(levelIndex) {
    const score = getProfileLevelScore('snake', getActiveProfile(), levelIndex + 1);
    if (!score) return '';
    let s = '';
    for (let i = 0; i < 3; i++) {
      s += i < score.stars ? '\u2B50' : '\u2606';
    }
    return ' ' + s;
  }

  /**
   * Synchronizes the dynamic level list with the globally generated registry.
   * @param {number} progress
   */
  function syncLevels(progress = highestCompletedLevel) {
    if (isCustom) return;
    ensureGeneratedLevelsForProgress('snake', progress);
    levels = getGameLevels('snake');
  }

  /**
   * Saves the current workspace blocks to localStorage for the given level.
   * @param {number} levelIndex
   */
  function saveWorkspace(levelIndex) {
    if (isCustom) return;

    // Sync live input values to value attributes so innerHTML captures them.
    // Browsers don't serialize the .value property to HTML attributes automatically.
    const inputs = stackEl.querySelectorAll('input');
    inputs.forEach((input) => {
      input.setAttribute('value', input.value);
    });

    // Sync select selected index to selected attributes on options.
    // The .selected property on options is not reflected in innerHTML.
    const selects = stackEl.querySelectorAll('select');
    selects.forEach((select) => {
      const options = select.options;
      for (let i = 0; i < options.length; i++) {
        if (i === select.selectedIndex) {
          options[i].setAttribute('selected', 'selected');
        } else {
          options[i].removeAttribute('selected');
        }
      }
    });

    setGameWorkspace(getActiveProfile(), 'snake', levelIndex, stackEl.innerHTML);
  }

  /**
   * Removes the saved workspace from localStorage for the given level.
   * @param {number} levelIndex
   */
  function clearWorkspace(levelIndex) {
    clearGameWorkspace(getActiveProfile(), 'snake', levelIndex);
  }

  /**
   * Loads a level into the snake actor, resets the workspace, and updates all
   * UI elements to reflect the new level's constraints.
   *
   * @param {number} index - The level index to load (0-based).
   */
  function loadLevel(index) {
    syncLevels();

    // Guard against skipping locked levels (custom levels have no lock).
    if (!isCustom && index > highestCompletedLevel + 1) return;

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
    if (!isCustom) {
      setGameCurrentLevel(getActiveProfile(), 'snake', index);
    } else {
      setCustomLevelCurrent(getActiveProfile(), levels[index]?.id || null);
    }

    // Keep URL in sync so F5 restores the correct level
    replaceRoute(isCustom ? `/levels/snake/custom/${levels[index]?.id || index + 1}` : `/levels/snake/${index + 1}`);
    setLastGameType(getActiveProfile(), 'snake', isCustom ? 'custom' : 'normal');

    const level = levels[index];
    snake.loadLevel(level);
    stage.render();

    // Restore saved workspace for this level, or start empty
    if (!isCustom) {
      const saved = getGameWorkspace(getActiveProfile(), 'snake', index);
      stackEl.innerHTML = saved !== null ? saved : '';
    } else {
      stackEl.innerHTML = '';
    }

    if (stageLevelEl) stageLevelEl.textContent = `Nível ${level.id}: ${level.name}`;
    if (descriptionEl) descriptionEl.textContent = level.description || '';
    updateBlockCounterLive();
    if (statusEl) statusEl.textContent = 'Pronto';

    if (btnRun) btnRun.disabled = false;
    if (btnPause) {
      btnPause.disabled = true;
    }
    isExecuting = false;
  }

  // --- Run button ---
  if (btnRun) {
    btnRun.addEventListener('click', async () => {
      syncLevels();

      // If paused, resume instead of restarting — this avoids resetting the
      // snake mid-execution.
      if (runner.paused && isExecuting) {
        runner.resume();
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
      }

      const blockCounterEl = root.querySelector('#block-counter');
      if (blockCounterEl) {
        blockCounterEl.textContent = `Blocos: ${countAllBlocks(stackEl)} / ${levels[currentLevelIndex].maxBlocks}`;
      }

      switch (result.status) {
        case 'win':
          completeCurrentLevel();
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
        if (statusEl) statusEl.textContent = 'Executando...';
      } else {
        runner.pause();
        if (statusEl) statusEl.textContent = 'Pausado';
      }
    });
  }

  // --- Workspace clear button (same behavior: reload level) ---
  if (btnClearWs) {
    btnClearWs.addEventListener('click', () => {
      clearWorkspace(currentLevelIndex);
      loadLevel(currentLevelIndex);
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
  if (isCustom) {
    highestCompletedLevel = -1;
  } else {
    const saved = getGameProgress(getActiveProfile(), 'snake');
    if (saved > 0) {
      highestCompletedLevel = saved - 1;  // storage stores COUNT, convert to INDEX
    }
  }

  syncLevels(highestCompletedLevel);

  // Load the level from URL params if provided, otherwise restore the last
  // visited level from localStorage, falling back to the next uncompleted level.
  if (initialLevelIndex !== undefined && initialLevelIndex >= 0) {
    loadLevel(initialLevelIndex);
  } else if (isCustom) {
    const customData = getCustomLevelData(getActiveProfile());
    if (customData.currentLevel) {
      const idx = levels.findIndex((l) => l.id === customData.currentLevel);
      loadLevel(idx >= 0 ? idx : 0);
    } else {
      loadLevel(0);
    }
  } else {
    const savedLevel = getGameCurrentLevel(getActiveProfile(), 'snake');
    const restoredIndex = savedLevel !== null ? savedLevel : highestCompletedLevel + 1;
    loadLevel(restoredIndex);
  }
}

/**
 * Renders a full-page access denied view when the current profile hasn't
 * unlocked the level requested in the URL. Provides navigation back to the
 * home page or level selector so the user is never stuck.
 *
 * @returns {HTMLElement} The assembled page element with TopAppBar and denied
 *   card.
 */
function renderAccessDenied() {
  const wrapper = document.createElement('div');
  wrapper.className = 'page--snake';
  wrapper.setAttribute('data-theme', 'dark');

  const topAppBar = new TopAppBar();
  wrapper.appendChild(topAppBar.render());

  const content = document.createElement('div');
  content.className = 'access-denied';
  content.innerHTML = `
    <div class="access-denied__card">
      <div class="access-denied__icon" aria-hidden="true">
        <span class="material-symbols-outlined access-denied__icon-symbol">block</span>
      </div>
      <h2 class="access-denied__title">Epa, voc\u00ea ainda n\u00e3o<br>deveria estar aqui</h2>
      <p class="access-denied__subtitle">Complete as fases anteriores para desbloquear este n\u00edvel.</p>
      <div class="access-denied__actions">
        <a href="#/" class="access-denied__btn access-denied__btn--primary">Home</a>
        <a href="#/levels/snake" class="access-denied__btn access-denied__btn--secondary">Fases</a>
      </div>
    </div>
  `;

  wrapper.appendChild(content);

  return wrapper;
}

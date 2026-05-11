import { Snake } from '../actors/snake.js';
import { Stage } from '../components/stage.js';
import { Runner } from '../engine/runner.js';
import { DragDrop } from '../components/drag-drop.js';
import { parseWorkspace } from '../engine/parser.js';
import { AudioFX } from '../core/audio.js';
import { countAllBlocks, countLoopBlocks, countIfBlocks } from '../utils/dom.js';
import { calculateStars } from '../utils/stars.js';
import { setJSON, getJSON } from '../core/storage.js';
import { navigateTo } from '../core/router-state.js';
import { TopAppBar } from '../components/top-app-bar.js';
import { escapeHtml } from '../utils/sanitize.js';
import { consumeTempCreatorData, peekTempCreatorData } from '../core/creator-temp.js';
import { clearDraft } from '../core/creator-draft.js';

const GRID_HTML = [0, 1, 2, 3, 4, 5, 6, 7].map((r) => {
  const cells = [0, 1, 2, 3, 4, 5, 6, 7].map((c) => {
    const shade = (r + c) % 2 === 0 ? 'grid__cell--light' : 'grid__cell--dark';
    return `<div class="grid__cell ${shade}" data-row="${r}" data-col="${c}"></div>`;
  }).join('');
  return `<div class="grid__row">${cells}</div>`;
}).join('');

export function render() {
  const data = peekTempCreatorData();
  if (!data) {
    navigateTo('/creator');
    return document.createElement('div');
  }

  const { levelData, name, description } = data;

  const wrapper = document.createElement('div');
  wrapper.className = 'page--snake page--creator-test';
  wrapper.dataset.theme = 'dark';

  const topAppBar = new TopAppBar();
  wrapper.appendChild(topAppBar.render());

  const root = document.createElement('div');
  root.innerHTML = `
    <header class="app-header">
      <div class="app-header__left">
        <h1 class="app-header__title">Testar Fase</h1>
      </div>
      <div class="app-header__right">
        <button id="btn-back" class="header-btn header-btn--hub">Cancelar</button>
        <button id="btn-run" class="header-btn header-btn--run" aria-label="Executar código">
          <img src="src/assets/images/icons/snake-icons/icon-run.svg" alt="" aria-hidden="true" class="btn-icon" width="24" height="24"> Executar
        </button>
        <button id="btn-clear" class="header-btn header-btn--clear" aria-label="Limpar área">
          <img src="src/assets/images/icons/snake-icons/icon-clear.svg" alt="" aria-hidden="true" class="btn-icon" width="24" height="24"> Limpar
        </button>
      </div>
    </header>

    <div class="level-bar">
      <span class="level-name">${escapeHtml(name || 'Fase Personalizada')}</span>
      <span class="block-counter" id="block-counter">Blocos: 0</span>
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
              <div class="block block--action" draggable="true" data-block-type="move-forward" tabindex="0" role="listitem" aria-grabbed="false">Mover Frente</div>
              <div class="block block--action" draggable="true" data-block-type="turn-left" tabindex="0" role="listitem" aria-grabbed="false">Girar Esquerda</div>
              <div class="block block--action" draggable="true" data-block-type="turn-right" tabindex="0" role="listitem" aria-grabbed="false">Girar Direita</div>
            </div>
          </section>

          <section class="sidebar__category" aria-labelledby="cat-control">
            <h3 id="cat-control" class="sidebar__category-header">
              <span class="sidebar__category-dot sidebar__category-dot--control"></span> Controle
            </h3>
            <div class="sidebar__category-items" role="list">
              <div class="c-block c-block--loop" draggable="true" data-block-type="repeat" tabindex="0" role="listitem" aria-grabbed="false">
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
              <div class="c-block c-block--event" draggable="true" data-block-type="if-apple-ahead" tabindex="0" role="listitem" aria-grabbed="false">
                <div class="c-block__header">
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
                <div class="c-block__footer">fim</div>
              </div>
            </div>
          </section>
        </div>
      </aside>

      <section class="workspace" aria-label="Área de montagem de código">
        <div class="workspace__area">
          <div class="workspace__stack"></div>
        </div>
      </section>

      <section class="stage" aria-label="Tabuleiro do jogo" aria-live="polite">
        <div class="stage__header">
          <h2 class="stage__title">Palco</h2>
        </div>
        <div class="stage__body">
          <div class="grid" role="grid" aria-label="Tabuleiro 8 por 8">
            ${GRID_HTML}
          </div>
        </div>
        <div class="stage__footer">
          <span id="stage-position">Pos: (&mdash;, &mdash;) dire&ccedil;&atilde;o &mdash;</span>
          <span id="apple-counter" class="stage__apple-counter">&#127822; 0/0</span>
          <span id="stage-status" class="stage__status">Pronto</span>
        </div>
      </section>
    </div>

    <div id="toast" class="toast" hidden></div>
  `;

  wrapper.appendChild(root);

  const gridEl = root.querySelector('.grid');
  const stackEl = root.querySelector('.workspace__stack');
  const btnRun = root.querySelector('#btn-run');
  const btnClear = root.querySelector('#btn-clear');
  const btnBack = root.querySelector('#btn-back');

  const audio = new AudioFX();
  const snake = new Snake(8, 8, audio);
  const stage = new Stage(gridEl, snake);
  const runner = new Runner(snake, stage);

  snake.loadLevel(levelData);
  stage.render();

  let isExecuting = false;

  function updateBlockCounter() {
    const el = root.querySelector('#block-counter');
    if (el) {
      el.textContent = `Blocos: ${countAllBlocks(stackEl)}`;
    }
  }

  stackEl.addEventListener('input', updateBlockCounter);
  stackEl.addEventListener('change', updateBlockCounter);

  new DragDrop(root, {
    canAddBlock: () => true,
    canAddLoop: () => true,
    canAddIf: () => true,
    onBlockChanged: updateBlockCounter,
    audio,
  });

  btnRun.addEventListener('click', async () => {
    if (isExecuting) return;

    const ast = parseWorkspace(stackEl);
    if (ast.length === 0) return;

    runner.abort();
    snake.loadLevel(levelData);
    stage.render();

    isExecuting = true;
    btnRun.disabled = true;

    const statusEl = root.querySelector('#stage-status');
    if (statusEl) statusEl.textContent = 'Executando...';

    const result = await runner.execute(ast);
    isExecuting = false;
    btnRun.disabled = false;

    if (result.status === 'win') {
      if (statusEl) statusEl.textContent = 'Vitória!';
      audio.play('win');
      handleWin(levelData, name, description, stackEl, root);
    } else if (result.status === 'gameover') {
      if (statusEl) statusEl.textContent = 'Fim de Jogo';
      audio.play('hit');
    }
  });

  btnClear.addEventListener('click', () => {
    runner.abort();
    isExecuting = false;
    btnRun.disabled = false;
    stackEl.innerHTML = '';
    snake.loadLevel(levelData);
    stage.render();
    updateBlockCounter();
    const statusEl = root.querySelector('#stage-status');
    if (statusEl) statusEl.textContent = 'Pronto';
  });

  btnBack.addEventListener('click', () => {
    runner.abort();
    navigateTo('/creator');
  });

  return wrapper;
}

function handleWin(levelData, name, description, stackEl, root) {
  const usedBlocks = countAllBlocks(stackEl);
  const usedLoops = countLoopBlocks(stackEl);
  const usedIfs = countIfBlocks(stackEl);

  const starThreeVal = usedBlocks;
  const starTwoVal = Math.ceil(usedBlocks * 1.2);
  const stars = calculateStars(usedBlocks, starThreeVal, starTwoVal);

  const saved = getJSON('lv_custom_levels') || [];
  const newId = saved.length > 0
    ? Math.max(...saved.map((l) => l.id)) + 1
    : (getJSON('lv_next_level_id') || 11);

  setJSON('lv_next_level_id', newId + 1);

  const level = {
    id: newId,
    name: escapeHtml((name || 'Fase Personalizada').trim()),
    description: escapeHtml((description || '').trim()),
    snake: levelData.snake,
    direction: levelData.direction,
    walls: levelData.walls,
    apples: levelData.apples,
    maxBlocks: Math.max(3, Math.ceil(usedBlocks * 1.2)),
    maxLoops: Math.max(1, Math.ceil(usedLoops * 1.2)),
    maxIfs: Math.max(1, Math.ceil(usedIfs * 1.2)),
    starThree: starThreeVal,
    starTwo: starTwoVal,
    gridSize: 8,
  };

  saved.push(level);
  setJSON('lv_custom_levels', saved);

  showToast(root, `Fase validada! ${'\u2B50'.repeat(stars)}${'\u2606'.repeat(3 - stars)}`);

  consumeTempCreatorData();
  clearDraft();

  setTimeout(() => {
    navigateTo('/creator');
  }, 2000);
}

function showToast(root, msg) {
  const el = root.querySelector('#toast');
  if (!el) return;
  el.textContent = msg;
  el.hidden = false;
  clearTimeout(el._timeout);
  el._timeout = setTimeout(() => {
    el.hidden = true;
  }, 2500);
}

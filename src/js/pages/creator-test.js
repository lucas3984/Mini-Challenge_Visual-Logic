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
            <span class="block-counter" id="block-counter">Blocos: 0</span>
            <span class="block-counter loop-counter" id="loop-counter">Loops: 0</span>
            <span class="block-counter loop-counter" id="if-counter">Se: 0</span>
          </div>
          <div class="workspace__actions">
            <button id="btn-back" class="header-btn header-btn--hub" aria-label="Cancelar">
              <img src="src/assets/images/icons/snake-icons/icon-hub.svg" alt="" aria-hidden="true" class="btn-icon" width="24" height="24"> Cancelar
            </button>
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
          <p class="level-objective-card__description">${escapeHtml(description || 'Teste sua fase personalizada montando blocos para coletar todas as maçãs.')}</p>
        </div>
        <div class="stage-controls">
          <button id="btn-run" class="header-btn header-btn--run" aria-label="Executar código">
            <img src="src/assets/images/icons/visual-programming-icons/Play-Icon.svg" alt="" aria-hidden="true" class="btn-icon" width="24" height="24">
          </button>
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
              <span class="stage__level" id="stage-level">${escapeHtml(name || 'Fase Personalizada')}</span>
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
        <h3 id="rules-title" class="modal__title">📋 Validação da Fase</h3>
        <div class="modal__body rules-content">
          <div class="rules-grid">
            <div class="rules-card">
              <h4>🎯 Objetivo</h4>
              <p>Teste sua fase personalizada montando blocos para coletar todas as maçãs no tabuleiro.</p>
            </div>
            <div class="rules-card">
              <h4>✅ Validação</h4>
              <p>Ao completar a fase com sucesso, ela será salva e aparecerá na seção "Personalizadas" do seletor de fases.</p>
            </div>
            <div class="rules-card">
              <h4>⭐ Estrelas</h4>
              <p>As estrelas são calculadas com base na quantidade de blocos usados. Quanto menos blocos, mais estrelas!</p>
            </div>
            <div class="rules-card rules-card--full">
              <h4>💡 Dica</h4>
              <p>Use <em>Repetir</em> e <em>Se</em> para criar soluções eficientes com menos blocos.</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div id="toast" class="toast" hidden></div>
  `;

  wrapper.appendChild(root);

  const gridEl = root.querySelector('.grid');
  const stackEl = root.querySelector('.workspace__stack');
  const btnRun = root.querySelector('#btn-run');
  const btnClear = root.querySelector('#btn-clear-workspace');
  const btnBack = root.querySelector('#btn-back');
  const btnRules = root.querySelector('#btn-rules');
  const modalRules = root.querySelector('#modal-rules');
  const btnRulesClose = root.querySelector('#btn-rules-close');
  const stageLevelEl = root.querySelector('#stage-level');

  const audio = new AudioFX();
  const snake = new Snake(8, 8, audio);
  const stage = new Stage(gridEl, snake);
  const runner = new Runner(snake, stage);

  snake.loadLevel(levelData);
  stage.render();

  if (stageLevelEl) stageLevelEl.textContent = escapeHtml(name || 'Fase Personalizada');

  let isExecuting = false;

  function updateBlockCounter() {
    const blockCounterEl = root.querySelector('#block-counter');
    const loopCounterEl = root.querySelector('#loop-counter');
    const ifCounterEl = root.querySelector('#if-counter');
    if (blockCounterEl) {
      blockCounterEl.textContent = `Blocos: ${countAllBlocks(stackEl)}`;
    }
    if (loopCounterEl) {
      loopCounterEl.textContent = `Loops: ${countLoopBlocks(stackEl)}`;
    }
    if (ifCounterEl) {
      ifCounterEl.textContent = `Se: ${countIfBlocks(stackEl)}`;
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

  if (modalRules) {
    modalRules.addEventListener('click', (e) => {
      if (e.target === modalRules) modalRules.hidden = true;
    });
  }

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

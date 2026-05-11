import { CreatorBoard } from '../components/creator-board.js';
import { CreatorAssets } from '../components/creator-assets.js';
import { CreatorProperties } from '../components/creator-properties.js';
import { CreatorState } from '../core/creator-state.js';
import { navigateTo } from '../core/router-state.js';
import { setTempCreatorData, peekTempCreatorData } from '../core/creator-temp.js';
import { saveDraft, loadDraft, clearDraft } from '../core/creator-draft.js';
import { debounce } from '../utils/dom.js';

const FAB_SELECTOR = '[data-drawer]';
const DRAWER_SELECTOR = '[data-drawer-id]';

export function render() {
  const state = new CreatorState();
  const main = document.createElement('main');
  main.className = 'page--creator';

  const h1 = document.createElement('h1');
  h1.className = 'sr-only';
  h1.textContent = 'Blockap - Editor de Fases';
  main.appendChild(h1);

  const layout = document.createElement('div');
  layout.className = 'creator-layout';

  const assets = new CreatorAssets({ state });
  const elementsDrawer = buildDrawer('elements', 'drawer-elements', assets.render());
  layout.appendChild(elementsDrawer);

  const board = new CreatorBoard({ state });
  const boardEl = board.render();
  layout.appendChild(boardEl);

  const props = new CreatorProperties({ state, onAction: (action) => handleAction(action, state, main) });
  const propertiesDrawer = buildDrawer('properties', 'drawer-properties', props.render());
  layout.appendChild(propertiesDrawer);

  main.appendChild(layout);

  const prevData = peekTempCreatorData();
  if (prevData) {
    state.importLevel(prevData.levelData);
    props.setValues({ name: prevData.name, description: prevData.description });
  } else {
    const draft = loadDraft();
    if (draft && draft.levelData) {
      state.importLevel(draft.levelData);
      props.setValues({ name: draft.name, description: draft.description });
    }
  }

  const autoSave = debounce(() => {
    const nameInput = document.querySelector('#level-name');
    const descInput = document.querySelector('#level-desc');
    const name = nameInput ? nameInput.value : '';
    const description = descInput ? descInput.value : '';
    try {
      const levelData = state.exportLevel(name, description);
      saveDraft({ levelData, name, description });
    } catch {
      /* grid incomplete — keep last valid draft */
    }
  }, 500);

  state.on('grid-change', autoSave);
  main.addEventListener('input', (e) => {
    if (e.target.id === 'level-name' || e.target.id === 'level-desc') {
      autoSave();
    }
  });

  main.querySelectorAll(FAB_SELECTOR).forEach((fab) => {
    fab.addEventListener('click', () => {
      const id = fab.dataset.drawer;
      const drawer = document.querySelector(`[data-drawer-id="${id}"]`);
      if (!drawer) return;
      if (drawer.classList.contains('creator-drawer--open')) {
        closeDrawer(drawer);
      } else {
        openDrawer(drawer);
      }
    });
  });

  main.querySelectorAll('.creator-drawer__backdrop').forEach((backdrop) => {
    backdrop.addEventListener('click', () => {
      closeDrawer(backdrop.closest(DRAWER_SELECTOR));
    });
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeAll();
  });

  initGridKeyboard(main);
  initFocusTrap();
  initSwipeDismiss(main);

  return main;
}

function handleAction(action, state, main) {
  if (action === 'save') {
    handleSave(state, main);
  } else if (action === 'export') {
    handleExport(state, main);
  } else if (action === 'import') {
    handleImport(state, main);
  }
}

function handleSave(state, main) {
  const nameInput = document.querySelector('#level-name');
  const descInput = document.querySelector('#level-desc');
  const name = nameInput ? nameInput.value : '';
  const description = descInput ? descInput.value : '';

  if (!name || !name.trim()) {
    showToast(main, 'Dê um nome para a fase');
    return;
  }
  if (!description || !description.trim()) {
    showToast(main, 'Dê uma descrição para a fase');
    return;
  }

  const pre = state.preValidate(name);
  if (!pre.valid) {
    showToast(main, pre.reason);
    return;
  }

  const levelData = state.exportLevel(name, description);
  setTempCreatorData({ levelData, name, description });
  navigateTo('/creator/test');
}

async function handleExport(state, main) {
  let hasHead = false;
  const grid = state.getGrid();
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if (grid[r][c]?.type === 'snake-head') { hasHead = true; break; }
    }
    if (hasHead) break;
  }
  if (!hasHead) {
    showToast(main, 'Coloque a cabeça da cobra primeiro');
    return;
  }

  const nameInput = document.querySelector('#level-name');
  const descInput = document.querySelector('#level-desc');
  const name = nameInput ? nameInput.value : '';
  const description = descInput ? descInput.value : '';

  const levelData = state.exportLevel(name, description);

  try {
    await navigator.clipboard.writeText(JSON.stringify(levelData, null, 2));
    showToast(main, 'Fase copiada para a área de transferência!');
  } catch {
    showToast(main, 'Erro ao copiar para a área de transferência');
  }
}

async function handleImport(state, main) {
  let text;
  try {
    text = await navigator.clipboard.readText();
  } catch {
    showToast(main, 'Erro ao ler área de transferência');
    return;
  }

  let data;
  try {
    data = JSON.parse(text);
  } catch {
    showToast(main, 'Dados inválidos: não é um JSON válido');
    return;
  }

  const result = state.importLevel(data);
  if (result.success) {
    const nameInput = document.querySelector('#level-name');
    const descInput = document.querySelector('#level-desc');
    if (nameInput && data.name) nameInput.value = data.name;
    if (descInput && data.description) descInput.value = data.description;
    showToast(main, 'Fase importada com sucesso!');
  } else {
    showToast(main, result.reason);
  }
}

function showToast(root, msg) {
  let toast = root.querySelector('.creator-page__toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.className = 'creator-page__toast';
    toast.setAttribute('aria-live', 'polite');
    root.appendChild(toast);
  }
  toast.textContent = msg;
  toast.classList.add('creator-page__toast--visible');
  // Store timeout ref on element to cancel on rapid successive calls
  clearTimeout(toast._timeout);
  toast._timeout = setTimeout(() => {
    toast.classList.remove('creator-page__toast--visible');
  }, 2500);
}

function buildDrawer(drawerId, elementId, contentEl) {
  const drawer = document.createElement('div');
  drawer.className = 'creator-drawer';
  drawer.dataset.drawerId = drawerId;
  drawer.id = elementId;
  drawer.setAttribute('aria-hidden', 'true');

  const backdrop = document.createElement('div');
  backdrop.className = 'creator-drawer__backdrop';
  backdrop.setAttribute('aria-hidden', 'true');
  drawer.appendChild(backdrop);

  const panel = document.createElement('div');
  panel.className = 'creator-drawer__panel';

  const handle = document.createElement('div');
  handle.className = 'creator-drawer__handle';
  panel.appendChild(handle);

  const content = document.createElement('div');
  content.className = 'creator-drawer__content';
  content.appendChild(contentEl);
  panel.appendChild(content);

  drawer.appendChild(panel);
  return drawer;
}

function openDrawer(drawer) {
  closeAll();
  drawer.classList.add('creator-drawer--open');
  drawer.setAttribute('aria-hidden', 'false');

  const fab = document.querySelector(`[data-drawer="${drawer.dataset.drawerId}"]`);
  if (fab) fab.setAttribute('aria-expanded', 'true');

  requestAnimationFrame(() => {
    const focusTarget = drawer.querySelector('.creator-assets__item, .creator-properties__input');
    if (focusTarget) focusTarget.focus();
  });
}

function closeDrawer(drawer) {
  if (!drawer) return;
  if (window.innerWidth < 768 && drawer.dataset.drawerId === 'elements') return;
  drawer.classList.remove('creator-drawer--open');
  drawer.setAttribute('aria-hidden', 'true');

  const fab = document.querySelector(`[data-drawer="${drawer.dataset.drawerId}"]`);
  if (fab) fab.setAttribute('aria-expanded', 'false');
}

function closeAll() {
  document.querySelectorAll(DRAWER_SELECTOR).forEach((drawer) => {
    if (window.innerWidth < 768 && drawer.dataset.drawerId === 'elements') return;
    closeDrawer(drawer);
  });
}

function initGridKeyboard(root) {
  const grid = root.querySelector('.creator-board__grid');
  if (!grid) return;

  grid.addEventListener('keydown', (e) => {
    const cell = e.target;
    if (!cell || !cell.classList.contains('creator-board__cell')) return;

    const row = cell.closest('[role="row"]');
    if (!row) return;
    const rowCells = [...row.children];
    const colIndex = rowCells.indexOf(cell);
    const allRows = [...grid.querySelectorAll('[role="row"]')];
    const rowIndex = allRows.indexOf(row);

    let target = null;

    if (e.key === 'ArrowRight' && colIndex < rowCells.length - 1) {
      target = rowCells[colIndex + 1];
    } else if (e.key === 'ArrowLeft' && colIndex > 0) {
      target = rowCells[colIndex - 1];
    } else if (e.key === 'ArrowDown' && rowIndex < allRows.length - 1) {
      const nextRow = allRows[rowIndex + 1];
      target = nextRow.children[colIndex] || nextRow.children[nextRow.children.length - 1];
    } else if (e.key === 'ArrowUp' && rowIndex > 0) {
      const prevRow = allRows[rowIndex - 1];
      target = prevRow.children[colIndex] || prevRow.children[prevRow.children.length - 1];
    } else if (e.key === 'Home') {
      target = rowCells[0];
    } else if (e.key === 'End') {
      target = rowCells[rowCells.length - 1];
    }

    if (target) {
      e.preventDefault();
      target.focus();
    }
  });
}

function initFocusTrap() {
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Tab') return;

    const openDrawer = document.querySelector('.creator-drawer--open');
    if (!openDrawer) return;

    const focusable = openDrawer.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (focusable.length === 0) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (e.shiftKey) {
      if (document.activeElement === first) {
        e.preventDefault();
        last.focus();
      }
    } else {
      if (document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  });
}

function initSwipeDismiss(root) {
  root.querySelectorAll(DRAWER_SELECTOR).forEach((drawer) => {
    let startY = 0;
    let currentY = 0;
    let isDragging = false;
    const panel = drawer.querySelector('.creator-drawer__panel');
    if (!panel) return;

    panel.addEventListener('touchstart', (e) => {
      startY = e.touches[0].clientY;
      isDragging = true;
      panel.style.transition = 'none';
    }, { passive: true });

    panel.addEventListener('touchmove', (e) => {
      if (!isDragging) return;
      currentY = e.touches[0].clientY;
      const dy = currentY - startY;
      if (dy > 0 && panel.scrollTop === 0) {
        panel.style.transform = `translateY(${dy}px)`;
      }
    }, { passive: true });

    panel.addEventListener('touchend', () => {
      if (!isDragging) return;
      isDragging = false;
      panel.style.transition = '';
      const dy = currentY - startY;
      if (dy > 80 && panel.scrollTop === 0) {
        panel.style.transform = '';
        closeDrawer(drawer);
      } else {
        panel.style.transform = '';
      }
      startY = 0;
      currentY = 0;
    });
  });
}

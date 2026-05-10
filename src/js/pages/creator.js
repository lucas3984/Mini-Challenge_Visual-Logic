/**
 * Level Creator page.
 *
 * Builds the full creator UI: assets palette, game board, properties form,
 * and mobile drawer system (bottom-sheet with swipe-to-dismiss).
 *
 * @returns {HTMLElement} The page root element.
 */

import { CreatorBoard } from '../components/creator-board.js';
import { CreatorAssets } from '../components/creator-assets.js';
import { CreatorProperties } from '../components/creator-properties.js';

const FAB_SELECTOR = '[data-drawer]';
const DRAWER_SELECTOR = '[data-drawer-id]';

export function render() {
  const main = document.createElement('main');
  main.className = 'page--creator';

  const h1 = document.createElement('h1');
  h1.className = 'sr-only';
  h1.textContent = 'LogicForge - Editor de Fases';
  main.appendChild(h1);

  const layout = document.createElement('div');
  layout.className = 'creator-layout';

  // ── Elements drawer ──────────────────────────────────────────
  const assets = new CreatorAssets();
  const elementsDrawer = buildDrawer('elements', 'drawer-elements', assets.render());
  layout.appendChild(elementsDrawer);

  // ── Board ────────────────────────────────────────────────────
  const board = new CreatorBoard();
  const boardEl = board.render();

  layout.appendChild(boardEl);

  // ── Properties drawer ────────────────────────────────────────
  const props = new CreatorProperties();
  const propertiesDrawer = buildDrawer('properties', 'drawer-properties', props.render());
  layout.appendChild(propertiesDrawer);

  main.appendChild(layout);

  // ── Wire behaviors ──────────────────────────────────────────

  // FAB toggles
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

  // Backdrop close
  main.querySelectorAll('.creator-drawer__backdrop').forEach((backdrop) => {
    backdrop.addEventListener('click', () => {
      closeDrawer(backdrop.closest(DRAWER_SELECTOR));
    });
  });

  // Escape closes all
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeAll();
  });

  // Grid keyboard navigation
  initGridKeyboard(main);

  // Focus trap for open drawers
  initFocusTrap();

  // Swipe-to-dismiss on mobile drawer panels
  initSwipeDismiss(main);

  return main;
}

// ── Drawer HTML builder ──────────────────────────────────────────

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

// ── Drawer state management ─────────────────────────────────────

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

// ── Keyboard navigation for grid ────────────────────────────────

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

// ── Focus trap for open drawers ────────────────────────────────

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

// ── Swipe-to-dismiss on mobile drawer panels ───────────────────

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

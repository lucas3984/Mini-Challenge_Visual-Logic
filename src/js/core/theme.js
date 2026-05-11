/**
 * Centralized theme manager — single source of truth for light/dark mode.
 *
 * Applies the theme via a data-theme attribute on document.documentElement so
 * all CSS selectors ([data-theme="dark"], [data-theme="light"]) cascade
 * correctly to every page and component. Preference persists in localStorage.
 *
 * Emits a "theme-changed" custom event on document so persistent UI elements
 * (e.g. TopAppBar icon) can react without polling.
 */

const STORAGE_KEY = 'theme-preference';
const ATTR = 'data-theme';

/** @type {'light'|'dark'} */
let current = readStored();

function readStored() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'light' || stored === 'dark') return stored;
  } catch (_) { /* unavailable */ }
  return 'dark';
}

function writeStored(theme) {
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch (_) { /* quota or private mode — degrade gracefully */ }
}

function applyTheme(theme) {
  document.documentElement.setAttribute(ATTR, theme);
}

/**
 * Returns the current theme value.
 * @returns {'light'|'dark'}
 */
export function getTheme() {
  return current;
}

/**
 * Sets the theme explicitly and persists the preference.
 * @param {'light'|'dark'} theme
 */
export function setTheme(theme) {
  if (theme !== 'light' && theme !== 'dark') return;
  if (theme === current) return;
  current = theme;
  writeStored(theme);
  applyTheme(theme);
  document.dispatchEvent(new CustomEvent('theme-changed', { detail: { theme } }));
}

/**
 * Toggles between light and dark, returns the new value.
 * @returns {'light'|'dark'}
 */
export function toggleTheme() {
  const next = current === 'dark' ? 'light' : 'dark';
  setTheme(next);
  return next;
}

applyTheme(current);

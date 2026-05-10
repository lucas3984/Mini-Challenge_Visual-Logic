/**
 * Hash-based SPA router with pattern matching.
 * Uses hashchange to enable client-side routing without a server,
 * and converts URL patterns like /snake/:level into regex for parameter extraction.
 * Moves focus to the mounting element on route change for screen reader accessibility.
 */
export class Router {
  #routes;
  #mountEl;

  /**
   * Callback fired after every route change with the new hash value.
   * @type {(hash: string) => void|null}
   */
  onRouteChange = null;

  /**
   * @param {HTMLElement} mountEl - mounting point where pages are rendered
   */
  constructor(mountEl) {
    this.#routes = [];
    this.#mountEl = mountEl;
    window.addEventListener('hashchange', () => this.#handleRoute());
  }

  /**
   * Registers a route pattern with its handler function.
   * @param {string} pattern - URL pattern (e.g. '/snake/:level')
   * @param {Function} handler - function that returns HTMLElement (receives params object)
   */
  addRoute(pattern, handler) {
    const regex = this.#patternToRegex(pattern);
    this.#routes.push({ pattern, regex, handler });
  }

  /**
   * Navigates to a path programmatically.
   * @param {string} path - target hash path (e.g. '/snake')
   */
  navigate(path) {
    location.hash = path;
  }

  /**
   * Replaces the current hash without causing a route transition.
   * Used when a page needs to keep the URL in sync during in-page state changes.
   * @param {string} path - target hash path (e.g. '/levels/snake/3')
   */
  replace(path) {
    history.replaceState(null, '', `#${path}`);
  }

  /**
   * Re-renders the current route without changing the hash.
   * Used when the active profile changes to refresh all page data.
   */
  refresh() {
    this.#handleRoute();
  }

  /**
   * Starts the router: handles the initial hash or defaults to '/'.
   */
  start() {
    if (!location.hash) {
      location.hash = '#/';
      return;
    }
    this.#handleRoute();
  }

  /**
   * Matches the current hash against registered routes and mounts the
   * corresponding page. Falls back to '/' on unknown routes.
   */
  #handleRoute() {
    const hash = location.hash.slice(1) || '/';
    for (const { regex, handler } of this.#routes) {
      const match = hash.match(regex);
      if (match) {
        const params = match.groups || {};
        const element = handler(params);
        this.#mountEl.innerHTML = '';
        this.#mountEl.appendChild(element);
        this.#mountEl.setAttribute('tabindex', '-1');
        this.#mountEl.focus();
        if (this.onRouteChange) {
          this.onRouteChange(location.hash);
        }
        return;
      }
    }
    // Unknown route — redirect to home
    location.hash = '#/';
  }

  /**
   * Converts a route pattern like '/snake/:level' into a regex
   * with named capture groups.
   * @param {string} pattern
   * @returns {RegExp}
   */
  #patternToRegex(pattern) {
    const escaped = pattern
      .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      .replace(/:(\w+)/g, '(?<$1>[^/]+)');
    return new RegExp(`^${escaped}$`);
  }
}

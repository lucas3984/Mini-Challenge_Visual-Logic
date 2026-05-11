/**
 * Hash-based SPA router with pattern matching.
 * Uses hashchange to enable client-side routing without a server,
 * and converts URL patterns like /snake/:level into regex for parameter extraction.
 * Moves focus to the mounting element on route change for screen reader accessibility.
 */
export class Router {
  #routes;
  #mountEl;
  #transitioning = false;
  #transitionTimer = null;

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
        this.#swapContent(element);
        return;
      }
    }
    // Unknown route — redirect to home
    location.hash = '#/';
  }

  /**
   * Performs the content swap with a fade transition when there is already
   * content in the mount element. On first render (empty mount), mounts
   * instantly without animation. On rapid navigation, aborts any in-flight
   * transition to prevent stale DOM from lingering.
   * @param {HTMLElement} element
   */
  #swapContent(element) {
    if (this.#transitioning) {
      this.#abortTransition();
    }

    if (this.#mountEl.children.length === 0) {
      this.#mountInstant(element);
      return;
    }

    this.#transitioning = true;
    this.#mountEl.classList.add('page--exiting');

    const onEnd = () => {
      if (!this.#transitioning) return;
      this.#transitioning = false;
      clearTimeout(this.#transitionTimer);
      this.#mountInstant(element);
    };

    const onTransitionEnd = (e) => {
      if (e.target === this.#mountEl && e.propertyName === 'opacity') {
        this.#mountEl.removeEventListener('transitionend', onTransitionEnd);
        onEnd();
      }
    };

    this.#mountEl.addEventListener('transitionend', onTransitionEnd);

    // Safety timeout: force swap if transitionend doesn't fire (e.g. tab hidden)
    this.#transitionTimer = setTimeout(() => {
      this.#mountEl.removeEventListener('transitionend', onTransitionEnd);
      onEnd();
    }, 400);
  }

  /**
   * Aborts the current in-flight transition, resetting classes and timers
   * so the next navigation can proceed cleanly.
   */
  #abortTransition() {
    this.#transitioning = false;
    clearTimeout(this.#transitionTimer);
    this.#mountEl.classList.remove('page--exiting');
  }

  /**
   * Instantly mounts the given element into the mount container without
   * any transition — used for first render and as the second half of the
   * fade transition (after the exit completes).
   * @param {HTMLElement} element
   */
  #mountInstant(element) {
    clearTimeout(this.#transitionTimer);
    this.#mountEl.innerHTML = '';
    this.#mountEl.appendChild(element);
    this.#mountEl.classList.remove('page--exiting');
    this.#mountEl.setAttribute('tabindex', '-1');
    this.#mountEl.focus();
    if (this.onRouteChange) {
      this.onRouteChange(location.hash);
    }
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

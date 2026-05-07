/**
 * Base component class providing a minimal lifecycle: mount → render → unmount.
 * Subclasses override render() to return their DOM element.
 * Private state (container reference) uses the # field syntax to prevent external access.
 */
export class Component {
  #container;

  constructor() {
    this.#container = null;
  }

  /**
   * Attach the component to a DOM container and trigger initial render.
   * @param {HTMLElement} container - parent element to mount into
   */
  mount(container) {
    this.#container = container;
    this.render();
  }

  /**
   * Produce the component's DOM. Override in subclasses.
   * @returns {HTMLElement|void}
   */
  render() {}

  /**
   * Clean up the component: clear its container and release the reference.
   * Clearing innerHTML prevents memory leaks from stale DOM references.
   */
  unmount() {
    if (this.#container) {
      this.#container.innerHTML = '';
    }
    this.#container = null;
  }
}

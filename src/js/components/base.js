/*
 * Abstract base component with lifecycle hooks and automatic listener cleanup.
 * Uses private fields (#) to enforce encapsulation — no external code can
 * mutate container, listeners, or listenerTarget, preventing memory leaks
 * from dangling references.
 */
export class Component {
  /* The DOM node that owns this component's rendered output. */
  #container = null;
  /* Tracked event listeners for automatic teardown in unmount(). */
  #listeners = [];
  /*
   * First DOM node passed to addListener — stored so unmount() can call
   * removeEventListener on the original target, not on a potentially-detached node.
   */
  #listenerTarget = null;

  /*
   * Appends rendered element into the given container and triggers subclass hook.
   * Validates container type to fail fast on API misuse (e.g. passing a string).
   */
  mount(container) {
    if (!(container instanceof HTMLElement)) {
      throw new Error('Container must be an HTMLElement');
    }
    this.#container = container;
    container.appendChild(this.render());
    this.onMount();
  }

  /*
   * Removes all listeners tracked via addListener(), then detaches the rendered
   * DOM. This prevents memory leaks when components are swapped out (e.g. SPA
   * route changes). onUnmount() lets subclasses clean up their own state.
   */
  unmount() {
    this.#listeners.forEach(({ event, handler }) => {
      this.#listenerTarget?.removeEventListener(event, handler);
    });
    this.#listeners = [];
    if (this.#container && this.#container.firstChild) {
      this.#container.removeChild(this.#container.firstChild);
    }
    this.onUnmount();
  }

  /* Lifecycle hooks — no-op by default so subclasses can override selectively. */

  onMount() {}

  onUnmount() {}

  /*
   * Forces subclasses to implement their own rendering logic.
   * Never returns HTML strings; subclasses must build HTMLElements via DOM API.
   */
  render() {
    throw new Error('render() must be implemented by subclass');
  }

  /*
   * Registers a DOM event listener and tracks it for automatic removal.
   * The first call captures the target reference — all listeners on the same
   * target share that reference so unmount() cleans them all up.
   */
  addListener(target, event, handler) {
    if (!this.#listenerTarget) {
      this.#listenerTarget = target;
    }
    target.addEventListener(event, handler);
    this.#listeners.push({ event, handler });
  }
}
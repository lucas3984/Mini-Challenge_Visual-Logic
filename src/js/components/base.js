/**
 * Base Component class
 * Provides consistent lifecycle: mount → render → unmount
 * All UI components should extend this class
 */
export class Component {
  #container = null;

  render() {
    throw new Error('render() must be implemented by subclass');
  }

  mount(container) {
    this.#container = container;
    const element = this.render();
    container.appendChild(element);
    this.onMount?.(element);
  }

  unmount() {
    this.onUnmount?.();
    if (this.#container) {
      this.#container.innerHTML = '';
    }
  }

  // Lifecycle hooks: override in subclasses if needed
  onMount() {}
  onUnmount() {}
}

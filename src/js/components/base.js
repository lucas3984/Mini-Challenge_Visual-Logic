export class Component {
  #container = null;
  #listeners = [];

  mount(container) {
    if (!(container instanceof HTMLElement)) {
      throw new Error('Container must be an HTMLElement');
    }
    this.#container = container;
    container.appendChild(this.render());
    this.onMount();
  }

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

  onMount() {}

  onUnmount() {}

  render() {
    throw new Error('render() must be implemented by subclass');
  }

  #listenerTarget = null;

  addListener(target, event, handler) {
    if (!this.#listenerTarget) {
      this.#listenerTarget = target;
    }
    target.addEventListener(event, handler);
    this.#listeners.push({ event, handler });
  }
}
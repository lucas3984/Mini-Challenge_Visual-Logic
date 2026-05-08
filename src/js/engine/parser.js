/**
 * AST parser for the visual block workspace.
 *
 * Walks the DOM tree of the workspace stack and converts visual blocks
 * (action, loop, conditional) into an Abstract Syntax Tree that the
 * Runner can execute sequentially.
 *
 * The mapping between DOM dataset attributes and internal command names
 * decouples the visual layer (HTML/CSS class naming) from the game
 * engine (Snake method names).
 */

/** Maps DOM `data-block-type` values to Snake method names used by the Runner. */
const COMMAND_MAP = {
  'move-forward': 'moveForward',
  'turn-left': 'turnLeft',
  'turn-right': 'turnRight',
};

/**
 * Parses the entire workspace stack into an AST.
 *
 * @param {HTMLElement} stackEl - The `.stack` container holding top-level blocks.
 * @returns {Object[]} Array of AST node objects (action, loop, conditional).
 */
export function parseWorkspace(stackEl) {
  const ast = [];

  for (const child of stackEl.children) {
    const node = parseNode(child);
    if (node) {
      ast.push(node);
    }
  }

  return ast;
}

/**
 * Recursively parses a single DOM block element into an AST node.
 *
 * Block type is determined via CSS class and `data-block-type` attribute,
 * keeping the parser independent of element tag names.
 *
 * @param {HTMLElement} el - A block element (direct child of stack or dropzone).
 * @returns {Object|null} AST node, or null if the element is not a recognized block.
 */
function parseNode(el) {
  const blockType = el.dataset.blockType;

  if (!blockType) return null;

  if (el.classList.contains('block--action')) {
    const command = COMMAND_MAP[blockType];
    if (!command) return null; // Unknown action type — skip silently to keep the program valid.

    return {
      type: 'action',
      command,
      node: el,
    };
  }

  if (el.classList.contains('c-block--loop')) {
    const input = el.querySelector('.c-block__input');
    // parseInt with fallback to 1: an empty/invalid input still runs at least once,
    // preventing a zero-iteration no-op that would confuse the user.
    const iterations = input ? parseInt(input.value, 10) || 1 : 1;
    const dropzone = el.querySelector('.c-block__dropzone');

    const children = [];
    if (dropzone) {
      for (const child of dropzone.children) {
        const childNode = parseNode(child);
        if (childNode) children.push(childNode);
      }
    }

    return {
      type: 'loop',
      iterations,
      children,
      node: el,
    };
  }

  if (el.classList.contains('c-block--event')) {
    // Supports both <select> and <input> so blocks work regardless of which form element is used.
    const select = el.querySelector('.c-block__select, .c-block__input');
    const conditionLabel = select ? select.value : '';
    const condition = mapCondition(conditionLabel);
    const dropzone = el.querySelector('.c-block__dropzone');

    const children = [];
    if (dropzone) {
      for (const child of dropzone.children) {
        const childNode = parseNode(child);
        if (childNode) children.push(childNode);
      }
    }

    return {
      type: 'conditional',
      condition,
      children,
      node: el,
    };
  }

  return null;
}

/**
 * Translates user-facing Portuguese condition labels into internal
 * snake method names. Defaults to 'checkAppleAhead' so the program
 * does not break if a new/unmapped label is introduced.
 *
 * @param {string} label - The selected option label (e.g. "Maçã à frente").
 * @returns {string} Internal method name on the Snake instance.
 */
function mapCondition(label) {
  switch (label) {
    case 'Maçã à frente':
      return 'checkAppleAhead';
    case 'Parede à frente':
      return 'checkWallAhead';
    case 'Cobra à frente':
      return 'checkSnakeAhead';
    default:
      return 'checkAppleAhead';
  }
}

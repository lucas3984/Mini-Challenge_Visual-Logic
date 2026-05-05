# AGENTS.md

## Project type

Vanilla JS + static CSS. No build, no bundler, no npm.
Mobile-first responsive design.
Semantic HTML5 (ARIA roles, focus trap, keyboard navigation)
State storage via localStorage

## Structure

Edit only the local file (STRUCTURE.md), which is ignored by git.
See the full structure in [STRUCTURE.md](./STRUCTURE.md).

## Best practices

- **Understand before changing:** read the full file and surrounding context before making changes
- **Minimal scope:** make the smallest change possible; do not refactor unrelated code without explicit request
- **Communicate the plan:** for complex tasks, describe the plan upfront and a summary at the end; never silence errors
- **Ask when ambiguous:** if there are multiple valid approaches or the decision is costly/irreversible, ask before implementing
- **Zero hardcoded:** never embed credentials, tokens, passwords, or production URLs; use environment variables
- **Verify before and after:** run tests (or manually verify) before and after changes to detect regressions
- **Comment the "why":** code says what it does; comments should explain the motivation or decision behind it
- **Don't remove without confirming:** preserve existing functionality; document breaking changes when unavoidable
- **Performance matters:** avoid unnecessary loops, repeated queries, and unused data loading; mention to the user if there is an impact
- **Consistent language:** code, comments, and documentation are in **en-us**
- **Keep this file updated:** add new conventions or commands as they are discovered
- **No commits without authorization:** never commit to git without explicit user approval
- **No commits in plan mode:** never commit when only planning or discussing changes or in planning mode

## Conventions

### General

- ES6+ modules only, no frameworks
- CSS with BEM naming (`block__element--modifier`)
- Private state via `#` fields on classes
- Utility functions in `utils/` (pure functions, no side effects)
- Mandatory user input sanitization against XSS (`escapeHtml`)
- No tight coupling

### JavaScript

- Use `const` by default, `let` when necessary, never `var`
- Prefer arrow functions for callbacks and simple functions
- PascalCase classes; camelCase variables and functions
- ES modules (`export`/`import`); never pollute the global scope
- Global variables forbidden; use ES modules (`type="module"`) with `export`/`import`
- Each `.js` file must have a single responsibility
- DOM logic separated from data/business logic
- Event delegation on lists and collections for performance
- Never leave errors silent; always log or propagate
- Validate inputs at the edge (controllers, handlers)
- `localStorage` always with `try/catch` (may fail in private mode or quota exceeded)

### HTML

- Close all tags, even optional ones
- Use descriptive `alt` attributes on images
- Prefer semantic tags (`<header>`, `<nav>`, `<main>`, `<section>`)
- Descriptive `aria-label` on interactive controls
- `aria-live="polite"` on dynamic regions for screen readers

### CSS

- Prefer classes over inline styles
- Use CSS variables instead of hardcoded values
- Spacing always via `var(--space-*)` — never arbitrary px values
- Follow consistent ordering: layout → box model → typography → visual
- Trigger animations via `classList` — never manipulate `style` inline for animations
- CSS variables mandatory; zero hardcoded colors outside `design-system.css`
- Mobile-first approach: base styles for mobile, `min-width` media queries
- Breakpoints in CSS variables in `design-system.css` (`--breakpoint-sm`, `--breakpoint-md`, `--breakpoint-lg`)
- Use relative units (`rem`, `em`, `%`, `clamp()`) instead of `px` for layouts and typography
- Minimum touch targets of `44x44px` for interactive elements
- Grids and flexbox preferred over fixed positioning
- Responsive images and media via `max-width: 100%` and `height: auto`

### Separation of responsibilities

- HTML, CSS, and JS always in separate files
- HTML: structure and semantics only; zero inline logic or styles
- CSS: all styling in dedicated `.css` files
- JS: all logic in dedicated `.js` files; imported via `<script type="module">` in HTML

### Naming

- Files and folders: kebab-case (`my-component.js`)
- Commits: imperative in en-us (`add email validation`)

### Branches

- Branch names follow `type/short-description` format (kebab-case, no accents, description in English)
- Required types:
- `feat/` — new features (ex: `feat/login-page`)
- `fix/` — bug fixes (ex: `fix/button-color`)
- `docs/` — documentation changes only (ex: `docs/update-readme`)
- `style/` — formatting/style without changing logic (ex: `style/fix-indentation`)
- `refactor/` — code changes without bug fixes or features (ex: `refactor/extract-utils`)
- `test/` — add or fix tests (ex: `test/auth-flow`)
- `chore/` — build, config, dependencies (ex: `chore/update-config`)
- `hotfix/` — urgent production fixes (ex: `hotfix/crash-on-load`)
- Short description: maximum 3 words, kebab-case, no accents

### SPA & Routing

- Hash-based routing: `#/`, `#/puzzle/:id`, etc.
- Always use `router.navigate(path)` — never manipulate `location.hash` directly
- Routes with dynamic parameters available in handler as object
- Route transitions must move focus to `<main>` (accessibility)
- Native `hashchange` listener generated by router
- One file per page in `js/pages/`
- Pages export function `render(): HTMLElement`

### Components

- Extend `Component` from `js/components/base.js`
- Implement `render()` returning `HTMLElement` (never HTML strings from user)
- Clean up listeners and state in `unmount()`
- PascalCase class names, kebab-case file names
- Private state via `#` fields
- Lifecycle: `mount(container)` → `render()` → `unmount()`
- Components are imported via ES modules

## MCPs

### Stitch

- **Timeout ≠ retry:** if Stitch returns timeout, **DO NOT retry** immediately. Wait and verify if generation completed despite the timeout — the image may have been produced in background. Check status before retrying. Only retry with user permission, always ask.

# Best Practices: File Structure for Inglorious Web Types

This document defines recommended folder structures and export patterns for Inglorious Web types. Each type lives in its own folder so rendering, styling, behavior, and documentation stay modular and predictable. Prefer plain props-first renderers for primitives, and let `index.js` attach store behavior only when needed.

## Standard structure

For a type named `Button`, create `types/button` with the following files:

- `template.js`: Exports plain renderers such as `render(props)` and optional sub-renderers such as `renderItem(props, payload)`.
- `style.module.css` or `style.css`: Styles used by `template.js`.
- `handlers.js` (optional): Named exports for event handlers and event-related logic.
- `helpers.js` (optional): Named exports for reusable utilities used by template/handlers.
- `button.stories.js` (optional): Storybook stories.
- `button.test.js` (optional): Vitest tests.
- `index.js`: Public entry point that composes and exposes the type surface.

This layout scales well as new types are added and keeps responsibilities clear by file.

## Component taxonomy (recommended)

For medium/large libraries, group components by intent instead of keeping everything in one flat `components/` folder.

Suggested top-level categories:

- `controls/`: interactive form and action primitives (`button`, `input`, `select`, `checkbox`)
- `layout/`: structural primitives (`flex`, `grid`, `stack`, `container`)
- `content/`: representational building blocks (`icon`, `typography`, `badge`, `avatar`)
- `widgets/`: composed UI blocks (`card`, `table`, `modal`, `navbar`)

Suggested structure:

- `src/controls/button/...`
- `src/controls/input/...`
- `src/widgets/card/...`

Common practice in design systems:

- Start flat while the library is small.
- Introduce categories once discovery or ownership becomes harder.
- Keep export paths stable (barrels or explicit exports) so internal folder moves do not break consumers.

## Type composition and sub-renderers

### Simple primitives (recommended)

For simple primitives such as `input`, `button`, or `select`, prefer plain render functions that accept props.

- Use `render(props)` in `template.js`.
- Treat event handlers such as `onChange` or `onClick` as normal props.
- Do not force a store API into simple templates.

Example:

```javascript
export function render(props) {
  const { value = "", onChange } = props;

  return html`<input
    .value=${value}
    @input=${(event) => onChange?.(event.target.value)}
  />`;
}
```

### Wiring a primitive to the store

If a primitive needs store integration, keep the template plain and attach behavior in `index.js`.

Example:

```javascript
import * as renderers from "./template.js";

export const Input = {
  ...renderers,
};

export const MyInput = {
  ...renderers,
  change(entity, value) {
    entity.value = value;
  },
  render(entity, api) {
    return renderers.render({
      ...entity,
      onChange: (value) => api.notify(`#${entity.id}:change`, value),
    });
  },
};
```

This keeps `template.js` presentational and moves store wiring to the container layer.

### Composite primitives must be objects

If a primitive has overridable sub-renderers such as `renderHeader`, `renderFooter`, or `renderItem`, export it as an object with methods.

Example:

```javascript
export const Card = {
  render(props) {
    return html`<article>
      ${this.renderBody(props)} ${this.renderFooter(props)}
    </article>`;
  },
  renderBody(props) {
    return props.children;
  },
  renderFooter() {
    return null;
  },
};
```

Then consumers can override behavior predictably:

```javascript
const MyCard = {
  ...Card,
  renderFooter(props) {
    return html`<footer>${props.footer}</footer>`;
  },
};
```

### Composite primitives: prefer a base render function

For composed primitives, expose a top-level `render()` that delegates to a named base renderer such as `renderPrimitive()`. This keeps `render()` overrideable while still letting users invoke the canonical internal implementation from their overrides.

Example pattern (template renderers):

```javascript
export const Primitive = {
  render(props) {
    return this.renderPrimitive(props);
  },
  renderPrimitive(props) {
    return html`<div class="iw-primitive">
      ${this.renderHeader?.(props)} ${this.renderBody?.(props)}
      ${this.renderFooter?.(props)}
    </div>`;
  },
  renderHeader(props) {
    // ...
  },
  renderBody(props) {
    // ...
  },
  renderFooter(props) {
    // ...
  },
};
```

Example pattern (type wiring):

```javascript
export const WiredPrimitive = {
  ...handlers,
  ...renderers,
  render(entity, api) {
    const id = entity.id;
    const props = {
      ...entity,
      onChange: (value) => api.notify(`#${id}:change`, value),
    };

    return this.renderPrimitive(props);
  },
};
```

Do not call `this.render()` from `render()`; always delegate to a named base renderer (for example `renderPrimitive()`) to avoid infinite recursion.

Avoid defining `render()` as a monolithic implementation for composite primitives. Prefer a single, named base renderer that can be reused from both the default `render()` and user overrides.

### Stateful primitives

A few primitives such as `combobox` or `data-grid` may need richer behavior, but the template should still stay plain.

- Keep `template.js` as an object of render methods that accept props.
- Use `index.js` to wire store notifications and derived event handlers.
- Avoid introducing ad-hoc local state objects inside the primitive.
- If true local component state is required, prefer a web component instead.

Example:

```javascript
import * as renderers from "./template.js";

export const Combobox = {
  ...renderers,
  toggle(entity) {
    entity.isOpen = !entity.isOpen;
  },
  render(entity, api) {
    return renderers.render({
      ...entity,
      onToggle: () => api.notify(`#${entity.id}:toggle`),
    });
  },
};
```

## Choose a styling mode

### App-local types (default)

Use CSS modules:

- `style.module.css`
- Class names imported into `template.js`
- Best when isolation is preferred

### Design-system types (reusable package)

Use global CSS with namespacing:

- `style.css`
- Stable `iw-` prefixed classes
- CSS custom properties/tokens for themeability
- Best when consumers need easy override/customization

For reusable UI packages, prefer flat class names over BEM-style `__` / `--` patterns.

Recommended naming style:

- Base: `iw-button`
- State/variant/size: `iw-button-outline`, `iw-button-ghost`, `iw-button-sm`, `iw-button-full-width`
- Child elements: `iw-button-icon`, `iw-card-header`, `iw-input-label`

## CSS structure conventions

Follow the table styles approach in `packages/web/src/table`:

- Anchor all component rules under the root selector (for example `.iw-button { ... }`).
- Use CSS nesting for pseudo states, modifiers, and children.
- Keep selectors shallow and consistent.

Example pattern:

```css
.iw-button {
  /* base styles */

  &:hover:not(:disabled) {
    /* state styles */
  }

  &.iw-button-outline {
    /* modifier styles */
  }

  .iw-button-icon {
    /* child element styles */
  }
}
```

## Theme conventions

- Put primitive tokens in `tokens/index.css` (global).
- Scope semantic/component tokens to theme classes (`.iw-theme-inglorious`, `.iw-theme-material`, `.iw-theme-bootstrap`) instead of `:root`.
- Scope mode overrides to combined classes (for example `.iw-theme-material.iw-theme-dark`).
- In Storybook, import all theme styles and switch the body/root class via globals toolbar.

This ensures theme switching actually changes component tokens.

## File-by-file guidance

### `template.js`

- Keep templates pure and side-effect free.
- Prefer `render(props)` for simple primitives.
- Treat event handlers such as `onChange`, `onClick`, and `onToggle` as normal props.
- Add concise JSDoc typedef imports for props and payload types when useful.
- Extract sub-renderers (`renderHeader`, `renderBody`, `renderFooter`, `renderItem`, etc.) when template complexity grows.
- If sub-renderers exist, export an object with methods so consumers can override them.

### `style.module.css` or `style.css`

- Prefer design tokens/variables over hard-coded values.
- Keep selectors anchored to a single component root.
- For global component CSS, use `iw-` prefixes and nested rules.

### `handlers.js` (optional)

- Export handlers as named exports.
- Keep handlers focused and testable.
- Delegate shared logic to `helpers.js` when needed.

### `helpers.js` (optional)

- Keep helpers small and reusable.
- Use named exports.
- Expose only intentional helpers from `index.js`.

### `index.js`

- Use `index.js` as the container layer when store wiring is needed.
- Map store events to plain handler props passed into `template.js`.
- Re-export only selected helpers as part of the public API.

Recommended patterns:

```javascript
// Pure primitive
export { render } from "./template.js";
```

```javascript
// Store-wired primitive
import * as handlers from "./handlers.js";
import * as renderers from "./template.js";

export const Input = {
  ...handlers,
  ...renderers,
  render(entity, api) {
    return renderers.render({
      ...entity,
      onChange: (value) => api.notify(`#${entity.id}:change`, value),
    });
  },
};
```

If optional files are absent, omit those imports/exports instead of creating empty modules.

## Stories best practices (`button.stories.js`)

- Default to args-driven stories that render one component instance.
- Keep `Default` as the controls playground.
- Use additional single-instance stories (`Small`, `Large`, `Secondary`) for curated presets.
- Use matrix/gallery stories only when comparison is the goal.
- If a story renders multiple instances, disable controls for that story to avoid misleading behavior.

## Test best practices (`button.test.js`)

- Test render output first: content, attributes, and classes.
- Test modifier behavior (variant, size, color, disabled, full-width).
- Test optional content slots/props (for example `icon`, `iconAfter`).
- Test behavior wiring: user interaction should emit expected events through `api.notify()`.
- Keep tests deterministic and focused on observable DOM/events.

## Optional type declarations

For published packages, add a typed public contract (for example `types/button.d.ts`) that matches runtime behavior:

- Entity interface with supported props and unions
- Type interface for `render` and handlers/sub-renderers
- Exported type declaration

## Migration notes

- Move each type from a flat structure into `types/<type-name>/`.
- Split mixed files into `template.js`, style file, `handlers.js`, and `helpers.js` by responsibility.
- Add `index.js` as the single public entry for the type.
- If the type uses BEM classes, rename to flat prefixed classes and nest selectors under the root class.
- If themes use `:root` component tokens, migrate them to theme-class scoping.
- If entities contain template/function fields, migrate those customizations to type composition and sub-renderer overrides.
- Update imports to target the new type entry, for example:
  - `import { Button } from "./types/button/index.js"`

## Pre-ship checklist

- Every type has its own folder.
- Simple primitives use plain `render(props)`.
- Store wiring lives in `index.js`, not in simple templates.
- Styling mode is explicit (`style.module.css` for local types, `style.css` + prefix/tokens for reusable design-system types).
- Global component CSS avoids BEM and uses nested rules under one root selector.
- Theme tokens are class-scoped and Storybook theme switching updates class names.
- Stories are controls-friendly by default (single instance per args story).
- Tests verify both visual contract (DOM/classes) and behavior contract (events).
- Composite primitives are exported as objects with overridable methods.
- Complex templates are decomposed into overridable sub-renderers.
- Stateful behavior is still wired through plain props; if true local state is needed, use a web component.

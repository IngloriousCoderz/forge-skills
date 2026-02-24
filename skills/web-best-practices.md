# Best Practices: File Structure for Inglorious Web Types

This document defines recommended folder structures and export patterns for Inglorious Web types. Each type lives in its own folder so rendering, styling, behavior, and documentation stay modular and predictable.

## Standard structure

For a type named `button`, create `types/button` with the following files:

- `template.js`: Exports `render(entity, api)` and optional sub-renderers such as `renderRow(entity, row, api)`.
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

### Behavior composition (recommended)

Treat a type as a composition unit:

- A behavior object: `{ render, click, ... }`
- Or a behavior array: `[baseBehavior, decoratorBehaviorFn, overrideBehavior]`

Prefer behavior arrays for extensibility and cross-cutting concerns.

Example:

```javascript
const baseButton = { render, click };

function withRenderValidation(type) {
  return {
    ...type,
    render(entity, api) {
      if (entity == null || api == null) {
        throw new TypeError("render(entity, api): both arguments are required");
      }
      return type.render(entity, api);
    },
  };
}

export const button = [baseButton, withRenderValidation];
```

### Overridable sub-renderers (recommended)

Split large templates into overridable sub-renderers and call them through the resolved type.

Example pattern:

```javascript
export function render(entity, api) {
  const type = api.getType(entity.type);
  return html`
    <div>
      ${type.renderHeader(entity, api)} ${type.renderBody(entity, api)}
      ${type.renderFooter(entity, api)}
    </div>
  `;
}

export function renderFooter() {
  return null;
}
```

Then customize via composition instead of putting templates/functions into entities.

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

- Keep `render(entity, api)` pure and side-effect free.
- Destructure entity props with defaults near the top.
- Build classes predictably (for example with `classMap` or a helper).
- Dispatch events through `api.notify()` using stable event ids such as `#${entity.id}:click`.
- Add concise JSDoc typedef imports for entity and API types when useful.
- Extract sub-renderers (`renderHeader`, `renderBody`, `renderFooter`, etc.) when template complexity grows.

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

- Compose the type surface from behaviors/renderers/handlers.
- Prefer behavior arrays when you need decorators, validation wrappers, or override layers.
- Re-export only selected helpers as part of the public API.

Recommended patterns:

```javascript
// Object style (simple)
export const button = { ...handlers, ...renderers };
```

```javascript
// Behavior-array style (extensible)
const baseButton = { ...handlers, ...renderers };
export const button = [baseButton, withRenderValidation];
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
  - `import { button } from "./types/button/index.js"`

## Pre-ship checklist

- Every type has its own folder.
- `render(entity, api)` stays pure.
- Styling mode is explicit (`style.module.css` for local types, `style.css` + prefix/tokens for reusable design-system types).
- Global component CSS avoids BEM and uses nested rules under one root selector.
- Theme tokens are class-scoped and Storybook theme switching updates class names.
- Stories are controls-friendly by default (single instance per args story).
- Tests verify both visual contract (DOM/classes) and behavior contract (events).
- Composition strategy is explicit (object or behavior array, with behavior arrays preferred for extensibility).
- Complex templates are decomposed into overridable sub-renderers.

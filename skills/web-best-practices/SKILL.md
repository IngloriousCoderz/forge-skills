---
name: web-best-practices
description: Best practices for organizing Inglorious Web types and page structure in large apps.
---

# Best Practices: File Structure for Inglorious Web Types

This document defines recommended folder structures and export patterns for Inglorious Web types. Each type lives in its own folder so rendering, styling, behavior, and documentation stay modular and predictable. Templates take props, and `index.js` attaches store behavior only when needed.

## Standard structure

For a type named `Button`, create a `button/` folder where it belongs: in an app, see [App structure](#app-structure); in a library, see [Component taxonomy](#component-taxonomy-recommended). It holds these files:

- `index.js`: Public entry point. For a presentational type it holds the type itself; once the type has logic, it composes `template.js`, handlers and helpers.
- `template.js` (once the type has logic): Exports `template`, the object of render methods.
- `style.module.css` or `style.css`: Styles used by the render methods.
- `handlers.js` (optional): Named exports for event handlers and event-related logic.
- `helpers.js` (optional): Named exports for reusable utilities used by template/handlers.
- `button.stories.js` (optional): Storybook stories.
- `button.test.js` (optional): Vitest tests.

## App structure

In an app, group code by where it belongs, never by whether it talks to the store. A type wired to the store and a component that only takes props sit side by side when they belong to the same place.

```
src/
├── main.js            # Mounts the app
├── app/               # The shell: app bar, navigation, page layout
│   ├── index.js
│   ├── style.css
│   └── tab-bar/       # The shell's own pieces, one folder each
├── views/             # Only with a router: one folder per routed screen
│   ├── home/
│   │   ├── index.js
│   │   └── message/   # A piece lives with what renders it
│   └── about/
├── common/            # Pieces rendered in more than one place
├── api/               # Calls to servers
├── store/             # Store setup: entities, middlewares, routes
└── styles/            # Global stylesheets and the app's tokens
types/                 # In a TypeScript app: type definitions only, never code
```

- `views/` are the screens the router swaps in. An app with a single screen has no `views/`: the screen and its pieces live in `app/`.
- A piece lives in the folder of what renders it. A card only the job list draws is `views/job-list/card/`; once a second screen draws it, it moves to `common/card/`.
- Never name a code folder `types/` or `components/`. "Type" says what a folder holds, not where it belongs, and in a TypeScript project `types/` holds type definitions (see [Type definitions](#type-definitions)).
- `create-app` generates this layout.

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

## Components: files and shape

One convention for every component, in apps and in packages.

### Files

- A presentational component, with render methods only, is a folder whose `index.js` holds it.
- Once it gains logic (handlers, `create`, store wiring), its markup moves to `template.js` and `index.js` composes it. Callers import the folder's `index.js` either way, so the split never touches them.
- No `template.js` without an `index.js`, and no `index.js` that only forwards `template.js`.
- A second presentational component that shares the folder's stylesheet can live in `template.js` too, exported through `index.js`: `export { NotificationsPanel } from "./template.js"`.

### Shape

- A component is an object of methods, even with a single render: `export const Button = { render(props) { … } }`.
- `template.js` exports that object as `template`. `index.js` imports `{ template }` and spreads it.
- Renders are methods, never arrow functions: an arrow has no `this`.
- A render calls its siblings through `this` (`this.renderItem(props)`), so a type that spreads the component and overrides one renderer gets its override.
- `this` comes from the call, not the declaration: `Card.render(props)` has it; a bare `render(props)`, or a render passed as a callback, does not. Never call the template through the module from `index.js` (`template.render(props)`): `this` would be the template, and the type's overrides would be skipped.

A presentational component:

```javascript
// card/index.js
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

Consumers override one step with a spread:

```javascript
const MyCard = {
  ...Card,
  renderFooter(props) {
    return html`<footer>${props.footer}</footer>`;
  },
};
```

### The base renderer

When `index.js` defines `render(entity, api)`, it shadows the template's `render(props)`. So the template keeps its markup in a renderer named after the component, which `render` delegates to, and `index.js` calls that:

```javascript
// combobox/template.js
export const template = {
  render(props) {
    return this.renderCombobox(props);
  },
  renderCombobox(props) {
    return html`<div class="iw-combobox">
      ${this.renderControl(props)} ${this.renderDropdown(props)}
    </div>`;
  },
  renderControl(props) {
    // ...
  },
  renderDropdown(props) {
    // ...
  },
};
```

```javascript
// combobox/index.js
import * as handlers from "./handlers.js";
import { template } from "./template.js";

export const Combobox = {
  ...handlers,
  ...template,
  render(entity, api) {
    return this.renderCombobox({
      ...entity,
      onToggle: () => api.notify(`#${entity.id}:toggle`),
    });
  },
};
```

`render()` never calls `this.render()`. The same goes for any renderer `index.js` redefines with another signature, such as `renderHeader(entity, api)`: the template's version takes its own name (`renderNotificationsHeader(props)`).

### Props, not the store

- A template takes props: data, and events as `onX` callbacks such as `onChange`, `onClick` or `onToggle`. It never calls `api.notify`, `api.getEntity` or `api.select`; `index.js` reads the store and turns events into callbacks.
- A template takes `api` only to render child entities: `api.render("language")`.
- Base types that render their own entity, such as `AgGrid` or `VirtualList`, are the exception.
- A piece that reads the store but keeps nothing of its own is not an entity, and still gets the same split: `template.js` takes props, and `index.js` spreads it and defines `render(api)`, which reads what it needs and calls the base renderer through `this`. Its parent renders it with `Scoreboard.render(api)` rather than `api.render(id)`. Make it an entity only once it has state of its own.

  ```javascript
  // app/scoreboard/index.js
  import { template } from "./template.js"

  export const Scoreboard = { ...template, render }

  function render(api) {
    const debate = api.getEntity("debate")
    return this.renderScoreboard({
      memory: debate.memory,
      onRestart: () => api.notify("#debate:restart"),
    })
  }
  ```

- If true local component state is required, prefer a web component.

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
- Scope semantic/component tokens to theme classes (`.iw-theme-inglorious`, `.iw-theme-material-ui`, `.iw-theme-material-3`, `.iw-theme-bootstrap`, `.iw-theme-ios-18`, `.iw-theme-ios-26`) instead of `:root`.
- Scope mode overrides to combined classes (for example `.iw-theme-material-3.iw-theme-dark`).
- In Storybook, import all theme styles and switch the body/root class via globals toolbar.

This ensures theme switching actually changes component tokens.

## File-by-file guidance

### `template.js`

- Keep templates pure and side-effect free.
- Export `template`, an object of render methods taking props (see [Components: files and shape](#components-files-and-shape)).
- Add concise JSDoc typedef imports for props and payload types when useful.
- Render conditionally with `when(condition, () => html`...`, () => html`...`)` from `@inglorious/web/directives/when`, rather than `condition ? html`...` : nothing` or `condition && html`...``. Attribute values are the exception: `attr=${condition ? value : nothing}` keeps `nothing`, which removes the attribute.
- Extract sub-renderers (`renderHeader`, `renderBody`, `renderFooter`, `renderItem`, etc.) when template complexity grows.

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

- The type itself while it is presentational; the container layer once it has logic.
- Map store events to plain handler props passed into the template's base renderer.
- Re-export only selected helpers as part of the public API.

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

## Type definitions

In a TypeScript app, every type definition lives in the project's `types/` folder, one `.d.ts` file per subject, never in the code (see forge-best-practices):

- `types/index.d.ts`: the store's `AppEntity`, `AppState` and `AppApi`.
- One file per piece for its entity, its props and its renderers, such as `types/scoreboard.d.ts` with `ScoreboardProps` and `ScoreboardTemplate`.
- `template.js` types its object as `ScoreboardTemplate & ThisType<ScoreboardTemplate>`, so `this` knows its sibling renderers.

For published packages, add a typed public contract (for example `types/button.d.ts`) that matches runtime behavior:

- Entity interface with supported props and unions
- Type interface for `render` and handlers/sub-renderers
- Exported type declaration

## Migration notes

- Move each type from a flat structure into its own folder, where it belongs (see [App structure](#app-structure)).
- Split mixed files into `template.js`, style file, `handlers.js`, and `helpers.js` by responsibility, once the type has logic.
- Add `index.js` as the single public entry for the type.
- If the type uses BEM classes, rename to flat prefixed classes and nest selectors under the root class.
- If themes use `:root` component tokens, migrate them to theme-class scoping.
- If entities contain template/function fields, migrate those customizations to type composition and sub-renderer overrides.
- Update imports to target the new type entry, for example:
  - `import { Button } from "./app/button/index.js"`

## Pre-ship checklist

- Every type has its own folder.
- Code is grouped by where it belongs: the shell and its pieces in `app/`, routed screens in `views/`, shared pieces in `common/`. No code folder is named `types/` or `components/`.
- Every piece that reads the store has `index.js` (store wiring) and `template.js` (props only), whether or not it is an entity.
- In a TypeScript app, no code file declares an `interface` or a `type`: they are in `types/*.d.ts`.
- Every component is an object of render methods, never arrow functions, calling its siblings through `this`.
- A split component's `template.js` exports `template`, and its `index.js` calls the base renderer through `this`.
- Templates take props: store reads and notifications live in `index.js`.
- Styling mode is explicit (`style.module.css` for local types, `style.css` + prefix/tokens for reusable design-system types).
- Global component CSS avoids BEM and uses nested rules under one root selector.
- Theme tokens are class-scoped and Storybook theme switching updates class names.
- Stories are controls-friendly by default (single instance per args story).
- Tests verify both visual contract (DOM/classes) and behavior contract (events).
- Complex templates are decomposed into overridable sub-renderers.
- Stateful behavior is still wired through plain props; if true local state is needed, use a web component.


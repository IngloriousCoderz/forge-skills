---
name: ui
description: Design system guidance for components, theming, and UI primitives with Inglorious UI.
---

# @inglorious/ui - Complete Reference

## Installation

```bash
npm install @inglorious/ui
```

## Core Concepts

**Architecture:**

- Components are props-first: `Button.render(props)` returns markup, and interactions are callbacks (`onClick`, `onChange`) passed as props
- To bind a component to an entity, a type wraps its `render(entity, api)`, spreads the entity into props and turns callbacks into `api.notify()` calls
- Composite components are objects with overridable sub-renderers (`renderCell`, `renderHeader`, ...), so customizing one step is an object spread
- All styling via CSS custom properties (tokens)
- Multiple themes with light/dark variants

**Rules:**

- Components are stateless - state lives in entities via `@inglorious/store`
- Entities are pure data - no functions, just values
- Components never call `api.notify()` themselves; the type that wraps them does
- Handler logic lives in type definitions, not entities
- Import the base styles and a theme before component styles
- UI primitive conventions: [`skills/ui-best-practices/SKILL.md`](../ui-best-practices/SKILL.md)

## Basic Setup

### Import Base Styles and Theme

```javascript
import "@inglorious/ui/base.css"; // reset + tokens + safe-area insets
import "@inglorious/ui/themes/inglorious.css"; // or material.css, bootstrap.css
import "@inglorious/ui/button.css"; // one stylesheet per component...
import "@inglorious/ui/input.css";
// ...or everything at once: import "@inglorious/ui/all.css";
```

Every component has a matching `@inglorious/ui/<component>.css`, and each category has one too (`controls.css`, `data-display.css`, `feedback.css`, `layout.css`, `navigation.css`, `surfaces.css`). `tokens.css` alone is available, but `base.css` already includes it.

### Apply Theme Class

```html
<body class="iw-theme-inglorious">
  <!-- or iw-theme-material, iw-theme-bootstrap -->
  <!-- add iw-theme-dark or iw-theme-light for variant -->
</body>
```

## Component Usage

### Button

```javascript
import { Button } from "@inglorious/ui/button";

// Stateless: direct render
Button.render({
  children: "Click me",
  color: "primary",
  size: "lg",
  onClick: () => api.notify("save"),
});

// Bound to an entity: a type wraps the render and passes the callbacks,
// since functions never go in the entity
const types = {
  SubmitButton: {
    render(entity, api) {
      return Button.render({
        ...entity,
        onClick: () => api.notify(`#${entity.id}:click`),
      });
    },
    click(entity) {
      entity.isPressed = !entity.isPressed;
    },
  },
};

const entities = {
  submitBtn: {
    type: "SubmitButton",
    children: "Submit",
    color: "primary",
  },
};
```

**Button Properties:**

| Property      | Type                                                                                               | Default       | Description             |
| ------------- | -------------------------------------------------------------------------------------------------- | ------------- | ----------------------- |
| `children`    | `TemplateResult` \| `string` \| `number`                                                           | -             | Button content          |
| `variant`     | `"default"` \| `"outline"` \| `"ghost"`                                                            | `"default"`   | Visual style            |
| `color`       | `"default"` \| `"primary"` \| `"secondary"` \| `"success"` \| `"warning"` \| `"error"` \| `"info"` | `"default"`   | Color variant           |
| `size`        | `"sm"` \| `"md"` \| `"lg"`                                                                         | `"md"`        | Size                    |
| `shape`       | `"rectangle"` \| `"pill"` \| `"round"` \| `"square"`                                               | `"rectangle"` | Shape                   |
| `isDisabled`  | `boolean`                                                                                          | `false`       | Disabled state          |
| `isPressed`   | `boolean`                                                                                          | `false`       | Pressed state           |
| `isFullWidth` | `boolean`                                                                                          | `false`       | Full width              |
| `buttonType`  | `"button"` \| `"submit"` \| `"reset"` \| `"menu"`                                                  | `"button"`    | The `<button>`'s `type` |
| `onClick`     | `() => void`                                                                                       | -             | Click callback          |

`IconButton`, `ButtonGroup` and `Fab` are built on `Button` and share its `color`, including `"default"`.

The default color is neutral, unless the theme gives it its own tokens (`--iw-button-default-color`, `-bg`, `-bg-hover`, `-bg-active`, `-border`, `-text`). The Material theme makes it primary, as Material UI does, so set `color` only to depart from it.

### Other components worth knowing

- **Progress**: `variant` is `"linear"` or `"circular"`; both take `color`. Without a `value` it is indeterminate.
- **Tabs**: `value` picks the selected tab and defaults to the first; `value: null` selects none.
- **Table**: wide tables scroll horizontally by default. `isWrapping` wraps cell content to fit the container instead. Columns take `id`, `label` and `align`; rows are plain objects keyed by column id. To format or replace cells, override a step:

  ```javascript
  const MoneyTable = {
    ...Table,
    renderCell(props, payload) {
      const { column, row } = payload;
      if (!column.isMoney) return Table.renderCell(props, payload);

      return Table.renderCell(props, {
        ...payload,
        row: { ...row, [column.id]: formatMoney(row[column.id]) },
      });
    },
  };
  ```

- **Snackbar**: `position` is `"bottom-left"` (default), `"bottom-center"`, `"bottom-right"`, `"top-left"`, `"top-center"` or `"top-right"`; it stays clear of the system bars. Without `onClose` there is no close button. To keep a bottom snackbar above a bar the app keeps at the bottom (a `BottomNavigation`), set `--iw-snackbar-offset-bottom` to the bar's height on an ancestor while the bar shows.
- **Tooltip**: `onClick` is optional.

### Input

```javascript
import { Input } from "@inglorious/ui/input";

// Stateless
Input.render({
  label: "Email",
  inputType: "email",
  placeholder: "you@example.com",
  hint: "We'll never share your email",
  onChange: (value) => api.notify("#signup:emailChange", value),
});

// Bound to an entity, with validation
const types = {
  EmailInput: {
    render(entity, api) {
      return Input.render({
        ...entity,
        onChange: (value) => api.notify(`#${entity.id}:change`, value),
      });
    },
    change(entity, value) {
      entity.value = value;
      entity.error = value.includes("@") ? null : "Invalid email";
    },
  },
};

const entities = {
  emailInput: {
    type: "EmailInput",
    label: "Email",
    inputType: "email",
    value: "",
    error: null,
  },
};
```

**Input Properties:**

| Property      | Type                                                                | Default  | Description                            |
| ------------- | ------------------------------------------------------------------- | -------- | -------------------------------------- |
| `id`          | `string`                                                            | -        | Ties the label and message to the input; see [Form Controls](#form-controls-labels-ids-and-messages) |
| `name`        | `string`                                                            | -        | Form field name; used as id if no `id` |
| `label`       | `string`                                                            | -        | Label text                             |
| `inputType`   | `"text"` \| `"email"` \| `"password"` \| `"number"` \| `"date"` \| etc. | `"text"` | The `<input>`'s `type`             |
| `value`       | `string`                                                            | `""`     | Current value                          |
| `placeholder` | `string`                                                            | -        | Placeholder text                       |
| `hint`        | `string`                                                            | -        | Helper text                            |
| `error`       | `string`                                                            | -        | Error message; sets `aria-invalid`     |
| `size`        | `"sm"` \| `"md"` \| `"lg"`                                          | `"md"`   | Size                                   |
| `isDisabled`  | `boolean`                                                           | `false`  | Disabled state                         |
| `isReadOnly`  | `boolean`                                                           | `false`  | Read-only state                        |
| `isRequired`  | `boolean`                                                           | `false`  | Required field                         |
| `isFullWidth` | `boolean`                                                           | `false`  | Full width                             |
| `icon`        | `string`                                                            | -        | Icon before input                      |
| `iconAfter`   | `string`                                                            | -        | Icon after input                       |
| `onChange`    | `(value: string) => void`                                           | -        | Called on every keystroke              |

`type` is reserved for the entity's type, which is why the input's own type is `inputType`.

### Form Controls: Labels, Ids and Messages

Every form control works without an `id`, but an `id` gets you more:

- **Checkbox, Switch, RadioGroup** wrap their input in its label, so clicking the label always works, with or without an `id`.
- **Input, Select, Textarea, Slider, FileUpload, Combobox** put the label beside the control. With an `id` (or a `name`, for all but Combobox) the label is tied to the control: clicking it focuses the control. Without one, the control takes a plain-text label as its `aria-label`, so it is still announced, but clicking the label does nothing.
- With an `id`, the hint or error gets the id `<id>-message` and the control points at it with `aria-describedby`.
- `aria-invalid` is always stated, `"true"` or `"false"`, rather than left out.
- **RadioGroup** needs a `name` or an `id`. Radios are grouped by their shared name, falling back to the `id`; each option gets the id `<name-or-id>-<index>`.

A control bound to an entity (`...entity` in the props) always has the entity's id, so this matters mostly for stateless renders.

### Card

```javascript
import { Card } from "@inglorious/ui/card";

// Basic card
Card.render({
  title: "Card Title",
  subtitle: "Card description",
  children: html`<p>Body content</p>`,
  footer: Button.render({ children: "Open" }),
});

// Interactive card bound to an entity
const types = {
  ProductCard: {
    render(entity, api) {
      return Card.render({
        ...entity,
        isHoverable: true,
        isClickable: true,
        onClick: () => api.notify(`#${entity.id}:click`),
      });
    },
    click(entity, payload, api) {
      api.notify("#router:navigate", `/products/${entity.productId}`);
    },
  },
};

const entities = {
  productCard: {
    type: "ProductCard",
    productId: 123,
    title: "Product Name",
    subtitle: "$99.99",
  },
};
```

**Card Properties:**

| Property                                       | Type                                     | Default     | Description                                                      |
| ---------------------------------------------- | ---------------------------------------- | ----------- | ---------------------------------------------------------------- |
| `title`                                        | `TemplateResult` \| `string` \| `number` | -           | Card title                                                       |
| `subtitle`                                     | `TemplateResult` \| `string` \| `number` | -           | Card subtitle                                                    |
| `header`                                       | `TemplateResult` \| `string` \| `number` | -           | Custom header, in place of title and subtitle                    |
| `children` / `body`                            | `TemplateResult` \| `string` \| `number` | -           | Body content                                                     |
| `footer`                                       | `TemplateResult` \| `string` \| `number` | -           | Footer content                                                   |
| `headerPadding`, `bodyPadding`, `footerPadding` | `"none"` \| `"sm"` \| `"md"` \| `"lg"` \| `"xl"` | -   | Section padding                                                  |
| `element`                                      | `"article"` \| `"section"` \| `"div"` \| ... | `"article"` | Root element                                                  |
| `isHoverable`                                  | `boolean`                                | `false`     | Hover effects                                                    |
| `isClickable`                                  | `boolean`                                | `false`     | Clickable cursor                                                 |
| `isFullWidth`                                  | `boolean`                                | `false`     | Full width                                                       |
| `onClick`                                      | `() => void`                             | -           | Click callback                                                   |

`Card` is a composite: override `renderHeader`, `renderBody` or `renderFooter` with an object spread to change one section.

### Icon

Icons come from any [Iconify](https://icon-sets.iconify.design/) set, drawn as inline SVG: no icon font, and only imported icons are bundled.

```javascript
import { Icon } from "@inglorious/ui/icon";
import arrowBack from "@iconify-icons/material-symbols/arrow-back";
import settingsOutline from "@iconify-icons/material-symbols/settings-outline";
import user from "@iconify-icons/fa7-solid/user";

Icon.render({ icon: settingsOutline, size: "lg" });
Icon.render({ icon: arrowBack, direction: api.getEntity("i18n").dir }); // mirrored in RTL
Icon.render({ icon: user, label: "Account" }); // meaningful on its own
Icon.render({ children: "★" }); // a glyph instead
```

- Install the set in the app (`@iconify-icons/material-symbols`, `@iconify-icons/fa7-solid` / `fa7-regular` / `fa7-brands`, `@iconify-icons/lucide`, …).
- The variant is in the name: Material Symbols' plain name is filled, `-outline` outlined, plus `-rounded` / `-sharp`.
- Icon data (`{ width, height, body }`) is plain data, fine in entities and option lists.
- Decorative unless `label` is set. There is no `MaterialIcon` and no icon font to load.

## Theming

### Available Themes

| Theme        | Description                                                      |
| ------------ | ---------------------------------------------------------------- |
| `inglorious` | Neon/videogame aesthetic (default dark)                          |
| `material`   | Material UI inspired: primary default buttons, capitalized medium-weight labels on buttons and tabs, grey default chips |
| `bootstrap`  | Bootstrap inspired                                               |

### Theme Variants

```html
<!-- Inglorious theme (dark by default) -->
<body class="iw-theme-inglorious">
  <!-- Inglorious light variant -->
  <body class="iw-theme-inglorious iw-theme-light">
    <!-- Material dark variant -->
    <body class="iw-theme-material iw-theme-dark"></body>
  </body>
</body>
```

### CSS Tokens

```css
:root {
  /* Colors */
  --iw-color-primary: ...;
  --iw-color-bg: ...;
  --iw-color-text: ...;

  /* Spacing */
  --iw-space-1: 0.25rem;
  --iw-space-2: 0.5rem;
  /* ... */

  /* Radii */
  --iw-radius-sm: 2px;
  --iw-radius-md: 4px;
  /* ... */

  /* Typography */
  --iw-font-size-base: 1rem;
  --iw-font-weight-medium: 500;
  /* ... */
}
```

### Label Tokens

Buttons (and everything built on them) and tabs read three tokens for their labels. They default to `none`, `normal` and the normal font weight; the Material theme sets them as Material UI does:

```css
.iw-theme-material {
  --iw-label-text-transform: uppercase;
  --iw-label-letter-spacing: 0.02857em;
  --iw-label-font-weight: var(--iw-font-weight-medium);
}
```

Override them on a theme class, or on any ancestor, to change it. Bottom-navigation labels, menu items and accordion headers do not read them.

### Chip Token

A default `Chip`'s background is `--iw-chip-bg`, falling back to `--iw-color-bg-secondary`. The Material theme sets it to a tint of the text color, so chips show on white cards and tables.

### Component Tokens

Each theme defines component-specific tokens:

```css
:root {
  /* Button tokens */
  --iw-button-bg: var(--iw-color-primary);
  --iw-button-radius: var(--iw-radius-none);
  --iw-button-shadow: none;
  --iw-button-shadow-hover: 0 0 10px var(--iw-color-primary);

  /* Input tokens */
  --iw-input-bg: var(--iw-color-bg);
  --iw-input-border: var(--iw-color-border);
  --iw-input-radius: var(--iw-radius-none);
  --iw-input-shadow-focus: 0 0 10px rgba(0, 255, 136, 0.3);

  /* Card tokens */
  --iw-card-bg: var(--iw-color-surface);
  --iw-card-radius: var(--iw-radius-none);
  --iw-card-shadow: var(--iw-shadow-lg);
}
```

## Creating Custom Types

Types are the building blocks of Inglorious Web. What makes a type a "component" is the presence of a `render` method.

### Directory Structure

```
src/components/my-component/
├── index.js           # Exports the type (render + optional handlers/helpers)
├── template.js        # The render function
├── style.css         # Component styles
├── my-component.stories.js  # Storybook stories
├── template.test.js  # Vitest tests (optional)
├── handlers.js       # Event handlers (optional)
└── helpers.js        # Helper functions (optional)
```

### Best Practices

1. **template.js** - Contains only the `render(props)` function that returns a TemplateResult
2. **style.css** - Uses CSS custom properties for theming (`--iw-*` tokens)
3. **index.js** - Exports only the `render` function (or render + handlers/helpers)
4. **handlers.js** - Optional. Only needed if the type has default event behavior
5. **helpers.js** - Optional. Pure utility functions used by the type

### template.js

```javascript
/** @typedef {import('../../../types/my-component').MyComponentProps} MyComponentProps */
/** @typedef {import('@inglorious/web').TemplateResult} TemplateResult */

import { html, nothing } from "@inglorious/web";
import { classMap } from "@inglorious/web/directives/class-map";

/**
 * @param {MyComponentProps} props
 * @returns {TemplateResult}
 */
export function render(props) {
  const { id, title, variant = "default", onClick } = props;

  const classes = {
    "iw-my-component": true,
    [`iw-my-component-${variant}`]: variant !== "default",
  };

  return html`
    <div id=${id || nothing} class=${classMap(classes)} @click=${onClick}>
      ${title}
    </div>
  `;
}
```

Bind an optional attribute to `nothing` when it has no value, so it is left off. An empty `id=""` is invalid HTML, and an empty `for=""` on a label points at nothing, which breaks even a label that wraps its input.

### style.css

Use CSS custom properties for all theming, flat `iw-` class names, and nest everything under the root class:

```css
.iw-my-component {
  padding: var(--iw-space-2) var(--iw-space-4);
  background-color: var(--iw-color-primary);
  border-radius: var(--iw-radius-md);

  &.iw-my-component-secondary {
    background-color: var(--iw-color-secondary);
  }
}
```

Give child elements their own class (`iw-my-component-input`) rather than reusing the root's. A child that also matches the root rule picks up the root's custom properties too, which silently overrides whatever a modifier set on the root.

### index.js

```javascript
import * as renderers from "./template.js";

export const MyComponent = { ...renderers };
```

If the type has event handlers:

```javascript
import * as renderers from "./template.js";
import * as handlers from "./handlers.js";

export const MyComponent = { ...renderers, ...handlers };
```

If the type exposes helper functions too:

```javascript
import * as renderers from "./template.js";
import * as handlers from "./handlers.js";
import * as helpers from "./helpers.js";

export const MyComponent = { ...renderers, ...handlers };

export const { helper1, helper2 } = helpers;
```

### template.test.js

Use `@inglorious/web/test` for testing:

```javascript
import { describe, it, expect } from "vitest";
import { render } from "@inglorious/web/test";
import { render as renderTemplate } from "./template.js";

describe("MyComponent", () => {
  describe("render", () => {
    it("renders with title", () => {
      const container = document.createElement("div");

      render(renderTemplate({ title: "Hello" }), container);

      expect(container.textContent).toContain("Hello");
    });

    it("leaves off an id it was not given", () => {
      const container = document.createElement("div");

      render(renderTemplate({ title: "Hello" }), container);

      const div = container.querySelector(".iw-my-component");
      expect(div.hasAttribute("id")).toBe(false);
    });
  });

  describe("click handler", () => {
    it("calls onClick", () => {
      let clicked = false;
      const container = document.createElement("div");

      render(
        renderTemplate({ title: "Click me", onClick: () => (clicked = true) }),
        container,
      );
      container.querySelector(".iw-my-component").click();

      expect(clicked).toBe(true);
    });
  });
});
```

jsdom only runs a label's click-through to its control when the label is in the document, so append the container to `document.body` before testing it (and remove it afterwards).

To test the store wiring of a type that wraps the component, render the type with `createMockApi` from `@inglorious/web/test` and assert on `api.getEvents()`.

### \*.stories.js

Use `@inglorious/web/test` for Storybook stories:

```javascript
import { render } from "@inglorious/web/test";
import { render as renderTemplate } from "./template.js";

export default {
  title: "Components/MyComponent",
  tags: ["autodocs"],
  argTypes: {
    title: { control: "text" },
    variant: {
      control: "select",
      options: ["default", "primary", "secondary"],
    },
  },
};

const Template = (args) => {
  const container = document.createElement("div");
  render(renderTemplate(args), container);
  return container;
};

export const Default = Template.bind({});
Default.args = {
  title: "My Component",
  variant: "default",
};
```

## Exports

```javascript
// Components
import { Button } from "@inglorious/ui/button";
import { Input } from "@inglorious/ui/input";
import { Card } from "@inglorious/ui/card";

// CSS (import in your app)
import "@inglorious/ui/base.css";
import "@inglorious/ui/themes/inglorious.css";
import "@inglorious/ui/themes/material.css";
import "@inglorious/ui/themes/bootstrap.css";
import "@inglorious/ui/all.css"; // every component
import "@inglorious/ui/button.css";
import "@inglorious/ui/input.css";
import "@inglorious/ui/card.css";
```

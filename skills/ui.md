# @inglorious/ui - Complete Reference

## Installation

```bash
npm install @inglorious/ui
```

## Core Concepts

**Architecture:** Render-function components that integrate seamlessly with `@inglorious/web`.

- Components are plain objects with a `render(entity, api)` method
- Two invocation patterns: direct render or via `api.render()`
- All styling via CSS custom properties (tokens)
- Multiple themes with light/dark variants

**Rules:**

- Components are stateless - state lives in entities via `@inglorious/store`
- Entities are pure data - no functions, just values
- Templates always dispatch events via `api.notify()`
- Handler logic lives in type definitions, not entities
- Import CSS tokens and themes before component styles
- UI primitive conventions: `ui-best-practices.md`

## Basic Setup

### Import Tokens and Theme

```javascript
import "@inglorious/ui/tokens"; // CSS custom properties
import "@inglorious/ui/themes/inglorious"; // or material, bootstrap
import "@inglorious/ui/button.css";
import "@inglorious/ui/input.css";
```

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
Button.render(
  {
    label: "Click me",
    variant: "primary",
    size: "lg",
  },
  api,
);

// Stateful: define type with handler
const types = {
  Button: {
    ...Button,
    click(entity, payload, api) {
      console.log(`${entity.id} clicked!`);
    },
  },
};

const entities = {
  submitBtn: {
    type: "Button",
    label: "Submit",
    variant: "default",
  },
};

// In render: api.render("submitBtn")
```

**Button Properties:**

| Property    | Type                                                                                | Default     | Description       |
| ----------- | ----------------------------------------------------------------------------------- | ----------- | ----------------- |
| `label`     | `string`                                                                            | -           | Button text       |
| `variant`   | `"default"` \| `"outline"` \| `"ghost"`                                             | `"default"` | Visual style      |
| `color`     | `"primary"` \| `"secondary"` \| `"success"` \| `"warning"` \| `"error"` \| `"info"` | `"primary"` | Color variant     |
| `size`      | `"sm"` \| `"md"` \| `"lg"`                                                          | `"md"`      | Size              |
| `disabled`  | `boolean`                                                                           | `false`     | Disabled state    |
| `fullWidth` | `boolean`                                                                           | `false`     | Full width        |
| `icon`      | `string`                                                                            | -           | Icon before label |
| `iconAfter` | `string`                                                                            | -           | Icon after label  |

### Input

```javascript
import { Input } from "@inglorious/ui/input";

// Stateless
Input.render(
  {
    label: "Email",
    type: "email",
    placeholder: "you@example.com",
    hint: "We'll never share your email",
  },
  api,
);

// Stateful with validation
const types = {
  Input: {
    ...Input,
    change(entity, value, api) {
      entity.value = value;
      entity.error = value.includes("@") ? null : "Invalid email";
    },
  },
};

const entities = {
  emailInput: {
    type: "Input",
    label: "Email",
    value: "",
    error: null,
  },
};
```

**Input Properties:**

| Property      | Type                                                        | Default  | Description       |
| ------------- | ----------------------------------------------------------- | -------- | ----------------- |
| `label`       | `string`                                                    | -        | Label text        |
| `type`        | `"text"` \| `"email"` \| `"password"` \| `"number"` \| etc. | `"text"` | Input type        |
| `value`       | `string`                                                    | `""`     | Current value     |
| `placeholder` | `string`                                                    | -        | Placeholder text  |
| `hint`        | `string`                                                    | -        | Helper text       |
| `error`       | `string`                                                    | -        | Error message     |
| `size`        | `"sm"` \| `"md"` \| `"lg"`                                  | `"md"`   | Size              |
| `disabled`    | `boolean`                                                   | `false`  | Disabled state    |
| `required`    | `boolean`                                                   | `false`  | Required field    |
| `icon`        | `string`                                                    | -        | Icon before input |
| `iconAfter`   | `string`                                                    | -        | Icon after input  |

### Card

```javascript
import { Card } from "@inglorious/ui/card";

// Basic card
Card.render(
  {
    title: "Card Title",
    subtitle: "Card description",
  },
  api,
);

// Interactive card
const types = {
  Card: {
    ...Card,
    click(entity, payload, api) {
      api.notify("#router:navigate", "/products/123");
    },
  },
};

const entities = {
  productCard: {
    type: "Card",
    title: "Product Name",
    subtitle: "$99.99",
    hoverable: true,
    clickable: true,
  },
};
```

**Card Properties:**

| Property    | Type             | Default | Description      |
| ----------- | ---------------- | ------- | ---------------- |
| `title`     | `string`         | -       | Card title       |
| `subtitle`  | `string`         | -       | Card subtitle    |
| `hoverable` | `boolean`        | `false` | Hover effects    |
| `clickable` | `boolean`        | `false` | Clickable cursor |
| `fullWidth` | `boolean`        | `false` | Full width       |
| `header`    | `TemplateResult` | -       | Custom header    |
| `footer`    | `TemplateResult` | -       | Footer content   |

## Theming

### Available Themes

| Theme        | Description                             |
| ------------ | --------------------------------------- |
| `inglorious` | Neon/videogame aesthetic (default dark) |
| `material`   | Material Design inspired                |
| `bootstrap`  | Bootstrap inspired                      |

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

1. **template.js** - Contains only the `render` function that returns a TemplateResult
2. **style.css** - Uses CSS custom properties for theming (`--iw-*` tokens)
3. **index.js** - Exports only the `render` function (or render + handlers/helpers)
4. **handlers.js** - Optional. Only needed if the type has default event behavior
5. **helpers.js** - Optional. Pure utility functions used by the type

### template.js

```javascript
/** @typedef {import('../../../types/my-component').MyComponentEntity} MyComponentEntity */
/** @typedef {import('@inglorious/web').Api} Api */
/** @typedef {import('@inglorious/web').TemplateResult} TemplateResult */

import { classMap, html } from "@inglorious/web";

export function render(entity, api) {
  const { title, variant = "default" } = entity;

  const classes = {
    "iw-my-component": true,
    [`iw-my-component--${variant}`]: variant !== "default",
  };

  return html`
    <div
      class=${classMap(classes)}
      @click=${() => api.notify(`#${entity.id}:click`)}
    >
      ${title}
    </div>
  `;
}
```

### style.css

Use CSS custom properties for all theming:

```css
.iw-my-component {
  padding: var(--iw-space-2) var(--iw-space-4);
  background-color: var(--iw-color-primary);
  border-radius: var(--iw-radius-md);
}

.iw-my-component--variant {
  background-color: var(--iw-color-secondary);
}
```

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
import { createMockApi, render } from "@inglorious/web/test";
import { render as renderTemplate } from "./template.js";

describe("MyComponent", () => {
  describe("render", () => {
    it("renders with title", () => {
      const entity = { id: "test", title: "Hello" };
      const api = createMockApi({ [entity.id]: entity });
      const container = document.createElement("div");

      render(renderTemplate(entity, api), container);

      expect(container.textContent).toContain("Hello");
    });
  });

  describe("click handler", () => {
    it("dispatches click event", () => {
      const entity = { id: "test", title: "Click me" };
      const api = createMockApi({ [entity.id]: entity });
      const container = document.createElement("div");

      render(renderTemplate(entity, api), container);

      const div = container.querySelector(".iw-my-component");
      div.click();

      expect(api.getEvents()).toEqual([
        { type: "#test:click", payload: undefined },
      ]);
    });
  });
});
```

### \*.stories.js

Use `@inglorious/web/test` for Storybook stories:

```javascript
import { createMockApi, render } from "@inglorious/web/test";
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
  const entity = { id: "story-component", ...args };
  const api = createMockApi(entity);
  render(renderTemplate(entity, api), container);
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
import "@inglorious/ui/tokens";
import "@inglorious/ui/themes/inglorious";
import "@inglorious/ui/themes/material";
import "@inglorious/ui/themes/bootstrap";
import "@inglorious/ui/button.css";
import "@inglorious/ui/input.css";
import "@inglorious/ui/card.css";
```

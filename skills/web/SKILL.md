---
name: web
description: Web UI architecture reference for @inglorious/web, including render patterns and routing.
---

# @inglorious/web - Complete Reference

## Installation

```bash
npm install @inglorious/web
```

## Companion Guide

- For file structure, styling, theming, stories, and test conventions for web UI types, see `skills/web-best-practices/SKILL.md`.

## Core Concepts

**Architecture:** Re-render everything → let lit-html update only what changed.

- No signals, proxies, or compilers
- Explicit state transitions
- All state lives in the store, never in components

**Rules:**

- ALWAYS use `api.notify()` for state changes - Direct mutations won't trigger re-renders
- NEVER store state in component closures - All state must be in entities
- Event handlers are called with `(entity, payload, api)` - You can omit unused parameters in the function definition
- Mutations inside handlers are safe - Store uses Mutative for immutability

## Basic Setup

### Store Definition

```javascript
import { createStore } from "@inglorious/store";
import { html } from "@inglorious/web";

const types = {
  Counter: {
    // Handler with only entity (payload and api are passed but can be omitted)
    increment(entity) {
      entity.value++;
    },

    // Handler with entity and payload
    set(entity, newValue) {
      entity.value = newValue;
    },

    // Handler with all three parameters
    reset(entity, _, api) {
      api.notify(`#${entity.id}:set`, 0);
    },

    render(entity, api) {
      return html`
        <div>
          <span>Count: ${entity.value}</span>
          <button @click=${() => api.notify(`#${entity.id}:increment`)}>
            +1
          </button>
        </div>
      `;
    },
  },
};

const entities = {
  counter1: { type: "Counter", value: 0 },
};

export const store = createStore({ types, entities });
```

## Event Scopes

Event names determine which entities receive a handler:

- `"event"` - broadcast to all entities with that handler
- `"type:event"` - only entities of that type
- `"#entityId:event"` - only the entity with that id

```javascript
api.notify("save"); // broadcast
api.notify("Chart:refresh"); // only chart entities
api.notify("#chart1:refresh"); // only chart1
```

### Mounting

```javascript
import { mount, html } from "@inglorious/web";
import { store } from "./store.js";

const renderApp = (api) => {
  return html`
    <h1>App</h1>
    ${api.render("counter1")}
  `;
};

mount(store, renderApp, document.getElementById("root"));
```

## Auto-Creating Entities

`autoCreateEntities: true` creates one entity per type automatically, so you can omit the `entities` object for most apps. Optional initialization happens in the `create()` handler.

```javascript
const types = {
  Header: {
    create(entity) {
      entity.title = "Welcome";
    },
    render(entity) {
      return html`<header>${entity.title}</header>`;
    },
  },
};

const store = createStore({
  types,
  autoCreateEntities: true,
});
```

If you need multiple instances of the same component (e.g., four charts), define them explicitly in `entities`:

```javascript
const entities = {
  chart1: { type: "Chart" },
  chart2: { type: "Chart" },
  chart3: { type: "Chart" },
  chart4: { type: "Chart" },
};

const store = createStore({ types, entities });
```

## Type Composition

Types are composable as arrays of behaviors:

```javascript
const logging = (type) => ({
  render(entity, api) {
    console.log(`Rendering ${entity.id}`);
    return type.render(entity, api);
  },
});

const types = {
  LoggingCounter: [Counter, logging],
};
```

## Built-in Components

### Compass

```javascript
import { Compass } from "@inglorious/web/compass";

const types = { Compass };
const entities = { compass: { type: "Compass" } };
```

The `Compass` type keeps device orientation and heading state in the store.

**Entity state:**

- `isSupported` — whether device orientation sensors are available
- `isLoading` — whether permission or heading data is pending
- `isCompassPermissionGranted` — whether permission has been granted
- `isCompassActive` — whether a valid heading is currently active
- `heading` — latest heading in degrees, or `null`
- `error` — latest normalized `{ code, message }`
- `manualOffset` — optional heading offset in degrees

**Events:**

- `compassPermissionsRequest` — request compass permission when needed
- `compassWatch` — start listening for orientation events
- `compassUnwatch` — stop listening

```javascript
api.notify("compassPermissionsRequest");
api.notify("compassWatch");
api.notify("compassUnwatch");
```

### Form

```javascript
import {
  Form,
  getFieldValue,
  getFieldError,
  isFieldTouched,
} from "@inglorious/web/form";

const types = { Form };
const entities = {
  loginForm: {
    type: "Form",
    initialValues: { username: "", password: "" },
  },
};
```

**Events:**

- `#<id>:fieldChange` - Set field value (payload: `{ path, value, validate? }`)
- `#<id>:fieldBlur` - Mark field touched (payload: `{ path, validate? }`)
- `#<id>:fieldArrayAppend|fieldArrayRemove|fieldArrayInsert|fieldArrayMove` - Manipulate array fields
- `#<id>:reset` - Reset to `initialValues`
- `#<id>:validate` - Sync validation (payload: `{ validate }`)
- `#<id>:validateAsync` - Async validation (payload: `{ validate }`)
- `#<id>:submit` - Typically handled by your own `submit` handler (if you add one)

# <<<<<<< Updated upstream

### Geolocation

```javascript
import { Geolocation } from "@inglorious/web/geolocation";

const types = { Geolocation };
const entities = { geolocation: { type: "Geolocation" } };
```

The `Geolocation` type keeps browser location state in the store.

**Entity state:**

- `isSupported` — whether `navigator.geolocation` is available
- `isLoading` — whether a current request or first watch result is pending
- `isWatching` — whether a geolocation watch is active
- `position` — latest normalized `{ coords, timestamp }`
- `error` — latest normalized `{ code, message }`
- `watchId` — active browser watch ID or `null`

**Events:**

- `geolocationRequest` — request the current position once
- `geolocationWatch` — start watching position updates
- `geolocationUnwatch` — stop the active watch

```javascript
api.notify("geolocationRequest", {
  enableHighAccuracy: true,
  timeout: 5000,
});
api.notify("geolocationWatch");
api.notify("geolocationUnwatch");
```

> > > > > > > Stashed changes

### Router

```javascript
import { Router, setRoutes } from "@inglorious/web/router";

const types = { Router, HomePage, UserPage, NotFoundPage };
const entities = { router: { type: "Router" } };

setRoutes({
  "/": "homePage",
  "/users/:id": "userPage",
  "*": "notFoundPage",
});

const renderApp = (api) => {
  const { route } = api.getEntity("router");
  return html`
    <nav><a href="/">Home</a></nav>
    <main>${route ? api.render(route) : ""}</main>
  `;
};

// Navigation
api.notify("#router:navigate", "/users/456");
api.notify("#router:navigate", { to: "/users/456", replace: true });
```

### Route Guards

```javascript
const requireAuth = (type) => ({
  routeChange(entity, payload, api) {
    if (payload.route !== entity.type) return;
    const user = localStorage.getItem("user");
    if (!user) {
      api.notify("#router:navigate", { to: "/login", replace: true });
      return;
    }
    type.routeChange?.(entity, payload, api);
  },
});

const types = {
  AdminPage: [AdminPageBase, requireAuth],
};
```

## Selectors

Use `api.select(selector)` to run selector functions against the current state. This allows selectors to be named naturally and facilitates access to data from any entity during render.

```javascript
// 1. Define selectors (pure functions)
const count = (state) => state.counter1.value;
const userRole = (state) => state.session.role; // Accessing a different entity ('session')

// 2. Use in render
const page = {
  render(entity, api) {
    const currentCount = api.select(count);
    const role = api.select(userRole);

    return html`
      <div>
        <p>Count: ${currentCount}</p>

        ${role === "admin"
          ? html`<button @click=${() => api.notify("adminPage:action")}>
              Admin Panel
            </button>`
          : html`<span>Standard User</span>`}
      </div>
    `;
  },
};
```

**Benefits:**

- Simpler API: `api.select(value)` instead of `value(api.getEntities())`
- Natural naming: Selectors can be named `value` instead of `selectValue`
- Cleaner code: Less verbose than manually calling selectors with state

### Derived state with `compute`

Use `compute(fn, inputs)` when your derived value depends on one or more state selectors.

```javascript
import { compute } from "@inglorious/store";

const fullName = compute(
  (firstName, lastName) => `${firstName} ${lastName}`,
  [({ user }) => user.firstName, ({ user }) => user.lastName],
);

const page = {
  render(entity, api) {
    const displayName = api.select(fullName);
    return html`<div>Hello ${displayName}</div>`;
  },
};
```

## Testing

```javascript
import { html } from "@inglorious/web";
import { trigger, render } from "@inglorious/web/test";

const Counter = {
  increment(entity, payload) {
    entity.value += payload.amount;
  },
  render(entity) {
    return html`<div>Count: ${entity.value}</div>`;
  },
};

// Test handlers
const { entity, events } = trigger(
  { type: "Counter", id: "counter1", value: 10 },
  Counter.increment,
  { amount: 5 },
);
expect(entity.value).toBe(15);

// Test rendering
const template = Counter.render(
  { id: "counter1", value: 42 },
  { notify: jest.fn() },
);
const root = document.createElement("div");
render(template, root);
expect(root.textContent).toContain("Count: 42");
```

## Redux DevTools

```javascript
import { createDevtools } from "@inglorious/store/client/devtools";

const middlewares = [];
if (import.meta.env.DEV) {
  middlewares.push(createDevtools().middleware);
}

export const store = createStore({ types, entities, middlewares });
```

## API Reference

### `mount(store, renderFn, element)`

Connect store to DOM. Returns unsubscribe function.

### `api` Object Methods

- `api.render(id)` - Render entity by id
- `api.getEntity(id)` - Get entity state (read-only snapshot)
- `api.getEntities()` - Get all entities (read-only snapshot)
- `api.select(selector)` - Run selector function against current state
- `api.notify(event, payload)` - Dispatch event (preferred method)
- `api.dispatch(action)` - Dispatch raw event object (Redux-compatible)
- `api.getTypes()` - Get all type definitions
- `api.getType(name)` - Get specific type

**Rules:**

- ALWAYS use `api.notify()` for state changes - Format: `api.notify("#id:event", payload)`
- `api.getEntity()` returns read-only - Mutations won't trigger re-renders
- Event targeting: `"event"` (all), `"type:event"` (type), `"#id:event"` (specific entity)
- Mutations inside event handlers are safe - Store handles immutability automatically

### Exports

```javascript
// store
import { createStore } from "@inglorious/store";

// store extras
import { createDevtools } from "@inglorious/store/client/devtools";
import { compute, createSelector } from "@inglorious/store/select";
export { createMockApi, trigger } from "@inglorious/store/test";

// web
import { mount, html, svg } from "@inglorious/web";

// web directives
import { choose } from "@inglorious/web/directives/choose";
import { classMap } from "@inglorious/web/directives/class-map";
import { ref } from "@inglorious/web/directives/ref";
import { repeat } from "@inglorious/web/directives/repeat";
import { styleMap } from "@inglorious/web/directives/style-map";
import { unsafeHTML } from "@inglorious/web/directives/unsafe-html";
import { when } from "@inglorious/web/directives/when";

// built-in primitives
import { Compass } from "@inglorious/web/compass";
import {
  Form,
  getFieldError,
  getFieldValue,
  isFieldTouched,
} from "@inglorious/web/form";
import { Geolocation } from "@inglorious/web/geolocation";
import { Router } from "@inglorious/web/router";

// web extras
import { render } from "@inglorious/web/test";
```

## Common Pitfalls

### ❌ Wrong: Direct mutation outside handler

```javascript
const types = {
  Counter: {
    render(entity, api) {
      // Wrong - mutation outside handler won't trigger re-render
      entity.value++;
      return html`<div>${entity.value}</div>`;
    },
  },
};
```

### ✅ Correct: Use api.notify() in event handlers

```javascript
const types = {
  Counter: {
    increment(entity) {
      entity.value++; // Correct - mutation in handler
    },
    render(entity, api) {
      return html`
        <div>${entity.value}</div>
        <button @click=${() => api.notify(`#${entity.id}:increment`)}>+</button>
      `;
    },
  },
};
```

### ❌ Wrong: Storing state in closures

```javascript
// Wrong - state in closure, not in entity
let count = 0;
const types = {
  Counter: {
    render() {
      return html`<div>${count}</div>`; // Wrong - won't trigger re-render
    },
  },
};
```

### ✅ Correct: Store state in entities

```javascript
const entities = {
  counter1: { type: "Counter", value: 0 }, // Correct - state in entity
};
const types = {
  Counter: {
    render(entity) {
      return html`<div>${entity.value}</div>`; // Correct - triggers re-render
    },
  },
};
```


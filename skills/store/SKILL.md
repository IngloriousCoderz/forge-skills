---
name: store
description: Entity-based state management reference for @inglorious/store.
---

# @inglorious/store - Complete Reference

## Installation

```bash
npm install @inglorious/store
```

## Core Concepts

A Redux-compatible, ECS-inspired state library that eliminates boilerplate while keeping state transitions explicit and predictable.

**Redux Compatibility:**

- ✅ Compatible with `react-redux` Provider/useSelector/useDispatch
- ✅ Compatible with Redux DevTools
- ✅ Compatible with Redux-style `dispatch({ type, payload })`
- ⚠️ Redux middlewares (Redux-Saga, Redux-Thunk) may require adaptation
- ⚠️ Prefer `api.notify()` for event-driven updates (cleaner API)

### Where the store runs

`@inglorious/store` is a standalone state library. Use it on its own, or in a React application
just like Redux. `@inglorious/react-store` provides native bindings (`useEntity`, `useNotify`)
if you'd rather not go through `react-redux`.

It is also the backbone of `@inglorious/web`, `@inglorious/engine` and `@inglorious/server`, so
building on one of those gets you a store without asking for one.

## Basic Setup

```javascript
import { createStore } from "@inglorious/store";

const types = {
  Counter: {
    increment(entity) {
      entity.value++;
    },
  },
};

const entities = {
  counter1: { type: "Counter", value: 0 },
};

const store = createStore({ types, entities });
```

## Event Handlers

Handlers are called with: `entity`, `payload`, `api` (you can omit unused parameters).

```javascript
const types = {
  Tasks: {
    taskAdd(entity, text, api) {
      entity.items.push({ id: Date.now(), text });
      api.notify("taskCountChange", { count: entity.items.length });
    },
  },

  // Two unrelated types listening to the same fact
  TaskBadge: {
    taskCountChange(entity, { count }) {
      entity.count = count;
    },
  },

  Logger: {
    taskCountChange(entity, { count }) {
      console.log(`task count is now ${count}`);
    },
  },
};
```

```javascript
api.notify("Tasks:taskAdd", "Buy milk"); // scoped — the target names the type
api.notify("taskCountChange", { count }); // broadcast — the name must name the subject
```

### Naming: name handlers after the event

**Why events and not commands.** A command-style name (`closeOverlays`) implies a known actor
issuing a known instruction, so the only sensible responder is whatever code issued it. An
event-style name (`overlaysClose`) names a single observable occurrence, and every type then
decides independently whether and how to react — which is what `TaskBadge` and `Logger` are doing
above. Neither knows `Tasks` exists, and adding a third listener never means editing `taskAdd`.
This is the same reasoning behind Redux's rule that reducers react to actions without dispatching
their own action type.

**Match the name to the scope.** The scope is part of the description, so the two must agree:

- **Broadcast unscoped** — the name is the _only_ description, so it carries the subject: `playerShoot`, `enemyDestroy`, `itemsLoad`, `taskCountChange`.
- **Scoped** (`Type:event`, `#id:event`) — the target already names the subject, so keep the name bare: `#form1:submit`, `Form:reset`, not `#form1:formSubmit`.
- **Don't scope to rescue a vague name.** `#player:shoot` looks tidy but silently limits the event to `Player` entities — exactly the listeners a broadcast event exists to reach. Name the subject and stay unscoped instead.
- **Inner subjects still get named when scoped:** `#form1:fieldChange` is the field _inside_ the form that changed.

The rule is the same wherever the store runs; what differs is the default. `@inglorious/engine` broadcasts by default, so its events name the
subject; `@inglorious/web` scopes to the emitting component, so its event names stay bare. Each
package documents its own default — see [`skills/engine/SKILL.md`](../engine/SKILL.md) and [`skills/web/SKILL.md`](../web/SKILL.md).

- A single-word verb is fine when it's unambiguous for that entity: `increment`, `reset`, `click`.
- Never notify a handler's own name — it re-enters every matching entity and never terminates; announce something else as its own event.
- Keep one tense. Past tense (`taskAdded`) is defensible, but base verbs are the house style; pick one and stay on it.
- Drop a `handle` prefix — it reads as "on handle click".

**Exception — RTK migration.** `convertSlice()` preserves `caseReducers` names verbatim, so
migrated slices keep their imperative RTK names (`addTodo`, `toggleTodo`, `fetchTodoPending`).
Don't rename these: they have to match the RTK action types they are bridged from.

## Lifecycle Events

```javascript
const types = {
  Logger: {
    create(entity) {
      entity.startTime = Date.now();
    },
    destroy(entity) {
      entity.endTime = Date.now();
    },
  },
};
```

### Payload: the least that can be had

A payload carries the minimum that is **available**, which is not the same as the minimum
possible. Name the thing when it exists and can be looked up; carry the thing when it
cannot.

`remove` carries the id. Everything else about the entity can still be found by that id, so
the rest would be redundant.

`add` carries the entity itself. An observer of an arrival has nothing to look it up by --
it does not exist yet -- so the entity is the floor, not a convenience.

The asymmetry is the same one REST settled on: `removeUser(id)` against
`updateUser(patchedUserWithId)`. Anything else follows from the rule rather than needing to
be remembered case by case: a `move` carries the id and the delta, because both halves of
the new position exist already.

The same reasoning says what a payload should *not* carry: a whole entity where an id will
do, a computed value the recipient can derive, or anything the recipient could have got
from the store.

## Pausing the World

`pause` halts the store: it stops handing out `update` events. `resume` starts it again.

```javascript
store.notify("pause");
store.notify("update");
store.update(); // nothing updated

store.notify("resume");
```

Anything that moves by integrating a delta time stops without being told about it. Every
other event still flows, which is what lets a pause menu take itself back off:

```javascript
pauseMenu.pause(entity, _, api) {
  api.notify("resume");
}
```

An entity opts out with `updatesWhilePaused`, which is for overlays and menus:

```javascript
const Overlay = [{ update(entity, dt) { entity.ticks++; } }];

// in entities
overlay: { type: "Overlay", updatesWhilePaused: true },
```

It belongs on the entity, not the type, so a type stays an index signature of handlers
and stays callable from TypeScript.

**Default is to stop.** Anything that keeps updating must say so, so a forgotten flag
pauses the gameplay rather than freezing the menu.

Unlike `add` and `remove`, `pause` and `resume` still dispatch to types that handle
them, so one notification can halt the world and let the game record why.

The store has no opinion about **who** is paused. `@inglorious/engine`'s `game()`
behaviour keeps a readable `paused` flag on the game entity, so anything toggling a
pause reads that flag rather than its own entity:

```javascript
press(entity, _, api) {
  const game = api.getEntity("game"); // not `entity`
  api.notify(game.paused ? "resume" : "pause");
}
```

## Event Targeting

```javascript
store.notify("event"); // All entities with handler
store.notify("type:event"); // Only entities of type
store.notify("#id:event"); // Only entity with id
store.notify("type#id:event"); // Specific type and id
```

## Dynamic Entities

```javascript
store.notify("add", { id: "counter4", type: "Counter", value: 0 });
store.notify("remove", "counter4");
```

## Async Operations

```javascript
const types = {
  Todos: {
    async itemsLoad(entity, _, api) {
      entity.loading = true;
      const response = await fetch("/api/todos");
      const data = await response.json();
      api.notify("itemsLoadSuccess", data);
    },
    itemsLoadSuccess(entity, items) {
      entity.items = items;
      entity.loading = false;
    },
  },
};
```

### handleAsync Helper

```javascript
import { handleAsync } from "@inglorious/store/async";

const types = {
  Todos: {
    ...handleAsync("fetchTodos", {
      start(entity) {
        entity.loading = true;
      },
      async run(payload, api) {
        const res = await fetch("/api/todos");
        return res.json();
      },
      success(entity, todos) {
        entity.todos = todos;
      },
      error(entity, error) {
        entity.error = error.message;
      },
      finally(entity) {
        entity.loading = false;
      },
    }),
  },
};
```

**Lifecycle events generated:**

- `fetchTodos` → triggers the operation
- `fetchTodosStart` → (if `start` handler provided)
- `fetchTodosRun` → executes async operation
- `fetchTodosSuccess` → on success
- `fetchTodosError` → on error
- `fetchTodosFinally` → always

**Important notes:**

- Use `...handleAsync(...)` to spread handlers into the type
- `run` receives `(payload, api)` — **not** `entity`
- All handlers receive `api` as the last parameter
- `start` is optional

## Systems

Global logic that runs after all entity handlers for the same event:

```javascript
const systems = [
  {
    taskComplete(state, taskId) {
      const allTodos = Object.values(state)
        .filter((e) => e.type === "TodoList")
        .flatMap((e) => e.todos);

      state.stats.total = allTodos.length;
      state.stats.completed = allTodos.filter((t) => t.completed).length;
    },
  },
];

const store = createStore({ types, entities, systems });
```

## Behavior Composition

A type may be an object, or an array of behaviors. Entries are applied **left to right** onto an
empty object, so later entries see what earlier ones added:

- **Object entry** — a mixin. Its properties are extended onto the type as-is.
- **Function entry** — a decorator. It is called with the type composed _so far_ and returns what
  to extend onto it, so it can read, wrap or replace existing handlers.

```javascript
const incrementable = {
  increment(entity) {
    entity.value++;
  },
};

const resettable = {
  reset(entity) {
    entity.value = 0;
  },
};

const types = {
  Counter: [incrementable, resettable],
};
```

### Decorator Pattern

Because a decorator receives the accumulated type, it can wrap a handler that a later mixin adds
by placing it last:

```javascript
const withValidation = (type) => ({
  ...type,
  submit(entity, value, api) {
    if (!value.trim()) return;
    type.submit?.(entity, value, api);
  },
});

const types = {
  Form: [withValidation],
};
```

`withValidation` sits after any mixin providing `submit`, so `type.submit` resolves to it. Order
is the only thing that makes decorator vs. mixin work — putting the decorator first would wrap an
empty type.

## Batched Mode

```javascript
const store = createStore({
  types,
  entities,
  updateMode: "manual",
});

store.notify("playerMove", { x: 100, y: 50 });
store.notify("enemyAttack", { damage: 10 });
store.update(); // Process batch
```

## Derived State

**Using `compute` (memoized selectors):**

`compute` is exported from `@inglorious/store/select`, alongside the alias `createSelector`. It
returns a selector you can either call with state yourself, or hand to `api.select()`.

```javascript
import { compute } from "@inglorious/store/select";

const value = (entities) => entities.counter1.value;
const multiplier = (entities) => entities.settings.multiplier;

const result = compute((count, mult) => count * mult, [value, multiplier]);

// Later:
const total = result(store.getState());
```

**Using `api.select()` (direct selectors):**

```javascript
const value = (entities) => entities.counter1.value;
const multiplier = (entities) => entities.settings.multiplier;

const types = {
  Stats: {
    recalc(entity, _, api) {
      const count = api.select(value);
      const mult = api.select(multiplier);
      entity.result = count * mult;
    },
  },
};
```

## API Reference

### `createStore(options)`

```javascript
const store = createStore({
  types, // Entity behaviors
  entities, // Initial entities
  systems, // Optional: global handlers
  autoCreateEntities, // Optional: boolean (default false)
  updateMode, // Optional: 'auto' | 'manual'
  middlewares, // Optional: middleware array
});
```

Middlewares wrap dispatch as `(store) => (next) => (event) => ...` and return the result of
`next(event)`. See `multiplayerMiddleware` in [`skills/server/SKILL.md`](../server/SKILL.md) for a worked example.

### Store Instance Methods

The store itself exposes the same event surface as a handler's `api`, plus state access:

- `notify(type, payload)` - Trigger an event (preferred over `dispatch`)
- `dispatch(event)` - Redux-style dispatch, `{ type, payload }`
- `getState()` - Current entities map (read-only)
- `setState(state)` - Replace the whole state map, bypassing events
- `update()` - Process the queued events; only needed when `updateMode: "manual"`

`setState` is the escape hatch for wholesale state replacement — merging a server's `stateInit`
into an existing client store, for example. It does not run handlers, so it will not fire
lifecycle events.

### Handler API (`api` parameter)

- `getEntities()` - Read all state (read-only)
- `getEntity(id)` - Read entity (read-only)
- `select(selector)` - Run selector against current state
- `notify(type, payload)` - Trigger events (preferred over dispatch)
- `dispatch(action)` - Redux-style dispatch (for compatibility)
- `getTypes()` - Access type definitions
- `getType(name)` - Access specific type
- `setType(name, type)` - Modify type

**Rules:**

- Mutations inside handlers are safe (store uses Mutative)
- `api.getEntity()` and `api.getEntities()` return read-only snapshots
- Events triggered via `api.notify()` are queued and processed in order

### Built-in Events

- `add` - Add entity (triggers `create`)
- `remove` - Remove entity (triggers `destroy`)
- `pause` - Halt the world, see [Pausing the World](#pausing-the-world)
- `resume` - Unhalt it

## Migration from Redux Toolkit (RTK)

The package exposes migration helpers at `@inglorious/store/migration/rtk`:

```javascript
import {
  convertSlice,
  convertAsyncThunk,
  createRTKCompatDispatch,
} from "@inglorious/store/migration/rtk";
```

### What `convertSlice()` does

- Converts `slice.caseReducers` into Inglorious handlers with the same names.
- Wraps RTK reducers with an RTK-like action object: `{ type, payload }`.
- Generates a `create(entity)` handler that copies `slice.getInitialState()` into the entity.
- Detects RTK `create.asyncThunk` reducers and maps lifecycle handlers automatically.
- Can merge async thunk mappings via `options.asyncThunks`.
- Can merge custom handlers via `options.extraHandlers`.

### What `convertAsyncThunk()` does

Maps RTK lifecycle handlers to `handleAsync` lifecycle:

- `onPending` -> `start`
- `payloadCreator` -> `run`
- `onFulfilled` -> `success`
- `onRejected` -> `error`
- `onSettled` -> `finally`
- Adapts thunk API dispatch to `api.dispatch` (with `notify` fallback) when calling `payloadCreator(arg, thunkAPI)`.
- Supports `scope: "entity" | "type" | "global"` (default: `"entity"`).
- If `onPending` is omitted, no `*Start` handler is generated.

### `buildCreateSlice` + `create.asyncThunk`

`convertSlice()` supports slices created with:

```javascript
import { buildCreateSlice, asyncThunkCreator } from "@reduxjs/toolkit";

const createAppSlice = buildCreateSlice({
  creators: { asyncThunk: asyncThunkCreator },
});
```

For a reducer like `fetchTodo: create.asyncThunk(...)`:

- Without `options.asyncThunks.fetchTodo.payloadCreator`, lifecycle handlers are generated from RTK case reducers:
- `fetchTodoPending`, `fetchTodoFulfilled`, `fetchTodoRejected`, `fetchTodoSettled` (when defined)
- With `options.asyncThunks.fetchTodo.payloadCreator`, runnable async handlers are generated:
- `fetchTodo`, `fetchTodoStart`, `fetchTodoRun`, `fetchTodoSuccess`, `fetchTodoError`, `fetchTodoFinally`
- Pending/fulfilled/rejected/settled reducers from the RTK slice are reused as defaults.

Use the second mode when you want full trigger-and-run migration behavior.

### Quick migration pattern

```javascript
import { createStore } from "@inglorious/store";
import { convertSlice } from "@inglorious/store/migration/rtk";
import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";

const fetchTodos = createAsyncThunk("todos/fetchTodos", async () => {
  const res = await fetch("/api/todos");
  return res.json();
});

const todosSlice = createSlice({
  name: "todos",
  initialState: { items: [], status: "idle", error: null },
  reducers: {
    addTodo(state, action) {
      state.items.push({
        id: Date.now(),
        text: action.payload,
        completed: false,
      });
    },
    toggleTodo(state, action) {
      const todo = state.items.find((t) => t.id === action.payload);
      if (todo) todo.completed = !todo.completed;
    },
  },
});

const TodoList = convertSlice(todosSlice, {
  asyncThunks: {
    fetchTodos: {
      payloadCreator: fetchTodos.payloadCreator,
      onPending: (entity) => {
        entity.status = "loading";
      },
      onFulfilled: (entity, todos) => {
        entity.status = "success";
        entity.items = todos;
      },
      onRejected: (entity, error) => {
        entity.status = "error";
        entity.error = error.message;
      },
    },
  },
});

const store = createStore({
  types: { TodoList },
  autoCreateEntities: true,
});

store.notify("#todoList:addTodo", "Buy milk");
store.notify("#todoList:toggleTodo", 1);
store.notify("#todoList:fetchTodos");
```

`convertSlice()` expects a slice object with `name`, `getInitialState()`, and `caseReducers` (the object returned by `createSlice()` provides these).

### RTK dispatch compatibility layer

Use `createRTKCompatDispatch(api, entityId)` to keep RTK-style action calls while migrating:

```javascript
const dispatch = createRTKCompatDispatch(api, "todos");

dispatch({ type: "todos/addTodo", payload: "Buy milk" });
// -> api.notify("#todos:addTodo", "Buy milk")
```

Notes:

- Function thunks are not supported in compat mode (it logs a warning).
- Non-standard action types fall back to `#<entityId>:<type>`.

### Mapping cheatsheet

- `dispatch(addTodo(payload))` -> `api.notify("#todos:addTodo", payload)`
- `dispatch(toggleTodo(id))` -> `api.notify("#todos:toggleTodo", id)`
- `addCase(thunk.pending)` -> `onPending` / `fetchXStart`
- `addCase(thunk.fulfilled)` -> `onFulfilled` / `fetchXSuccess`
- `addCase(thunk.rejected)` -> `onRejected` / `fetchXError`

## Testing

```javascript
import { trigger, createMockApi } from "@inglorious/store/test";

// Test handlers
const { entity, events } = trigger({ value: 99 }, increment, {
  amount: 5,
});
expect(entity.value).toBe(104);

// With mock API
const valueCopy = (entity, { sourceId }, api) => {
  entity.value = api.getEntity(sourceId).value;
};

const api = createMockApi({
  counter1: { type: "Counter", value: 10 },
});
const { entity: copied } = trigger(
  { id: "counter2", type: "Counter", value: 20 },
  valueCopy,
  { sourceId: "counter1" },
  api,
);
expect(copied.value).toBe(10);
```

`createMockApi` takes a state map (entities keyed by id) and returns a mock of the handler API:

```typescript
interface MockApi {
  getEntities(): TState;
  getEntities(typeName: string): TEntity[];
  getEntity(id: string): TEntity | undefined;
  select<TResult>(selector: (state: TState) => TResult): TResult;
  dispatch(event: Event): void;
  notify(type: string, payload?: any): void;
  getEvents(): Event[];
}
```

`getEvents()` returns every event passed through, which is how you assert that a handler
notified the right thing:

```javascript
expect(api.getEvents()).toEqual([{ type: "#counter2:valueIncrement" }]);
```

## TypeScript

```typescript
interface TodoListTypes {
  Form: {
    inputChange: (entity: FormEntity, value: string) => void;
    submit: (entity: FormEntity) => void;
  };
}

export const types: TodoListTypes = {
  Form: {
    inputChange(entity, value) {
      /* ... */
    },
    submit(entity) {
      /* ... */
    },
  },
};

const store = createStore<TodoListEntity, TodoListState>({
  types: types as unknown as TypesConfig<TodoListEntity>,
  entities,
});
```

## Common Pitfalls

### ❌ Wrong: Direct mutation outside handler

```javascript
const entity = store.getState().counter1;
entity.value++; // Wrong - no event
```

### ✅ Correct: Use notify() or dispatch()

```javascript
store.notify("#counter1:increment");
store.dispatch({ type: "increment", payload: null });
```

### ❌ Wrong: Mutating read-only entity from api.getEntity()

```javascript
const types = {
  Counter: {
    increment(entity, _, api) {
      const other = api.getEntity("counter2");
      other.value++; // Wrong - read-only
    },
  },
};
```

### ✅ Correct: Notify event to target entity

```javascript
const types = {
  Counter: {
    increment(entity, _, api) {
      api.notify("#counter2:increment");
    },
  },
};
```

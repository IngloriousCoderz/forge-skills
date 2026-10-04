---
name: engine
description: Complete reference for the Inglorious Engine 2D game loop and entity update architecture.
---

# @inglorious/engine - Complete Reference

## Installation

```bash
npm install @inglorious/engine
```

## Core Concepts

Functional game engine built on entity-based state management. Uses the same entity model as `@inglorious/store` but optimized for game development with frame-based updates.

**Architecture:**

- Single immutable state object (source of truth)
- Event-driven updates via event queue
- Frame-based `update` event with `deltaTime`
- Renderer agnostic (Canvas2D, React, HTML)

## Coordinates

The world is **y-up**, and both vertical axes grow **upwards**.

`position` is `[x, y, z]`. The origin sits on the floor, so `y = 0` is ground
level and a bigger `y` is always a higher place in the world. Gravity subtracts
from it, a jump adds to it.

`z` is the depth axis, and it is y-up too — it is **not** screen-down. Renderers
turn world coordinates into screen ones; `@inglorious/renderer-2d` projects

```text
canvasX = x
canvasY = viewportHeight - y - z
```

which puts `(0, 0, 0)` on the bottom-left of the canvas and inverts both vertical
axes. Nothing else in the engine knows about screen coordinates.

In a 2D game, keep the play plane at `z = 0` and treat `y` as altitude. Using `z`
as a second vertical axis works too, but it is easy to mix up, and the two are
added together on screen.

```javascript
const WIDTH = 512;
const HEIGHT = 288;
const GROUND_HEIGHT = 16;

const bird = {
  type: "Bird",
  // A hundred pixels above the floor, halfway across the screen.
  position: v(WIDTH / 2, 100, 0),
  // Height is the extent along `y`, depth the one along `z`.
  size: v(38, 24, 0),
  collisions: { hitbox: { shape: "rectangle", size: v(34, 20, 0) } },
};

// Falling loses height.
entity.velocity[1] -= GRAVITY * deltaTime;
entity.position[1] += entity.velocity[1] * deltaTime;

// The floor is a band of altitude, not a line on the canvas.
if (entity.position[1] < GROUND_HEIGHT) entity.position[1] = GROUND_HEIGHT;
```

Two things that catch people out, because they are not about the axes:

- `size` is `[width, height, depth]` with `height` on `y` and `depth` on `z`. A
  renderer that flattens both draws a shape `height + depth` tall, while
  collision detection tests the axes separately.
- An `anchor` picks the point of a shape that sits on its `position`, and it
  places the sprite, the drawn shapes and the collision shapes together.

### Anchors

An `anchor` counts from the low end of every axis — left on `x`, bottom on `y`
and `z` — so it reads the same way the world does. It defaults to `[0.5, 0.5]`:

```text
[0.5, 0.5]  centred          [0, 0]  bottom-left
[1, 1]      top-right        [0, 1]  top-left
```

Anchors are world space, not screen space. Nothing about them depends on which
way the renderer draws, so a shape anchored at `[0, 0]` stands on its position
whether it is a platformer floor or the bottom of a top-down screen. A third
coordinate may be given for the depth axis, and defaults to the middle.

One anchor places everything about an entity, so a hitbox cannot drift away from
what you can see. Write it on the entity rather than on `image`, which keeps one
place to keep it in step:

```javascript
const player = {
  type: "Player",
  // Standing on the floor, described by its bottom-left corner.
  position: v(100, 0, 0),
  anchor: [0, 0],
  size: v(16, 24, 0),
  collisions: { hitbox: { shape: "rectangle" } },
  image: { id: "player", imageSize: [16, 24] },
};

// A platform you land on, also described by its bottom-left corner.
const ground = {
  type: "Platform",
  position: v(0, 0, 0),
  anchor: [0, 0],
  size: v(256, 16, 0),
  collisions: { platform: { shape: "rectangle" } },
};
```

A collision shape may pin itself differently from its entity with its own
`anchor`, which is the one case where a hitbox is deliberately not on the sprite.

## Basic Setup

```javascript
import { Engine } from "@inglorious/engine/core/engine";
import { createRenderer } from "@inglorious/renderer-2d";

const game = {
  types: {
    Player: {
      update(entity, deltaTime) {
        entity.position.x += entity.velocity.x * deltaTime;
        entity.position.y += entity.velocity.y * deltaTime;
      },
    },
  },
  entities: {
    player1: {
      type: "Player",
      position: { x: 0, y: 0 },
      velocity: { x: 100, y: 0 },
    },
  },
};

const canvas = document.getElementById("canvas");
const renderer = createRenderer(canvas);
const engine = new Engine(renderer, game);

await engine.init();
engine.start();
```

## Event System

### Core Engine Events

The engine has built-in single-word events:

- `update` - Fired every frame, carries `deltaTime`
- `add` - Add new entity (triggers `create` lifecycle)
- `remove` - Remove entity (triggers `destroy` lifecycle)

### Custom Events

Game events are broadcast, not scoped: when the player shoots, every enemy should ask "is it
shooting me?" and the bullet pool should decrement its count. So the name is the only description
a listener gets, and it must say who the event is about. Keep them unscoped and name the subject:

```javascript
const types = {
  Player: {
    playerJump(entity) {
      /* ... */
    },
    itemCollect(entity, itemId) {
      /* ... */
    },
    enemyDestroy(entity, enemyId) {
      /* ... */
    },
  },
};
```

### Event Queue

Events are queued and processed once per frame:

```javascript
const types = {
  Enemy: {
    enemyDamage(entity, damage, api) {
      entity.health -= damage;
      if (entity.health <= 0) {
        // This event is queued, processed next frame
        api.notify("enemyDestroy", entity.id);
      }
    },
  },
};
```

## Update Loop

The `update` event is fired every frame with `deltaTime`:

```javascript
const types = {
  Player: {
    update(entity, deltaTime) {
      // Movement based on time, not frame rate
      entity.position.x += entity.velocity.x * deltaTime;
      entity.position.y += entity.velocity.y * deltaTime;

      // Boundary checking
      if (entity.position.x > 800) {
        entity.position.x = 0;
      }
    },
  },
};
```

**Rules:**

- Always use `deltaTime` for time-based calculations
- Never assume fixed frame rate
- `deltaTime` is in seconds (typically 0.016 for 60fps)

## Entity Lifecycle

```javascript
const types = {
  Bullet: {
    create(entity) {
      entity.createdAt = Date.now();
      entity.lifetime = 2000; // 2 seconds
    },

    update(entity, deltaTime, api) {
      entity.lifetime -= deltaTime * 1000;
      if (entity.lifetime <= 0) {
        api.notify("remove", entity.id);
      }
    },

    destroy(entity) {
      // Cleanup: remove from pools, cancel timers, etc.
      console.log(`Bullet ${entity.id} destroyed`);
    },
  },
};
```

## Behavior Composition

Build complex behaviors by composing functions:

```javascript
const movable = {
  update(entity, deltaTime) {
    entity.position.x += entity.velocity.x * deltaTime;
    entity.position.y += entity.velocity.y * deltaTime;
  },
};

const collidable = {
  collisionCheck(entity, other) {
    // Collision detection logic
  },
};

const controllable = {
  playerInput(entity, input) {
    if (input.key === "ArrowLeft") {
      entity.velocity.x = -100;
    }
  },
};

// Compose behaviors
const types = {
  Player: [movable, collidable, controllable],
};
```

## Renderers

### 2D Canvas Renderer

```javascript
import { createRenderer } from "@inglorious/renderer-2d";

const canvas = document.getElementById("canvas");
const renderer = createRenderer(canvas);

// game is the config object holding types, entities, and systems
const engine = new Engine(renderer, game);
await engine.init();
engine.start();
```

**Note:** the two arguments are separate — `renderer` (from `createRenderer(canvas)`) drives
drawing, and `game` is your config object with `types`, `entities` and optional `systems`.

## Entity Pooling

For performance-critical scenarios (bullet hell, particles). `Engine` installs
`entityPoolMiddleware()` for you, so pooling works through two events rather than a pool object:

- `spawn` — payload is the entity's props, including its `type`. The middleware reuses an
  inactive entity of that type, assigning an `id` if the pool has none free.
- `despawn` — payload is the entity to recycle.

```javascript
const types = {
  Player: {
    playerShoot(entity, api) {
      api.notify("spawn", {
        type: "Bullet",
        x: entity.position.x,
        y: entity.position.y,
        active: true,
      });
    },
  },

  Bullet: {
    update(entity, deltaTime, api) {
      entity.y -= 200 * deltaTime;
      if (entity.y < 0) {
        api.notify("despawn", entity);
      }
    },
  },
};
```

Pools are keyed by `type` and created on first use. `store.extras.getAllActivePoolEntities()`
returns every live pooled entity, and in dev mode `store.extras.getEntityPoolsStats()` reports
`{ active, inactive }` per type.

Pooled entities live outside the store, so `api.getEntities()` does not list them. Use
`api.findCollision()` instead of the bare `findCollision` helper: it merges the pool into the
entities it searches, so a pooled body collides like any other. Call
`api.notify("despawn", entity)` to recycle one — it works from inside its own `update`.

## IngloriousScript (Optional)

IngloriousScript adds vector operators for intuitive 2D math. Requires Babel configuration.

**WARNING:** Only use if `babel-plugin-inglorious-script` is configured.

```javascript
// Without IngloriousScript
import { add } from "@inglorious/utils/math/vectors.js";
import { scale, mod } from "@inglorious/utils/math/vector.js";

const newPosition = mod(add(position, scale(velocity, dt)), worldSize);

// With IngloriousScript (requires babel-plugin-inglorious-script)
const newPosition = (position + velocity * dt) % worldSize;
```

Note the two modules: `vectors.js` holds operations over _several_ vectors (`add` sums them
componentwise), `vector.js` holds operations on _one_ (`scale`, `mod`). The same split appears
throughout `@inglorious/utils` — plural file when more than one thing is involved, singular when
there is only one.

## Systems

Global logic that runs after all entity handlers:

```javascript
const collides = (a, b) => {
  // Pure overlap test, not an event handler
  return false;
};

const systems = [
  {
    update(state, deltaTime, api) {
      // Collision detection across all entities
      const players = Object.values(state).filter((e) => e.type === "Player");
      const enemies = Object.values(state).filter((e) => e.type === "Enemy");

      players.forEach((player) => {
        enemies.forEach((enemy) => {
          if (collides(player, enemy)) {
            api.notify("playerHit", { playerId: player.id, enemyId: enemy.id });
          }
        });
      });
    },
  },
];

const engine = new Engine(renderer, { types, entities, systems });
```

## API Reference

### `new Engine(renderer, game)`

```javascript
const renderer = createRenderer(canvas);
const game = {
  types: {/* entity behaviors */},
  entities: {/* initial entities */},
  systems: [/* optional: global handlers */],
};

const engine = new Engine(renderer, game);
await engine.init();
engine.start();
```

**Parameters:**

- `renderer` - Renderer configuration from `createRenderer(canvas)` (contains `types`, `entities`, `systems`)
- `game` - Game configuration object with `types`, `entities`, and optional `systems`

### Engine Methods

- `engine.init()` - Initialize engine (async, must be called before start)
- `engine.start()` - Start the game loop
- `engine.stop()` - Stop the game loop
- `engine.getState()` - Get current state (read-only)

**Note:** Engine uses the store from `@inglorious/store` internally. Access the store via `engine._store` if needed.

### Handler API (`api` parameter)

- `getEntities()` - Read all state (read-only)
- `getEntity(id)` - Read entity (read-only)
- `notify(type, payload)` - Trigger events (queued)
- `getTypes()` - Access type definitions
- `getType(name)` - Access specific type
- `findCollision(entity, entities?, group?)` - First entity colliding with the given one
- `getAllActivePoolEntities()` - Every live pooled entity

## Rules & Constraints

1. **ALWAYS use `deltaTime` in `update` handlers** - Never assume fixed frame rate
2. **Events are queued, not immediate** - Events triggered in handlers are processed next frame
3. **Entity mutations in handlers are safe** - Engine uses Mutative for immutability
4. **Use `api.notify()` for cross-entity communication** - Never mutate other entities directly
5. **Systems run after all entity handlers** - Use for global coordination
6. **Use entity pooling for high-frequency entities** - Bullets, particles, etc.

## Common Pitfalls

### ❌ Wrong: Fixed frame rate assumption

```javascript
const types = {
  Player: {
    update(entity) {
      entity.position.x += 5; // Wrong - assumes 60fps
    },
  },
};
```

### ✅ Correct: Use deltaTime

```javascript
const types = {
  Player: {
    update(entity, deltaTime) {
      entity.position.x += 300 * deltaTime; // Correct - 300 pixels per second
    },
  },
};
```

### ❌ Wrong: Immediate event processing

```javascript
const types = {
  Enemy: {
    enemyDamage(entity, damage, api) {
      entity.health -= damage;
      // Wrong - expects immediate processing
      if (entity.health <= 0) {
        api.notify("enemyDestroy", entity.id);
        // This entity might still exist in other handlers this frame
      }
    },
  },
};
```

### ✅ Correct: Queue events for next frame

```javascript
const types = {
  Enemy: {
    enemyDamage(entity, damage, api) {
      entity.health -= damage;
      // Correct - event queued for next frame
      if (entity.health <= 0) {
        api.notify("enemyDestroy", entity.id);
      }
    },
    enemyDestroy(entity, api) {
      // This runs next frame, after health check
      api.notify("remove", entity.id);
    },
  },
};
```

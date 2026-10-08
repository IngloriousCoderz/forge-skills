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

**Write the named ones, not the numbers.** `physics/anchor.js` exports all nine, and
a bare `[0, 1]` is read as bottom-left by half the people who write it:

```javascript
import { BOTTOM_LEFT, TOP_LEFT } from "@inglorious/engine/physics/anchor.js";
```

Written as numbers they go wrong two ways: the pair is read the wrong way round, and
the game then draws and collides differently -- a ball passes through a brick and
nothing says why. And each game grows its own `TOP_EDGE = 1`, which is the same
mistake in a different file. All nine are listed under [Anchors](#anchors).

One anchor places everything about an entity, so a hitbox cannot drift away from
what you can see. Write it on the entity rather than on `image`, which keeps one
place to keep it in step:

```javascript
const player = {
  type: "Player",
  // Standing on the floor, described by its bottom-left corner.
  position: v(100, 0, 0),
  anchor: BOTTOM_LEFT,
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
- `pause` - Halt the world, see [Pausing](#pausing)
- `resume` - Unhalt it
- `stateChange` - Sent by the `fsm` behaviour, carries `{ entityId, from, to }`

`stateChange` is the one built-in event that names the entity it is about, because a state
machine with more than one entity on the move needs to say which one moved. Anything that
watches a machine without being it -- a scene builder deciding what a state is made of, say
-- listens for it and checks `entityId`. That check is correct here and nowhere else:

```javascript
const scenes = () => ({
  stateChange(entity, { entityId, to }, api) {
    if (entityId !== entity.id) return;

    buildScene(entity, to, api);
  },
});
```

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

### A pass of events sees one consistent world

Events are applied to a draft, and the draft only becomes the state once the whole pass
has finished. `getState()` during a pass therefore returns the world as it was _before_ the
pass began -- deliberately, so that every event in the pass sees the same world rather than
some changes landed and others not.

The consequence is that **a handler cannot look at what an earlier handler in the same
pass did.** So do not act on a change and then go and check for it: be _told_ the change,
and keep your own count.

```javascript
// Does not work. The state this reads is the world as it was *before* the pass, so the
// brick that was just removed is still in it and the level never looks finished.
remove(entity, id, api) {
  entity.bricksLeft = api.getEntities("Brick").length
}
```

```javascript
// Works. Told what happened rather than looking for it, and counting on the entity -- the
// level is given how many it rolled when it rolls them.
remove(entity, id, api) {
  if (api.getEntity(id)?.type !== "Brick") return

  entity.bricksLeft -= 1

  if (entity.bricksLeft === 0) entity.state = "victory"
}
```

The check for what went is not the staleness talking: `getEntity` answers about the past,
and an entity that was there a moment ago still is. That is what makes it possible to tell
a brick leaving from a menu line being cleared away.

Reading the state is not wrong, only late. It is the right thing for anything that wants
the _past_.

### What reaches an entity

- **`create` and `destroy`** reach **only the entity they are about**. They read as a
  constructor and a destructor, so a handler never has to begin by asking whether it is
  the one being talked about.
- **`add` and `remove`** are **broadcast**, carrying the entity joining or the id leaving.
  They are how anything watching the world hears about it -- a level counting down the
  bricks it rolled, an enemy tally, a wave about to be over. Not the counterpart to
  `create` and `destroy`; the other half of the pair is simply not there.

What a payload carries is a store-wide convention rather than an engine one, so it is
written down there: [`skills/store/SKILL.md`](../store/SKILL.md) for payloads carrying the
least that can be had.

An entity hears its own arrival or departure if its type handles those, so a handler that
only wants the rest of the world should say which ids it answers to.

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

### Pausing

`api.notify("pause")` stops the store handing out `update` events at all. Nothing that
moves needs to know about it:

```javascript
fsm({
  play: {
    togglePause(entity, _, api) {
      api.notify(entity.paused ? "resume" : "pause");
    },
  },
});
```

The `game` behaviour keeps a readable `paused` flag on the game entity, which is what the
handler above reads. Because `update` is simply never called while halted, a mover needs
no check of its own — which is the point, since every mover having to ask whether it may
move is what makes pausing expensive.

Two things keep working while halted, and both are deliberate:

- **Every other event.** The thing that takes the pause back off still gets its events.
- **Entities setting `updatesWhilePaused`**, which is how an overlay or a pause menu
  keeps drawing and clicking.

```javascript
const PauseMenu = [{ render: renderMenu }];

// in entities
pauseMenu: { type: "PauseMenu", updatesWhilePaused: true },
```

**Default is to stop.** An entity that must keep updating has to say so, so a forgotten
flag pauses the gameplay rather than freezing the menu. `pause` and `resume` still
dispatch to types that handle them, so one notification can halt the world and let the
game record why.

### Quitting

`api.notify("quit")` ends the game. It needs no handler of its own, so a way out works from
any state rather than from whichever screen happens to offer one -- which is what the
original's four states each checking for Escape amounts to:

```javascript
const entities = {
  game: {
    type: "Game",
    // Nothing is a handler here: the input action is named `quit` and the engine's own
    // game behaviour is what answers it.
  },
};

// in the input mapping
{
  Escape: "quit";
}
```

**A state can take the way out for itself.** A handler named on the type is the default --
what every state would do -- and a state that names the same event replaces it rather than
adding to it, so a screen can decide what leaving means:

```javascript
const Game = fsm({
  // Most screens want Escape to mean out of the game, so they name nothing and the
  // engine's own quit stands.
  play: {
    ballLost(entity, _, api) {
      /* ... */
    },
  },

  // The high score table is left with Escape rather than quit by, and says so.
  highScores: {
    quit(entity, _, api) {
      api.notify("soundPlay", "wallHit");

      entity.state = "start";
    },
  },
});

// in the input mapping
{
  Escape: "quit";
}
```

This is the original's arrangement rather than a convenience: it checks Escape in each of
its states, and on the tables of scores it checks it to go _back_. A global quit with no
way to take it would be a way out that some screens had stolen.

The frame a quit is answered on still runs to its end, because a quit is given between
frames rather than in the middle of one. After that the engine stops the loop and never
updates the world again. It is not `pause`: quitting is not a halt you can take back, and
the world is not merely still, it is finished.

`quit` is blacklisted from multiplayer, since one player ending their game is not news for
anyone else's.

### Screens that share a world

`fsm` says when a machine moves. `scenes` says what each state is made of, and is the
usual pair for a game that is a few screens over one world:

```javascript
import { fsm } from "@inglorious/engine/behaviors/state-machine/fsm.js";
import { scenes } from "@inglorious/engine/behaviors/state-machine/scenes.js";

const SCENES = {
  title: () => [createTitleEntity(), createMenuEntity()],
  serve: () => [...createPlayScene(), createServePromptEntity()],
  play: () => [...createPlayScene(), createPausedEntity()],
};

const types = {
  Game: [
    scenes(SCENES),
    fsm({
      serve: {
        press(entity) {
          entity.state = "play";
        },
      },
      play: {
        togglePause(entity, _, api) {
          api.notify(entity.paused ? "resume" : "pause");
        },
      },
    }),
  ],
};

const entities = { game: { type: "Game", state: "serve" } };
```

**Only the difference between two states is touched.** Anything they have in common stays
standing as it is, which is what carries whatever the two screens share from one into the
next without rebuilding it -- and so without losing whatever the world has already done to
it. Rebuilding each state's world afresh is the mistake this exists to prevent, and it is
silent: everything looks right until a thing you moved snaps back to where it started.

A state is handed the entity asking for it, so anything worth making once -- something
expensive that must not be made again on a later attempt -- can be held on the entity and
left alone the second time round:

```javascript
serve: (entity) => {
  entity.world ??= createWorld();

  return [...createPlayScene(entity.world), createServePromptEntity()];
},
```

**A thing that stands on both sides but is not set up the same way is patched.** Both
states put the same keyboard up with a different mapping, so it is neither added nor removed
-- it is told. `scenes` compares the two configurations and patches what differs, and a key
the next state maps to nothing is taken off rather than left standing -- see `patch` in the
store skill.

The comparison is `isDeepEqual`, and it is the reason a scene can be regenerated from
scratch each time without everything being rebuilt. It is also why returning the _same_
object for something unchanged makes it free: the walk stops at the reference check.

**What a state answers to is `mappings`' job, not `scenes`'.** Patching a keyboard is one way
to do it, and it is the long way round: it puts the mapping in a scene, walks it to work out
what changed, and makes every device that reads a mapping agree by hand. `mappings` says the
same thing directly, and it is the third of the usual three:

```javascript
import { fsm } from "@inglorious/engine/behaviors/state-machine/fsm.js";
import { mappings } from "@inglorious/engine/behaviors/state-machine/mappings.js";
import { scenes } from "@inglorious/engine/behaviors/state-machine/scenes.js";

const types = {
  Game: [
    scenes(SCENES),
    mappings({
      menu: {
        ArrowUp: "moveItemUp",
        ArrowDown: "moveItemDown",
        Enter: "choose",
      },
      play: { ArrowLeft: "moveLeft", Space: "fire" },
      // Deaf on purpose: there is nothing to press here.
      credits: {},
    }),
    fsm({
      menu: {
        choose: (entity) => {
          entity.state = "play";
        },
      },
      play: {},
    }),
  ],
};

const entities = { game: { type: "Game", state: "menu" } };
```

**Each state says its own, and a state with nothing mapped is deaf.** Falling back to the
last mapping would make a forgotten state carry on answering, which is the mistake this is
written against. Say `{}` and the state is deliberately deaf -- a menu with no keys is a
statement, and a state someone forgot about should be conspicuous rather than quietly
inheriting.

**One table, every device.** The table names keys, axes and buttons together, because a
button is mapped the way a key is:

```javascript
mappings({
  play: {
    ArrowLeft: "moveLeft",
    ArrowRight: "moveRight",
    Btn14: "moveLeft",
    Btn15: "moveRight",
    Axis0: "moveLeftRight",
  },
});
```

`mappings` announces `mappingChange` and each device answers it on itself -- the keyboard
and the gamepad both set their own `mapping`. A handler changing an entity it was not given
is a thing the store will not hold: `api.getEntity()` reads the world as it was _before_ the
pass, so a write through it does not survive. That is also why one table rather than one per
device: there is no second copy to fall out of step with the first.

**The opening state counts.** A machine is already in its first state when it is made, and
`fsm` only announces moves, so `mappings` applies the first table on `create` as well as on
every `stateChange`. Without that the game begins answering whatever mapping it was handed.

**Composed behaviour replaces, it does not run in order.** A type has one `create` and one
`stateChange`, and the last behaviour to name one wins -- so `mappings` is written as a
decorator that hands on to whatever it displaced:

```javascript
return (type) => ({
  create(entity, payload, api) {
    type.create?.(entity, payload, api);

    apply(entity.state, api);
  },
  stateChange(entity, event, api) {
    type.stateChange?.(entity, event, api);

    apply(event.to, api);
  },
});
```

Skipping the hand-on does not fail loudly. It takes `scenes` down with it and every screen
in the game silently disappears, which is why it is worth knowing.

### A mistyped type is an error

The engine refuses a configuration whose entity names a type nothing declared, and says
which type was nearly meant:

```
1 of the entities in this game name a type that is not declared.
An undeclared type gives an entity no handlers at all, so everything sent to it is
silently dropped.
  audio has type "audio", which is not declared
    did you mean "Audio"?
```

Nothing downstream reports this. An undeclared type augments into an empty type, so the
entity stands there with none of the rendering, collision or handlers its type was meant to
give it and every event sent to it goes nowhere. Type names are `PascalCase` by convention,
and `type: "audio"` is not caught by anything else.

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
      // Cleanup: remove from pools, cancel timers, let go of the document, etc.
      console.log(`${entity.id} destroyed`);
    },
  },
};
```

`destroy` is worth more than tidying. An entity that is created and destroyed repeatedly --
a screen's own, say -- leaves anything it took at `create` behind unless it lets go here.
The engine's own `keyboard` and `audio` both take DOM listeners at `create` and give them
up at `destroy` as well as at `stop`; before that was so, a keyboard destroyed with its
screen left a second keyboard answering the same key.

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

### Declaring images and audio

Both are declared on the entity that holds them, and both are read once at startup, before
anything is drawn or played:

```javascript
const entities = {
  images: {
    type: "Images",
    images: {
      background: { url: "/images/background.png" },
      breakout: { url: "/images/breakout.png" },
    },
  },

  audio: {
    type: "Audio",
    sounds: {
      paddleHit: { url: "/sounds/paddle_hit.wav" },
      music: { url: "/sounds/music.mp3", loop: true, volume: 0.25 },
    },
  },
};
```

An image is then named by `image.id`, and a sound played by name — the name is the sound's
address, so anything that hears `soundPlay` plays it without saying which file it is:

```javascript
api.notify("soundPlay", "paddleHit");
api.notify("soundStop", "music");
```

**They are declared in the configuration, and not in the document.** That is worth knowing
because it is not the only way to write it. An `<img>` in the page is found by the preload
scanner before any of this code runs, which is genuinely better for _starting_ a download,
and one element is one decoded picture however many things ask for it. It is not usable as
the way a game says what it has, for one reason: a game that is a **Storybook story has no
document of its own** to put an `<img>` in, and that is where most examples live. The
configuration is the one place a story, a game page and a headless run can all be served
from.

**Preloading is a separate question, and it does not need the engine.** A game with an
`index.html` can warm the browser cache with the ordinary HTML vocabulary:

```html
<link rel="preload" as="image" href="/images/breakout.png" />
```

The fetch the engine then makes is a cache hit. That is the page's business and the
renderer's is to resolve a name, so neither knows about the other.

**An image can also load itself.** Without a `src` anywhere, nothing loads it and nothing
warns; carrying one on the entity asks for it the first time it is drawn:

```javascript
{ id: "hero", type: "Hero", image: { id: "hero", src: "/images/hero.png" } }
```

**Audio has no such thing, and cannot.** A sound is a decoded `AudioBuffer`, and a decoded
buffer is made from bytes fetched and handed to `decodeAudioData` — no element gives one up
directly. An `<audio>` in the page would only supply the `src`. So an image and a sound are
not loaded by the same mechanism underneath, and they are still declared the same way.

### Cutting a frame out of a sheet

A frame is said on `entity.image`, in the sheet's own pixels:

| on `entity.image` | what it says                                     |
| ----------------- | ------------------------------------------------ |
| `id`, `src`       | which picture                                    |
| `imageSize`       | how big the whole sheet is                       |
| `tileSize`        | how big one cell of its grid is                  |
| `x`, `y`          | where in the sheet this frame starts, **pixels** |
| `frameSize`       | how much of it this frame reads                  |

```javascript
const Ball = [
  { render: renderImage },
  {
    create(entity) {
      entity.image = {
        id: "neko",
        imageSize: [192, 256],
        x: 96,
        y: 48,
        tileSize: [32, 16],
        frameSize: [8, 8],
      };
    },
  },
];
```

`frameSize` is how much is read, and it is separate from `tileSize` because artwork is not
always one piece per cell: a frame spanning two cells is read whole, and one sitting inside a
cell with background around it does not bring its background along. `tileSize` defaults to
the whole sheet, which is what an image that is not cut up wants.

**`imageSize` is the whole sheet and nothing overwrites it**, because it is what tells a
sheet into how many cells it cuts — divide it by a cell width and you have the grid.

For a sheet cut on a uniform grid, `renderSprite` addresses tiles by index and also
animates; reach for a frame when it breaks the grid.

### Mirroring a frame

A frame list is a list of indices, and a mirrored frame is written as the frame's own
number with a flag set in the top bit. `flippedHorizontally` and `flippedVertically` are
that written down, so the mirroring is visible at the call site instead of encoded in it:

```javascript
import {
  flippedHorizontally,
  flippedVertically,
} from "@inglorious/renderer-2d/image/flags.js";

const entities = {
  cat: {
    type: "Cat",
    sprite: {
      image: { id: "neko", imageSize: [192, 192], tileSize: [32, 32] },
      frames: {
        right: [16, 17, 18],
        left: [
          flippedHorizontally(16),
          flippedHorizontally(17),
          flippedHorizontally(18),
        ],
        ceiling: [flippedVertically(4)],
      },
    },
  },
};
```

Both names say which way the frame is turned, because the usual case is a mirror on one
axis and a function called just `flipped` leaves the reader to work out which. Mirroring
both ways is the two composed: `flippedVertically(flippedHorizontally(16))`.

`renderSprite` and `renderTilemap` both read the flags back out, so a list can mix mirrored
and plain frames freely. Writing a flag yourself (`0x80000000 + 16`) leaves a number
outside the 32 bits the renderers take apart with bitwise operators; both helpers coerce
it, so the stored number is the one the readers expect. The flags themselves are exported
from the same module for the rare case of taking a frame apart by hand.

### Tinting an image

An image is drawn in its own colours unless it is given a `tint`:

```javascript
{ render: renderImage, image: { id: "particle", imageSize: [8, 8] }, tint: "rgb(99, 155, 255)" }
```

It is called `tint` and not `color` on purpose. `color` is a field entities carry for their
own reasons -- often a number saying where an entity sits in a palette -- and a number
handed to the canvas as a fill style is ignored **without complaint**, so the whole game
renders black and nothing anywhere says why. `renderText` and `renderRectangle` do take
`color`, because for those it is the colour of the ink.

**A tint is mixed in, not filled over.** The colour multiplies with the sprite, so a tint of
white leaves it equal to itself and anything else darkens or colours it the way laying ink
over it would; a soft-edged sprite keeps its softness, its own shading, and its empty
corners.

Tinted frames are made once and kept, keyed by the image and then by the region and the
colour, so a particle on screen every frame is composited once rather than sixty times a
second -- and two things drawing the same frame of the same picture share that one copy
rather than making one each. The cache hangs off the image itself, so it does not outlive
it.

### Particles

`emitBurst` throws a burst of pooled entities that drift under an acceleration and fade
out over their own lifetimes, then hand themselves back:

```javascript
import { emitBurst } from "@inglorious/engine/behaviors/particles.js";

emitBurst(api, {
  count: 64,
  position: v(100, 100, 0),
  spread: v(10, 10, 0),
  size: v(8, 8, 0),
  lifetime: [0.5, 1],
  tint: "rgb(99, 155, 255)",
  acceleration: [v(-15, -80, 0), v(15, 0, 0)],
  layer: LAYER_PARTICLE,
  image: { id: "particle", imageSize: [8, 8] },
});
```

`acceleration` is a pair of corners and each particle's own is drawn from between them,
which is what makes a burst look scattered rather than like a grid. `spread` is the
half-extent of the box they are thrown in. **Acceleration is in this world's axes, so
falling is negative on y** -- `v(0, -80, 0)` falls, `v(0, 80, 0)` rises.

Each particle needs a type that draws it, usually `renderImage` or `renderRectangle`, and
the `particle` behaviour beside it.

Pooled entities are drawn in layer order with everything else, and are given events like
any other entity, but they are not in `getState()` -- ask
`store.extras.getAllActivePoolEntities()` to see them.

### Naming a frame by its number

Sometimes what you have is a _number_ off the sheet rather than a place on it — a brick
that says which colour and which tier it is, say, and the sheet is laid out so that number
is a tile. Tiles are read in order **down** the sheet, so the seventh tile of a sheet six
across is the first of its second row.

That is the same arithmetic as any grid, and it belongs to the game rather than to the
renderer, because it is the game's sheet and the game's numbering:

```javascript
const BRICKS_ACROSS = 6;

// A brick's own number, counted down the sheet.
export const brickQuad = (hp) => (brickColourOf(hp) - 1) * 4 + brickTierOf(hp);

// ...and the place that number is, which is what an image wants.
export const brickFrame = (hp) => ({
  x: (brickQuad(hp) % BRICKS_ACROSS) * BRICK_WIDTH,
  y: Math.floor(brickQuad(hp) / BRICKS_ACROSS) * BRICK_HEIGHT,
  frameSize: [BRICK_WIDTH, BRICK_HEIGHT],
  tileSize: SHEET_TILE,
});
```

So a frame by its number is a plain function returning a frame, and the entity spreads it
onto its image like any other. It is worth saying out loud that this used to be a helper
that cropped as it went, and that the division back down to a number was a round trip
through a helper rather than arithmetic anyone needed done for it.

### Where a line sits

A text entity's position is the **top edge** of its line, which keeps the position and
`lineHeight` in step with what is drawn whatever the font's own baseline turns out to be.
`baseline` says which edge sits on the position instead, and takes the names the canvas
gives -- `top`, `hanging`, `middle`, `alphabetic`, `bottom`:

```javascript
// The line starts at the position.
{ render: renderText, value: "Score:", position: v(372, 238, 0), size: 8 }

// The middle of the line is at the position, so nothing has to add half a line height by
// hand at every place a centred line is wanted.
{ render: renderText, value: "GAME OVER", position: v(216, 162, 0), size: 32, baseline: "middle" }
```

Two entities at the same position are only on the same line if they share a `baseline` as
well. A top-anchored and a middle-anchored line at one point sit half a line height apart.

### Anchors

Sprites and shapes can be anchored by any of nine points, named in
`@inglorious/engine/physics/anchor.js` rather than written as pairs of numbers:

```javascript
import { BOTTOM_LEFT, TOP_LEFT } from "@inglorious/engine/physics/anchor.js";

// Drawn from its top left corner, which is where a sprite sheet's own coordinates point.
{ type: "Ball", position: v(212, 40, 0), size: v(8, 8, 0), anchor: TOP_LEFT }

// Sitting on the position, which is what a floor is.
{ type: "Platform", position: v(0, 0, 0), size: v(64, 16, 0), anchor: BOTTOM_LEFT }
```

`TOP_LEFT`, `TOP_CENTER`, `TOP_RIGHT`, `LEFT`, `CENTER`, `RIGHT`, `BOTTOM_LEFT`,
`BOTTOM_CENTER`, `BOTTOM_RIGHT`. Anchors count from the top on both vertical axes, so
`BOTTOM_LEFT` is on the floor. `CENTER` is the default.

## Collision

An entity with a `collisions` block is solid:

```javascript
brick: { type: "Brick", collisions: { hitbox: { shape: "rectangle" } } },
```

Or, for the shape almost everything solid wants, one word:

```javascript
brick: { type: "Brick", size: [32, 16, 0], solid: true },
```

`solid: true` means "collide with a rectangle the size of `size`". It is **asked for
rather than assumed** from the presence of a `size`, because plenty of things have a size
and are not in the way — a line of text, a frame counter, anything measured in pixels
rather than in space. Assuming it would quietly turn all of those into walls.

A declared `collisions` block still wins, so an entity can be solid and still have a hitbox
smaller than itself, or shaped like a point or a circle.

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
import { add, mod, scale } from "@inglorious/utils/math/vector.js";

const newPosition = mod(add(position, scale(velocity, dt)), worldSize);

// With IngloriousScript (requires babel-plugin-inglorious-script)
const newPosition = (position + velocity * dt) % worldSize;
```

Both come from the one module: `math/vector.js` holds operations over _one_ vector
(`scale`, `mod`) and over _several_ (`add` sums them componentwise). A module is named after
the thing it is about, not after how many it is handed — see the utils skill.

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

## Testing a Game

`@inglorious/engine/test` drives a game against its own store: no canvas, no browser, no
loop.

```javascript
// test/game.test.js
import { createGame } from "@inglorious/engine/test";
import { beforeEach, describe, test } from "vitest";

import gameConfig from "../src/game.ijs";

describe("Breakout", () => {
  let game;

  beforeEach(() => {
    game = createGame(gameConfig);
  });

  test("begins the serve on a third press", () => {
    // given
    game.step(4);
    game.press("Enter");
    game.press("Enter");

    // when
    game.press("Enter");

    // then
    check(game.entity("game").state === "play", "and a third answers it");
  });
});
```

### What the game under test gives you

|                                      |                                                                            |
| ------------------------------------ | -------------------------------------------------------------------------- |
| `entity(id)`                         | one entity, by the name the game knows it by                               |
| `state()`                            | the lot, for keys and `Object.keys`                                        |
| `pooled(type?)`                      | pooled entities in play -- they are drawn from a pool, so not in the state |
| `check(condition, description)`      | assert, in a failure that says what it was about                           |
| `playedSounds`                       | the sounds reached for, in order                                           |
| `notify(event, ...args)`             | the one way anything is said to it                                         |
| `step(frames)`                       | run frames                                                                 |
| `advance(seconds)`                   | run for a length of time                                                   |
| `press(code)` / `hold(code, frames)` | tap a key / hold it down                                                   |

`store.getEntity(id)` is the same read as `api.getEntity`, for the code outside a handler.

### Rules

- **One game per test.** Make it in `beforeEach`; state nothing in a test carries forward. A
  test that inherits from the one before it can only be run in one order.
- **Say the preconditions in `given`, the action in `when`, the claim in `then`.** A test that
  is 300 lines of arranged state is 300 lines nobody can change safely.
- **Use `advance(seconds)`, never `step(seconds * 60)`.** The step is not a sixtieth of a
  second, so converting by hand asks for slightly too few frames, and that shows up as a
  test that passes most of the time.
- **Never reach for `engine._store`.** It is private, and its `extras` are the engine's own.
  `notify`, `entity` and `pooled` are the doors.

### A game with a move of its own

`createGame` takes additions, so a game's own move is added rather than the harness edited:

```javascript
game = createGame(gameConfig, {
  // Breakout: the ball falling off the bottom costs a life.
  dropTheBall() {
    this.entity("ball").position[1] = 0;

    return this.step(1);
  },
});
```

### One trap

- **Dev mode freezes what the store publishes.** Right for a game in a browser, wrong for a
  test that has to put a ball where a brick is. `createGame` turns it off, so a test must not
  need to.

## API Reference

### `new Engine(renderer, game)`

```javascript
const renderer = createRenderer(canvas);
const game = {
  types: {
    /* entity behaviors */
  },
  entities: {
    /* initial entities */
  },
  systems: [
    /* optional: global handlers */
  ],
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

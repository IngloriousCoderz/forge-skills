---
name: engine-best-practices
description: Best practices for testing Inglorious Engine games, including the renderers behind them. Load when writing or fixing tests, or when deciding what a game is expected to do.
---

# Engine Best Practices: Testing

Use this guide when writing or changing tests for a game or for a renderer. The
[engine skill](../engine/SKILL.md) says how a game is built; this one says how it is checked.

Most of what follows is here because a test here once passed while the thing it was
testing was broken. Rules with a reason attached get remembered; rules without get ignored
the first time they cost someone an hour.

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
- **Assert the rule, not a sample of it.** Checking that two lines you happened to look at
  are white will pass while every other line is black. Check the shape:
  `whiteLines(state).length === 0`.
- **Never write `expect(condition, "about it")` on its own.** It asserts nothing -- a
  message is the second argument to something that already fails. `expect` is fine on its
  own; the two-argument form without `.toBe(true)` is not.
- **Break a test on purpose before trusting it.** If flipping the condition does not turn it
  red, it is not testing. A runner left over from an older version of a file has shadowed
  the real one here, and several hundred checks reported themselves to the console while the
  suite stayed green.

### Testing a renderer

A renderer takes `(entity, ctx)`, so testing one means handing it a canvas that records
rather than draws. `@inglorious/renderer-2d/test/canvas` is one:

```javascript
import { callsTo, createContext } from "@inglorious/renderer-2d/test/canvas.js"

const { calls, ctx } = createContext()

renderCircle({ radius: 10 }, ctx)

const [, x, y, radius] = callsTo(calls, "arc")[0]
```

It tracks the transform stack, so `at()` asks where a point actually landed once every
translate and scale is applied -- which is how a position that is off by the flip is caught.

Three things about it that are easy to get wrong:

- **A recorded call keeps the call's name in the first slot.** `["arc", x, y, radius, from,
  to]` -- skipping a slot reads the radius as the start angle, and the test fails in a way
  that looks like the renderer. It is easy to do twice in one line, so check what the
  numbers are before trusting what they say.
- **A canvas that records instead of drawing is still code, and it can still be wrong.**
  Reading the destination off `drawImage` as if it were part of the call -- when the method
  captures its arguments without the name -- put the box on the source instead of the
  destination, and every image test that used it would have agreed on the same wrong box.
  Test the recorder the same way you test a renderer.
- **`calls.box` is the last rectangle or image drawn, not all of them.** For something that
  draws a row of tiles it gives you one tile, which reads like a bug in the renderer. Ask the
  recorded `translate` and `fillRect` arguments instead and work the arithmetic out yourself.
- **Check that a default is reachable.** `const [width = 100] = size` defaults an element of
  `size`, not `size`, so a button with no size threw instead of drawing at the hundred by
  fifty the same line appears to promise. The default has to be on the destructuring of
  `size` as well, and a test for the default is what proves it is.
- **Test the examples in the docs, not only the ones in the games.** `renderHitmask` is used
  by `docs/engine/src/collision/tilemap.js` and by no game at all, so a green suite over the
  games says nothing about it. Search `docs/` before calling something unused.
- **A world offset of nothing comes out as `-0`,** because it is computed as `-y - z`. The
  canvas draws it in the same place, but `toEqual(0)` does not believe that, so assert
  offsets with `toBeCloseTo`.

A renderer is worth testing for its arithmetic -- where a position lands, which way an axis
goes -- rather than for the sequence of calls, which is an implementation detail that a
reasonable rewrite will change.

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


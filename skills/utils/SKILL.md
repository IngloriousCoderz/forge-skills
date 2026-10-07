---
name: utils
description: Utility and helper function patterns for Inglorious Forge applications.
---

# @inglorious/utils - Complete Reference

## Installation

```bash
npm install @inglorious/utils
```

## Core Concepts

- Pure, composable utilities for plain arrays and objects.
- Vector helpers use arrays tagged by `v()` with a non-enumerable `__isVector__` property. That
  makes them mutable, so copy a shared vector instead of storing it where something writes to one.
- Prefer subpath imports for tree-shaking and smaller bundles.

### One file per thing

Every module is named after **the thing it is about**, singular, whatever the function
happens to take:

| Module                      | Holds                  | Example                           |
| --------------------------- | ---------------------- | --------------------------------- |
| `math/vector.js`            | one vector, or several | `scale`, `mod`; `add`, `subtract` |
| `math/number.js`            | one number, or several | `clamp`, `mod`, `snap`, `sum`     |
| `data-structures/object.js` | one object, or several | `get`, `set`; `extend`, `merge`   |
| `data-structures/array.js`  | one array, or several  | `remove`; `concat`                |

The name says what the module is _about_, not how many arguments it takes. `add` sums two
vectors and `scale` multiplies one, and both live in `math/vector.js`, because both are
operations on a vector. There is no plural file: a second one named after the same thing
would be a second place to look for it.

So `clamp` exists twice: `clamp(num, min, max)` in `number.js`, and `clamp(vector, min, max)`
in `vector.js`, which delegates to the scalar one internally.

## Entry Points

Use either subpath imports (preferred) or the namespace exports.

```javascript
import { v } from "@inglorious/utils/v.js";
import { pipe, compose } from "@inglorious/utils/function.js";
import {
  get,
  set,
  clone,
  produce,
  serialize,
  deserialize,
} from "@inglorious/utils/object";
import { magnitude, sum, ZERO_VECTOR } from "@inglorious/utils/math/vector.js";
import { findPath } from "@inglorious/utils/algorithms/path-finding.js";
import { applyVelocity } from "@inglorious/utils/physics/velocity.js";
```

```javascript
import {
  algorithms,
  dataStructures,
  functions,
  math,
  physics,
  v,
} from "@inglorious/utils";
```

## Functions

### `pipe` and `compose`

```javascript
import { pipe, compose } from "@inglorious/utils/functions";

const add = (a) => (b) => a + b;
const multiply = (a) => (b) => a * b;

const leftToRight = pipe(add(5), multiply(2));
const rightToLeft = compose(multiply(2), add(5));

leftToRight(10); // 30
rightToLeft(10); // 30
```

### `isFunction`

```javascript
import { isFunction } from "@inglorious/utils/functions";

isFunction(() => {}); // true
isFunction(123); // false
```

## Data Structures

### Arrays

```javascript
import {
  ensureArray,
  contains,
  remove,
} from "@inglorious/utils/data-structures/array.js";

ensureArray(1); // [1]
contains([1, 2, 3], 2); // true
remove([1, 2, 3], 2); // [1, 3]
```

### Objects

```javascript
import { get, set, clone, produce } from "@inglorious/utils/object.js";

const obj = { a: { b: [{ c: 3 }] } };

get(obj, "a.b.0.c"); // 3
set(obj, "a.b.0.d", 4);

const next = produce(obj, (draft) => {
  draft.a.b[0].c = 10;
});

const deepCopy = clone(next);
```

### Serialization

`serialize` / `deserialize` convert an event to and from the wire format. Used by the multiplayer
middleware to send events over a WebSocket, so payloads must be serializable.

```javascript
import { serialize, deserialize } from "@inglorious/utils/object.js";

const wire = serialize({ type: "playerHit", payload: { x: 10 } });
const event = deserialize(wire);
```

### Deep Merge

```javascript
import {
  extend,
  merge,
  defaults,
} from "@inglorious/utils/data-structures/object.js";

const base = { a: { b: 1 }, list: [1] };
const update = { a: { c: 2 }, list: [2] };

const immutableMerged = extend(base, update);
const mutableMerged = merge({ ...base }, update);

const withDefaults = defaults({ a: null }, { a: 1, b: 2 });
```

### Board Utilities

```javascript
import {
  createBoard,
  toString,
} from "@inglorious/utils/data-structures/board.js";

const board = createBoard([2, 3], (row, col) => `${row}:${col}`);
const text = toString(board, [2, 3]);
```

## Math

### Vectors

`ZERO_VECTOR` and `UNIT_VECTOR` are the two vectors worth knowing by name. Use the zero one to
name the components you care about, or to build a vector up from scratch:

```javascript
import { ZERO_VECTOR, UNIT_VECTOR } from "@inglorious/utils/math/vector.js";
import { v } from "@inglorious/utils/v.js";

// Name the components you care about, e.g. for a game played on a single plane.
const [, NO_RISE, NO_DEPTH] = ZERO_VECTOR;
const position = v(10, 20, NO_DEPTH);

// Facing a direction.
const heading = UNIT_VECTOR;
```

Copy a shared vector with `v(...ZERO_VECTOR)` before storing it. A plain spread
(`[...ZERO_VECTOR]`) does return a new array, but it drops the `__isVector__` tag, so `isVector`
and anything that checks it will no longer recognise it. This matters for engine entities, whose
`position` is written to in place — never hand one `ZERO_VECTOR` directly.

```javascript
import { v, ensureV } from "@inglorious/utils/v.js";
import { clamp, magnitude, subtract, sum } from "@inglorious/utils/vector.js";

const position = v(10, 20);
const velocity = v(2, -1);

const next = sum(position, velocity); // [12, 19]
const len = magnitude(next);
const limited = clamp(next, 0, 10);

const many = sum(position, velocity, v(1, 1));
const diff = subtract(position, velocity);

const arr = [0, 1].map((x) => x + 1);
const asVector = ensureV(arr);
```

### Number, RNG, Trigonometry

```javascript
import { clamp, mod, snap } from "@inglorious/utils/math/number.js";
import { lerp } from "@inglorious/utils/math/linear-interpolation.js";
import { random } from "@inglorious/utils/math/rng.js";
import {
  toRange,
  toRadians,
  toDegrees,
} from "@inglorious/utils/math/trigonometry.js";

clamp(12, 0, 10); // 10
lerp(0, 10, 0.5); // 5
mod(-1, 10); // 9
snap(13, 5); // 15

random(); // float between 0 and 1
random(1, 6); // integer between 1 and 6
random(0.5, 1.5); // float between 0.5 and 1.5

toRange(5 * Math.PI); // normalize angle
toRadians(180); // pi
toDegrees(Math.PI); // 180
```

## Algorithms

### Decision Trees

```javascript
import { decide } from "@inglorious/utils/algorithms/decision-tree.js";

const tree = {
  test: ({ age }) => (age >= 18 ? "adult" : "minor"),
  adult: () => "access",
  minor: () => "deny",
};

decide(tree, { age: 21 }); // "access"
```

### Path Finding

```javascript
import { findPath } from "@inglorious/utils/algorithms/path-finding.js";

const graph = {
  nodes: {
    a: [0, 0],
    b: [1, 0],
    c: [2, 0],
  },
  arcs: [
    { from: "a", to: "b", cost: 1 },
    { from: "b", to: "c", cost: 1 },
  ],
};

findPath(graph, "a", "c"); // ["a", "b", "c"]
```

## Physics

```javascript
import { applyVelocity } from "@inglorious/utils/physics/velocity.js";
import { applyFriction } from "@inglorious/utils/physics/friction.js";
import { applyGravity } from "@inglorious/utils/physics/gravity.js";
import { v } from "@inglorious/utils/v.js";

let position = v(0, 0, 0);
let velocity = v(10, 0, 0);

({ position, velocity } = applyVelocity(
  { position, velocity, maxSpeed: 12 },
  0.016,
));
velocity = applyFriction({ velocity, friction: 1 }, 0.016);

const gravityStep = applyGravity(
  {
    position,
    vy: 0,
    maxJump: 2,
    maxLeap: 4,
    maxSpeed: 5,
  },
  0.016,
);
```

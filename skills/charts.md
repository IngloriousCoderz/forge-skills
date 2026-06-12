# @inglorious/charts

A high-performance chart engine designed for both config-driven and primitive-driven visualizations.

## Architecture Overview

`@inglorious/charts` follows a unified engine principle. Instead of managing separate engines for each chart type, a single core handles visual rendering by analyzing either:

- the entity configuration in config mode
- the primitives passed in `children` during composition mode

### Core Pieces

- `Chart`: the universal engine that handles standardization and SVG rendering
- `withRealtime`: a separate decorator that adds stream seeding, data sliding, and brush synchronization
- `primitives`: pure building blocks such as `XAxis`, `Line`, and `Tooltip`

## Public API

### Engines and Decorators

```js
import { Chart } from "@inglorious/charts";
import { withRealtime } from "@inglorious/charts/realtime";
```

### Optional Styles

```js
import "@inglorious/charts/base.css";
import "@inglorious/charts/theme.css";
```

## Rendering Modes

### 1. Config Mode

In config mode, the visual chart type comes from `entity.type`. The store maps those types to the unified engine. Realtime behavior is added by composing `[Chart, withRealtime]` in the store.

#### Store Configuration

```js
import { createStore } from "@inglorious/store";
import { Chart } from "@inglorious/charts";
import { withRealtime } from "@inglorious/charts/realtime";

export const store = createStore({
  types: {
    Line: Chart,
    Bar: Chart,
    Area: Chart,
    Composed: Chart,
    Pie: Chart,
    Donut: Chart,

    LineRT: [Chart, withRealtime],
    BarRT: [Chart, withRealtime],
    AreaRT: [Chart, withRealtime],
  },
  entities,
});
```

Notes:

- Standard visual types point directly to `Chart`
- Realtime aliases such as `LineRT` are resolved back to their base visual types during standardization
- The decorator stays explicit and consumer-owned

### 2. Composition Mode

In composition mode, the visual type is inferred from the primitives passed in `children`. Explicit `type` values are usually unnecessary.

```js
Chart.render(
  {
    width: 800,
    height: 400,
    data: dataset,
    children: [
      Chart.CartesianGrid(),
      Chart.XAxis({ dataKey: "name" }),
      Chart.YAxis(),
      Chart.Line({ dataKey: "value" }),
      Chart.Tooltip(),
    ],
  },
  api,
);
```

In the example above, the visual type is inferred as `Line` from `Chart.Line(...)`.

## Realtime

Realtime is a composable behavior and is never baked into the base engine.

### Responsibility

`withRealtime` is responsible for:

- stream seeding
- data sliding
- tick progression
- brush synchronization while the stream is live or paused

### Usage

#### Config Mode

Use the array composition syntax in the store:

```js
"LineRT": [Chart, withRealtime]
```

#### Composition Mode

Wrap the engine manually:

```js
const RealtimeChart = withRealtime(Chart)
RealtimeChart.render(...)
```

## Available Primitives

### Cartesian

- `Chart.CartesianGrid()`
- `Chart.XAxis()`
- `Chart.YAxis()`
- `Chart.Line()`
- `Chart.Area()`
- `Chart.Bar()`
- `Chart.Dots()`
- `Chart.Tooltip()`
- `Chart.Legend()`
- `Chart.Brush()`

### Polar

- `Chart.Pie()`

## Naming Conventions

### Best Practices

- Use `has...` or `is...` for booleans:
  - `hasTooltip`
  - `hasDots`
  - `hasGrid`
  - `isTooltipEnabled`
- Avoid `show...`
- Prefer the term `primitives`, not `components`

## Internal Structure

### Standardizer

`core/standardizer/`

Responsibilities:

- merge input
- infer visual type
- normalize data shapes
- build the render frame

### Engine

`core/engine/`

Responsibilities:

- render SVG output
- organize cartesian, polar, and overlay renderers

### Realtime Utilities

`src/realtime/`

Responsibilities:

- stream-slide helpers
- tick-related utilities

### Decorators

`src/decorators/`

Responsibilities:

- optional behaviors layered on top of the base chart engine

## Testing

When modifying `charts`, run at least:

```bash
pnpm -C packages/charts test
pnpm -C packages/charts lint
```

# @inglorious/charts

A high-performance chart engine designed for both config-driven and primitive-driven visualizations.

## Architecture Overview

`@inglorious/charts` follows a unified engine principle. Instead of managing separate engines for each chart type, a single core handles visual rendering by analyzing either:

- the entity configuration in config mode
- the primitives passed in `children` during composition mode

### Core Pieces

- `chart`: the universal engine that handles standardization and SVG rendering
- `withRealtime`: a separate decorator that adds stream seeding, data sliding, and brush synchronization
- `primitives`: pure building blocks such as `XAxis`, `Line`, and `Tooltip`

## Public API

### Engines and Decorators

```js
import { chart } from "@inglorious/charts"
import { withRealtime } from "@inglorious/charts/realtime"
```

### Optional Styles

```js
import "@inglorious/charts/base.css"
import "@inglorious/charts/theme.css"
```

## Rendering Modes

### 1. Config Mode

In config mode, the visual chart type comes from `entity.type`. The store maps those types to the unified engine. Realtime behavior is added by composing `[chart, withRealtime]` in the store.

#### Store Configuration

```js
import { createStore } from "@inglorious/web"
import { chart } from "@inglorious/charts"
import { withRealtime } from "@inglorious/charts/realtime"

export const store = createStore({
  types: {
    line: chart,
    bar: chart,
    area: chart,
    composed: chart,
    pie: chart,
    donut: chart,

    "line-rt": [chart, withRealtime],
    "bar-rt": [chart, withRealtime],
    "area-rt": [chart, withRealtime],
  },
  entities,
})
```

Notes:

- Standard visual types point directly to `chart`
- Realtime aliases such as `line-rt` are resolved back to their base visual types during standardization
- The decorator stays explicit and consumer-owned

### 2. Composition Mode

In composition mode, the visual type is inferred from the primitives passed in `children`. Explicit `type` values are usually unnecessary.

```js
chart.render(
  {
    width: 800,
    height: 400,
    data: dataset,
    children: [
      chart.CartesianGrid(),
      chart.XAxis({ dataKey: "name" }),
      chart.YAxis(),
      chart.Line({ dataKey: "value" }),
      chart.Tooltip(),
    ],
  },
  api,
)
```

In the example above, the visual type is inferred as `line` from `chart.Line(...)`.

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
"line-rt": [chart, withRealtime]
```

#### Composition Mode

Wrap the engine manually:

```js
const realtimeChart = withRealtime(chart)
realtimeChart.render(...)
```

## Available Primitives

### Cartesian

- `chart.CartesianGrid()`
- `chart.XAxis()`
- `chart.YAxis()`
- `chart.Line()`
- `chart.Area()`
- `chart.Bar()`
- `chart.Dots()`
- `chart.Tooltip()`
- `chart.Legend()`
- `chart.Brush()`

### Polar

- `chart.Pie()`

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

---
name: charts
description: High-performance chart engine designed for both config-driven and primitive-driven visualizations.
---

# @inglorious/charts

## Architecture Overview

`@inglorious/charts` follows a unified engine principle. Instead of managing separate engines for each chart type, a single core handles visual rendering by analyzing either:

- the entity configuration in config mode
- the primitives passed in `children` during composition mode

### Core Pieces

- `Chart`: the chart type, its event handlers and `render`, which standardizes the input and draws SVG
- primitives: pure building blocks such as `XAxis`, `Line` and `Tooltip`, exported separately
- `withRealtime`: a decorator that makes a chart follow a stream of data the app pushes

### Rendering only reads

`render` never writes to the entity it draws. Interaction state lives in the chart's entity and changes through events:

- dragging the brush dispatches `brushChange`
- hovering a datum dispatches `tooltipShow`, leaving it `tooltipHide`; the tooltip overlay is drawn from `entity.tooltip`

So a composition chart that keeps state needs an `entity`: a `Brush` without one throws. Without one, tooltips fall back to native SVG `<title>`s.

## Public API

```js
import {
  Area,
  Bar,
  Brush,
  CartesianGrid,
  Chart,
  Dots,
  Legend,
  Line,
  Pie,
  streamSlide,
  Tooltip,
  XAxis,
  YAxis,
} from "@inglorious/charts";
import { withRealtime } from "@inglorious/charts/realtime";
```

### Optional Styles

```js
import "@inglorious/charts/base.css";
import "@inglorious/charts/theme.css";
```

`theme.css` maps the `--iw-chart-*` custom properties (text, text-muted, axis, grid, surface, border, accent) to an Inglorious UI theme's tokens. The renderers read colors only through them, with the default look as fallback.

## Rendering Modes

### 1. Config Mode

In config mode, the visual chart type comes from `entity.type`. The store maps those types to `Chart`.

```js
import { Chart } from "@inglorious/charts";
import { withRealtime } from "@inglorious/charts/realtime";
import { createStore } from "@inglorious/store";

export const store = createStore({
  types: {
    Line: Chart,
    Bar: Chart,
    Area: Chart,
    Composed: Chart,
    Pie: Chart,
    Donut: Chart,

    LiveLine: [Chart, withRealtime],
  },
  entities,
});
```

Notes:

- A type name containing a visual type, such as `LiveLine`, resolves to it (`line`)
- `Chart` holds only event handlers and `render`, so it fits the store's `types` in TypeScript without a cast
- Functions such as `xTickFormatter`, `yTickFormatter` and `tooltipFormatter` never go in the entity. A type wrapping `Chart` passes them in its own `render`, as Inglorious UI's `DataGrid` passes its callbacks:

```js
const PercentLine = {
  ...Chart,
  render(entity, api) {
    return Chart.render(
      {
        ...entity,
        yTickFormatter: (value) => `${value}%`,
        tooltipFormatter: (value) => `${value}%`,
      },
      api,
    );
  },
};
```

### 2. Composition Mode

In composition mode, the visual type is inferred from the primitives passed in `children`. Explicit `type` values are usually unnecessary.

```js
Chart.render(
  {
    entity: "sales",
    width: 800,
    height: 400,
    children: [
      CartesianGrid(),
      XAxis({ dataKey: "name" }),
      YAxis({ tickFormatter: (value) => `${value}%` }),
      Line({ dataKey: "value" }),
      Tooltip(),
    ],
  },
  api,
);
```

In the example above, the visual type is inferred as `line` from `Line(...)`, and `entity: "sales"` provides the data and holds the tooltip state.

## Realtime

`withRealtime` adds events to a chart type; it runs no timers and makes up no data. The app pushes points:

- `streamPush`: a number, put at the next index, or a whole data point
- `streamPause`: freezes the chart and shows the brush; points pushed meanwhile wait in `realtime.pending`
- `streamPlay`: adds the waiting points and follows the newest again

Configured by `entity.realtime`: `visibleWindow` (default 30) and `maxHistory` (default 2000). `entity.realtime.isPaused` tells whether it is paused.

```js
api.notify("#temperature:streamPush", 21.5);
api.notify("#temperature:streamPush", { time: "12:00", value: 21.5 });
```

## Available Primitives

### Cartesian

- `CartesianGrid()`
- `Tooltip()`: takes a `formatter(value, name)` for the value; a pie slice keeps its percentage after it
- `XAxis()`, `YAxis()`: both take a `tickFormatter` and a `label`, a title beside the axis; `XAxis` shows as many labels as fit by default, or every `interval + 1`th
- `Line()`: `curve` is `"linear"` (default), `"natural"`, `"monotone"` or `"step"`
- `Area()`: `curve` as `Line`'s; areas with the same `stackId` stack
- `Bar()`: bars with the same `stackId` stack in one place per category
- `Dots()`
- `Tooltip()`
- `Legend()`
- `Brush()`: needs the chart's entity

### Polar

- `Pie()`: `hasLabel` turns labels on; `startAngle` and `endAngle`, in degrees clockwise from twelve o'clock, draw part of a circle (`-90` to `90` is the top half)

In config mode the same go on the entity: `isStacked: true` for areas and bars, `curve`, `xAxisLabel`, `yAxisLabel`, `startAngle`, `endAngle`.

## Naming Conventions

### Best Practices

- Use `has...` or `is...` for booleans:
  - `hasTooltip`
  - `hasDots`
  - `hasGrid`
  - `isTooltipEnabled`
  - `isPaused`
- Avoid `show...`
- Prefer the term `primitives`, not `components`

## Internal Structure

### Standardizer

`core/standardizer/`

Responsibilities:

- merge input, without writing to it
- infer visual type
- normalize data shapes
- build the render frame, with the `entityId` events go to

### Engine

`core/engine/`

Responsibilities:

- render SVG output
- organize cartesian, polar, and overlay renderers
- read theme colors through `theme.js`

### Defaults

`core/defaults.js` holds the default size, brush height and palette. Use it rather than repeating them.

### Realtime Utilities

`src/realtime/`

Responsibilities:

- stream-slide helpers

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

Tests render with `@lit-labs/ssr` and assert on the markup, rather than on template internals.

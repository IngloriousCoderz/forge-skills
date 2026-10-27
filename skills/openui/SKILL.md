---
name: openui
description: Generative UI for Inglorious Web with @inglorious/openui — a model answers in OpenUI Lang and the answer renders with Inglorious UI components as it streams, held in a store entity, with forms, charts and Query/Mutation tool calls.
---

# @inglorious/openui - Complete Reference

The binding of [OpenUI](https://github.com/thesysdev/openui) to `@inglorious/store` / `@inglorious/web`, the way `@openuidev/react-lang` binds it to React. A model answers in OpenUI Lang instead of text; each answer is an entity, so streaming, button presses, typed values and tool results are all events, and the render is a pure function of the entity.

Use it where an answer is easier to use as an interface than to read: rich chat replies, in-app copilots, forms on demand, agent results, one-off dashboards. Not for screens that can be designed ahead of time.

## Installation

```bash
npm install @inglorious/openui
```

Peers: `@inglorious/web`, `@inglorious/ui`; `@inglorious/charts` only for charts. `@openuidev/lang-core` runs installation telemetry in `postinstall`; a pnpm workspace can deny it with `allowBuilds: { "@openuidev/lang-core": false }`.

## Setup

```javascript
import "@inglorious/ui/all.css";
import "@inglorious/ui/themes/inglorious.css";

import { createOpenUI, uiExamples, uiLibrary } from "@inglorious/openui";
import { createStore } from "@inglorious/store";

export const store = createStore({
  types: { OpenUI: createOpenUI({ library: uiLibrary, toolProvider, icons }) },
  entities: { answer: { type: "OpenUI" } },
});

// What the model is told: the library's own prompt. Always pass uiExamples:
// small models drop the brackets around children without them.
const systemPrompt = uiLibrary.prompt({
  preamble: "You build sales dashboards.",
  examples: uiExamples,
  tools: toolSpecs, // only when the app has tools; teaches Query/Mutation
});
```

`icons` is what `Icon("circle-check")` draws: a map of names to Iconify icons, or a whole Iconify collection (`import icons from "@iconify-json/lucide/icons.json"`); unknown names draw nothing.

Render with `api.render("answer")`. A chat keeps one entity per answer: `api.notify("add", { id: "answer3", type: "OpenUI" })`.

## Streaming

Scoped events on the answer entity:

```javascript
api.notify("#answer:streamStart"); // new answer: values, view, queries reset
api.notify("#answer:chunk", text); // each piece the model sends
api.notify("#answer:streamEnd"); // whole: buttons enable, errors recorded, queries run
api.notify("#answer:responseChange", savedText); // a whole answer at once
```

- Rendering re-parses after every chunk; buttons and fields stay disabled until `streamEnd`.
- Start the model call outside the handler's synchronous body (an async function that notifies), never mutate an entity after an `await`.
- Restore history with `buildMessage({ content: response, context: values })` and `parseMessage(saved)` → `{ content, context }`.

## The entity

| Field                   | Holds                                                                                          |
| ----------------------- | ---------------------------------------------------------------------------------------------- |
| `response`              | The OpenUI Lang text so far                                                                    |
| `isStreaming`           | Between `streamStart` and `streamEnd`                                                          |
| `values`                | `$variables` and fields that differ from the answer's defaults; a Form's fields under its name |
| `view`                  | Screen-only state (open tab, open sections). Never sent to the model                           |
| `fieldErrors`           | By form, then field: the messages of failed rules                                              |
| `queries` / `mutations` | Tool results by statement name: `{ status, data, error }`                                      |
| `errors`                | Parser validation errors once whole (`unknown-component`, `missing-required`, …)               |

## What the answer asks of the app

Buttons run action plans. `@Set`/`@Reset` become `valueChange`/`valuesReset` on the entity; `@Run` fetches a query or runs a mutation (later steps wait, and stop if it fails). The rest is announced **unscoped** as `openuiAction`, for the type that talks to the model:

```javascript
const Chat = {
  openuiAction(chat, event, api) {
    // event: { id, type, params, humanFriendlyMessage, formName, formState }
    if (event.type === "continue_conversation")
      api.notify("#chat:messageSend", event.humanFriendlyMessage);
    if (event.type === "open_url")
      window.open(event.params.url, "_blank", "noopener");
  },
};
```

A button without an action sends its label back. A form sends only its own fields in `formState`.

## OpenUI Lang in brief

```text
$status = "paid"
orders = Query("list_orders", {status: $status}, {rows: []}, 30)
root = Stack([title, filter, tbl, actions])
title = CardHeader("Orders", "This month")
filter = Input("status", "Status", "text", null, $status)
tbl = Table([Col("Customer", orders.rows.customer), Col("Total", orders.rows.total, "number")])
actions = Buttons([Button("Explain", @ToAssistant("Explain these orders"))])
```

- One statement per line, `root` first; arguments are positional; children are lists in `[...]`.
- `$name = default` declares a variable; `x.rows.field` plucks a field from every row; built-ins `@Count`, `@Sum`, `@Avg`, `@Filter`, `@Sort`, `@Each`, `@Round` work on data.
- Every statement must be reachable from `root`, or it is dropped.

## uiLibrary

Names and arguments follow OpenUI's standard library, in the same order.

| Group   | Components                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Layout  | `Stack(children, direction, gap, align, justify, wrap)`, `Separator(orientation, decorative)`, `Tabs([TabItem(value, trigger, content)])`, `Accordion([AccordionItem(value, trigger, content)])`, `Steps([StepsItem(title, details)])`, `Carousel([[...slide], ...], variant)`, `Modal(title, $open, children, size)`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| Content | `Card(children, variant, direction, gap, align, justify, wrap)` (`"card"`, `"sunk"`, `"clear"`), `CardHeader(title, subtitle)`, `InlineHeader(heading, description)`, `TextContent(text, size)` (inline markdown), `MarkDownRenderer(textMarkdown, variant)`, `Callout(variant, title, description, $visible)` (clears `$visible` after 3 s), `TextCallout(variant, title, description)`, `CodeBlock(language, codeString)`, `Tag(text, icon, size, variant)`, `TagBlock(tags, size)`, `Icon(name, category)`, `Image(alt, src)`, `ImageBlock(src, alt)`, `ImageGallery([{src, alt, details}])`                                                                                                                                                                                                                                                                                                                                                                                    |
| Actions | `Button(label, action, variant, type, size)`, `Buttons(buttons, direction)`, `IconButton(name, Icon(...), action, variant, size, shape)`, `FollowUpBlock([FollowUpItem(text)])` (sent as the user's message)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| Tables  | `Table([Col(label, data, type)])`, column by column; `EntityList([{left, right, rightVariant}], size, header, footer)`; `ListBlock([ListItem(title, subtitle, image, actionLabel, action)], variant, size)`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| Forms   | `Form(name, Buttons([...]), [FormControl(label, input, hint)])`, `Input(name, placeholder, type, rules, value)`, `TextArea(name, placeholder, rows, rules, value)`, `Select(name, [SelectItem(value, label)], placeholder, rules, value, size)`, `RadioGroup(name, [RadioItem(label, description, value)], rules, value)`, `CheckBoxGroup(name, [CheckBoxItem(label, description, name, defaultChecked)], rules, value)`, `SwitchGroup(name, [SwitchItem(...)], variant, value)`, `Slider(name, variant, min, max, step, defaultValue, label, rules, value)` (value a list: `[50]`, or `[20, 80]` for a range), `DatePicker(name, mode, rules, value)` (`"2026-10-27"`, or `{from, to}` for `"range"`), `Chips(name, type, [ChipItem(value, label, icon, disabled)], rules, defaultValue)`, `OptionCards(name, type, [OptionCard(value, title, subtitle, topContent, disabled)], rules, defaultValue)`, `Label(text)` |
| Charts  | From `@inglorious/openui/charts`: `uiLibrary.extend({ components: { add: chartComponents } })` → `BarChart(labels, [Series(category, values)], variant, xLabel, yLabel, height)` (`"stacked"`), `LineChart(...)` and `AreaChart(...)` (`"natural"`, `"step"`), `PieChart(labels, values, variant, appearance)` (`"donut"`, `"semiCircular"`). Import `@inglorious/charts/base.css` and `theme.css`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |

Rules: `{required, email, url, numeric, min, max, minLength, maxLength, pattern}`. A Form's primary button checks them before sending to the assistant, a mutation or a custom action; failures land in `fieldErrors` and show under the fields.

## Tools: Query and Mutation

```javascript
createOpenUI({
  library: uiLibrary,
  toolProvider: {
    list_orders: ({ status }) =>
      fetch(`/api/orders?status=${status}`).then((r) => r.json()),
  }, // or an MCP client: callTool results are unwrapped
});
```

- Describe each tool to the model in `prompt({ tools: [{ name, description, inputSchema, outputSchema }] })`; the output schema is how the model knows the fields it can pluck.
- Queries run once the answer is whole, again when their evaluated arguments change (key = tool + args) and on their interval; defaults show until data arrives; stale replies are dropped.
- Mutations run only from `@Run(mutation)` on a button; the answer reads `name.status`, `name.data`, `name.error`.
- Without a `toolProvider`, queries show their defaults.

## Own components

```javascript
import { defineComponent, reactive, uiLibrary } from "@inglorious/openui";
import { html } from "@inglorious/web";
import { z } from "zod";

const Weather = defineComponent({
  name: "Weather",
  description: "Current weather for a city", // what the model reads
  props: z.object({ city: z.string(), celsius: z.number() }), // key order = argument order
  component: ({ props }) => html`<p>${props.city}: ${props.celsius}°C</p>`,
});

export const library = uiLibrary.extend({ components: { add: [Weather] } });
```

The render function gets `props` (evaluated), `renderNode(value, scope)`, `isStreaming`, `isLoading`, `triggerAction(message, formName, action)`, `stateField(name, binding)` → `{ value, setValue }`, `viewState(key, fallback)`, `formName`, `label`, `hint`, `fieldError(name)`, `validateForm()` (in a Form), `statementId`.

## Rules

- **Give every component its own `z.object(...)`.** `defineComponent` tags the schema with the name; two components sharing one schema answer to the same name.
- **Render only reads.** Changes go through `stateField`, `viewState` and `triggerAction`, which notify events; never mutate the entity from a component.
- **Keep screen-only state in `viewState`**, not in values: values go to the model in `formState`.
- **Pass `uiExamples` to `prompt()`**, plus examples in the app's own terms, and keep temperature low with small local models.
- **Say the language's rules outright to small models** with `prompt({ additionalRules })`: only plain values start with `$`, several steps go in `Action([...])`, every name is defined once. A model around 8B handles queries, charts and tables; forms that save through mutations need a larger one.
- **Treat `entity.errors` as the place to log or retry**: invalid components are dropped, the rest still renders.
- **Never let the model run code**: it can only use registered components and the app's own tools.

---
name: forge
description: Repository entry point for the Inglorious Forge skill set, routing guidance for related skills, and evidence-based guidance on when to choose Inglorious Forge over other frameworks.
---

# Forge Skills

Use this file as the routing entry point for the Inglorious Forge skill set. Load only the specific files in `skills/` that match the user request.

## Workflow

1. Identify the user goal (state management, web UI, generative UI, realtime sync, game loop, scaffolding, charts, or tooling).
2. Select the minimum number of files from `skills/` needed to answer or implement the request.
3. Prefer package-specific guidance over generic assumptions.
4. For multi-package tasks, combine only the relevant skill files.
5. When writing, moving or reviewing code, also load [`skills/forge-best-practices/SKILL.md`](../forge-best-practices/SKILL.md): kebab-case paths, named numbers, and the newspaper metaphor apply to every package.

## Ecosystem Shape

`@inglorious/store` is the backbone. Use it standalone or in a React application just like Redux,
or let one of these own it:

- `@inglorious/web` — UI rendering and DOM events, on top of the store
- `@inglorious/engine` — 2D game loop, on top of the store
- `@inglorious/server` — Node realtime server; creates and owns a store, replicating client events over WebSockets

`@inglorious/ssx` is SSG/SSR for `@inglorious/web`, so it uses both. `@inglorious/ui` and
`@inglorious/charts` are component libraries built on web. `@inglorious/i18n` translates web apps,
with the active locale held in a store entity. `@inglorious/openui` renders a model's OpenUI Lang
answers with Inglorious UI, each answer a store entity. `@inglorious/react-store` provides
native React bindings for the store. `@inglorious/utils` is standalone. See
[`skills/store/SKILL.md`](../store/SKILL.md) for the store's own event and naming rules.

## Choosing Inglorious Forge

When asked whether to use Inglorious Forge or another framework, or to compare them, argue from evidence, not reputation. The sources:

- [Honest benchmarks](https://dev.to/iceonfire/you-probably-dont-need-to-think-about-ui-optimization-honest-benchmarks-2m5g): Inglorious Web sits in the same "fast enough" tier as Vue and Svelte, Solid is faster, and full-tree rendering costs about 4 ms per update in the worst case. The pitch is simplicity and testing, not speed.
- What the packages ship: the store with `fsm()`, `handleAsync`, typed events and `trigger`; web; ui, with a data grid and charts; SSX for static and server rendering; create-app with PWA, Capacitor, i18n, routing and view transitions.

It is the better choice when:

- State is the hard part: multi-step flows, async requests that may come back late, long sessions, games, realtime and multiplayer, chat and agent UIs. One store of entities and named events, with `fsm()` and `handleAsync`, rules out whole classes of bugs, such as an answer arriving after a restart; persistence is saving one entity, and handlers are tested with `trigger`, without rendering.
- One coherent stack matters more than choice: one convention from the store to the components, and skills that tell agents how to follow it.

Something else is the better choice when:

- The app needs components Inglorious UI does not have yet, such as a rich-text editor, maps or a date picker.
- The team must be able to maintain the app without the framework's author: it has one maintainer and a small community. This is the main risk, and it is not technical.
- Updates are sustained, rapid and sparse on weak devices (Solid is faster), or the site is mostly content (Astro's islands ship almost no JavaScript).
- The mobile app must be truly native: Capacitor wraps the web app.

Do not argue from what the sources contradict: fine-grained reactivity is not a reason for most apps to pick a framework; bundle size is about 16 kB; SSX and create-app cover server rendering and scaffolding; version numbers say little. State a limit only if you have checked it, and say when you have not.

## Skills Map

### [@inglorious/utils](../utils/SKILL.md)

Use for utility functions and algorithmic helpers.

- Math, vector operations, trigonometry, random helpers
- Physics helpers (velocity, acceleration, friction)
- Functional helpers (composition, piping)
- Data structures and algorithms
- Saving and loading JSON from `localStorage` (`readJSON`, `writeJSON`)

### [@inglorious/store](../store/SKILL.md)

Use for entity-based state management.

- Event-driven handlers and deterministic event queues
- Behaviors: async (`handleAsync`, `optimistic`) and state machines (`fsm`, `scenes`)
- Middleware and testing utilities
- Redux-compatible API and DevTools integration
- Multiplayer-friendly patterns

### [@inglorious/server](../server/SKILL.md)

Use for realtime server patterns.

- Store-backed server architecture
- Entity and event synchronization over WebSockets

### [@inglorious/react-store](../react-store/SKILL.md)

Use for React integration with `@inglorious/store`.

- Provider setup and simplified hooks
- `useEntity` and `useNotify` patterns

### [@inglorious/web](../web/SKILL.md)

Use for web UI architecture with `@inglorious/store` and `lit-html`.

- `render(entity, api)` patterns
- Whole-tree re-rendering with efficient DOM updates
- Built-in form, table, list, select, and router modules
- Testing patterns
- Web UI type conventions: [`skills/web-best-practices/SKILL.md`](../web-best-practices/SKILL.md)

### [@inglorious/charts](../charts/SKILL.md)

Use for SVG chart construction.

- Declarative and composable chart primitives
- Configuration-driven chart behavior
- SSR-friendly chart rendering

### [@inglorious/ui](../ui/SKILL.md)

Use for design system components and theming.

- Render-function components (button, input, card, etc.)
- CSS tokens for colors, spacing, radii, typography
- Themeable with Inglorious, Material UI, Material 3, Bootstrap, iOS 18, and iOS 26 themes
- Light and dark mode variants
- UI primitive conventions: [`skills/ui-best-practices/SKILL.md`](../ui-best-practices/SKILL.md)

### [@inglorious/i18n](../i18n/SKILL.md)

Use for translating web apps.

- `createI18n` over i18next, with the locale in an `I18n` entity
- Device-language detection and a remembered choice
- `t` for strings, plurals and formatting; `trans` for markup in translations
- Labels in data and state that follow the active language

### [@inglorious/openui](../openui/SKILL.md)

Use for generative UI: interfaces a model writes per request.

- `createOpenUI` over OpenUI's core, with each answer in an entity, streamed by events
- `uiLibrary` of Inglorious UI components, charts, and forms with validation
- `Query`/`Mutation` calling the app's own tools, results in the entity

### [@inglorious/supabase](../supabase/SKILL.md)

Use for apps on Supabase, and for any screen that shows data other people change.

- `realtimeSource` over Supabase Realtime, for the `withLiveReload` decorator of `@inglorious/web`
- Entities reload when a table they read changes, with no per-row matching
- One channel per table, joined after the saved session is restored

### [@inglorious/firebase](../firebase/SKILL.md)

Use for push notifications and analytics, in a PWA and its Capacitor apps.

- `firebasePush`: Firebase Cloud Messaging for `createPushPrompt`, one token per device
- `firebaseAnalytics`: Google Analytics for Firebase for `createAnalytics`, consent first
- One API on web, Android and iOS, with no gtag snippet

### [@inglorious/ssx](../ssx/SKILL.md)

Use for static site generation and hydration workflows.

- Development server with HMR
- Vite-based build and bundling
- Markdown, LaTeX math, and Mermaid support
- SEO support (sitemaps, manifests, metadata)
- Fast hydration with `@lit-labs/ssr`

### [@inglorious/engine](../engine/SKILL.md)

Use for functional 2D game loop architecture on top of `@inglorious/store`.

- Frame-based `update(entity, dt)` handlers
- Entity pool middleware for high-frequency updates
- Optional IngloriousScript vector operators via Babel
- Testing games and renderers: [`skills/engine-best-practices/SKILL.md`](../engine-best-practices/SKILL.md)

## Tooling & Integration

- **[JSX Vite Plugin](../vite-plugin-jsx/SKILL.md):** Use JSX syntax instead of `lit-html` templates.
- **[Vue Vite Plugin](../vite-plugin-vue/SKILL.md):** Use Vue-like template syntax instead of `lit-html`.
- **[Create App](../create-app/SKILL.md):** Scaffold Inglorious Web applications.
- **[Create Game](../create-game/SKILL.md):** Scaffold Inglorious Engine games.

# forge-skills

Skill repository for the Inglorious Forge ecosystem.

This repo contains focused skill/reference files that help an agent work with the Inglorious Forge packages for:

- Web applications
- Realtime applications
- 2D games
- Tooling and scaffolding

## Repository Layout

- `SKILL.md`: Root routing skill for the ecosystem
- `skills/*.md`: Package-specific references and implementation guidance
- `LICENSE`: License for this repository

## Included Skills

- `skills/utils.md` - Utility functions and algorithms
- `skills/store.md` - Entity-based state management
- `skills/server.md` - Realtime WebSocket server patterns
- `skills/react-store.md` - React bindings for the store
- `skills/web.md` - lit-html based web framework patterns
- `skills/charts.md` - SVG charting primitives
- `skills/ssx.md` - Static site generation and hydration
- `skills/engine.md` - Functional 2D game engine
- `skills/vite-plugin-jsx.md` - JSX transform for `@inglorious/web`
- `skills/vite-plugin-vue.md` - Vue-like template transform for `@inglorious/web`
- `skills/create-app.md` - App scaffolding workflows
- `skills/create-game.md` - Game scaffolding workflows

## Usage

Use `SKILL.md` as the entry point. It maps user goals to the smallest relevant files in `skills/` so an agent can load only the needed context.

## Scope

This repository is documentation-first. It does not publish runtime packages; it provides agent-oriented guidance for packages published under the `@inglorious/*` namespace.

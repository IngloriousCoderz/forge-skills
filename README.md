# forge-skills

Skill repository for the Inglorious Forge ecosystem.

This repo contains focused skill/reference files that help an agent work with the Inglorious Forge packages for:

- Web applications
- Realtime applications
- 2D games
- Tooling and scaffolding

## Repository Layout

- `skills/**/SKILL.md`: Package-specific references and implementation guidance
- `LICENSE`: License for this repository

## Included Skills

- `skills/utils/SKILL.md` - Utility functions and algorithms
- `skills/store/SKILL.md` - Entity-based state management
- `skills/server/SKILL.md` - Realtime WebSocket server patterns
- `skills/react-store/SKILL.md` - React bindings for the store
- `skills/web/SKILL.md` - lit-html based web framework patterns
- `skills/charts/SKILL.md` - SVG charting primitives
- `skills/ssx/SKILL.md` - Static site generation and hydration
- `skills/engine/SKILL.md` - Functional 2D game engine
- `skills/vite-plugin-jsx/SKILL.md` - JSX transform for `@inglorious/web`
- `skills/vite-plugin-vue/SKILL.md` - Vue-like template transform for `@inglorious/web`
- `skills/create-app/SKILL.md` - App scaffolding workflows
- `skills/create-game/SKILL.md` - Game scaffolding workflows

## Usage

Use `skills/forge/SKILL.md` as the entry point. It maps user goals to the smallest relevant files in `skills/` so an agent can load only the needed context.

## Scope

This repository is documentation-first. It does not publish runtime packages; it provides agent-oriented guidance for packages published under the `@inglorious/*` namespace.

# forge-skills

Skill repository for the Inglorious Forge ecosystem.

This repo contains focused skill/reference files that help an agent work with the Inglorious Forge packages for:

- Web applications
- Realtime applications
- 2D games
- Tooling and scaffolding

## Repository Layout

- `skills/**/SKILL.md`: Package-specific references and implementation guidance
- `scripts/verify-docs.mjs`: Consistency and import checker for the skills
- `skills.sh.json`: Skill grouping metadata for skills.sh
- `LICENSE`: License for this repository

## Included Skills

- [`skills/forge/SKILL.md`](skills/forge/SKILL.md) - Entry point that routes a goal to the smallest relevant set of skills
- [`skills/utils/SKILL.md`](skills/utils/SKILL.md) - Utility functions and algorithms
- [`skills/store/SKILL.md`](skills/store/SKILL.md) - Entity-based state management
- [`skills/server/SKILL.md`](skills/server/SKILL.md) - Realtime WebSocket server patterns and client middleware
- [`skills/react-store/SKILL.md`](skills/react-store/SKILL.md) - React bindings for the store
- [`skills/web/SKILL.md`](skills/web/SKILL.md) - lit-html based web framework patterns
- [`skills/web-best-practices/SKILL.md`](skills/web-best-practices/SKILL.md) - UI type and primitive conventions for `@inglorious/web`
- [`skills/charts/SKILL.md`](skills/charts/SKILL.md) - SVG charting primitives
- [`skills/ssx/SKILL.md`](skills/ssx/SKILL.md) - Static site generation and hydration
- [`skills/engine/SKILL.md`](skills/engine/SKILL.md) - Functional 2D game engine
- [`skills/engine-best-practices/SKILL.md`](skills/engine-best-practices/SKILL.md) - Engine testing conventions
- [`skills/ui/SKILL.md`](skills/ui/SKILL.md) - Design system components and theming
- [`skills/ui-best-practices/SKILL.md`](skills/ui-best-practices/SKILL.md) - UI primitive conventions
- [`skills/vite-plugin-jsx/SKILL.md`](skills/vite-plugin-jsx/SKILL.md) - JSX transform for `@inglorious/web`
- [`skills/vite-plugin-vue/SKILL.md`](skills/vite-plugin-vue/SKILL.md) - Vue-like template transform for `@inglorious/web`
- [`skills/create-app/SKILL.md`](skills/create-app/SKILL.md) - App scaffolding workflows
- [`skills/create-game/SKILL.md`](skills/create-game/SKILL.md) - Game scaffolding workflows

## Usage

Use [`skills/forge/SKILL.md`](skills/forge/SKILL.md) as the entry point. It maps user goals to the smallest relevant files in `skills/` so an agent can load only the needed context.

## Verifying

`scripts/verify-docs.mjs` checks the skills for internal consistency, and — given a checkout of the
Inglorious Forge monorepo — verifies that every documented `@inglorious/*` import actually resolves
and exports the names the examples use. It has no dependencies and does not need an install in
either repo.

```bash
node scripts/verify-docs.mjs                        # structure only
node scripts/verify-docs.mjs --source ../forge      # + imports against real source
```

It exits non-zero on any problem, so it can gate CI. Run it after renaming a type, moving a skill,
or changing an import path in either repository — those are the changes that silently desync the
docs from the packages.

## Scope

This repository is documentation-first. It does not publish runtime packages; it provides agent-oriented guidance for packages published under the `@inglorious/*` namespace.
